"""
주문 관리 API (수정 버전 - user_id 필터링 추가)
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database.database import get_db
from models.models import Order
from schemas.schemas import OrderCreate, Order as OrderSchema
from api.auth import get_current_user
from models.models import User
from fastapi import APIRouter, Response
from fastapi.responses import FileResponse
import os
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from io import BytesIO
from core.excel_parser import create_order_template, create_equipment_template
from datetime import datetime

router = APIRouter()

TEMPLATE_DIR = os.path.join(os.getcwd(), "templates")

@router.get("/list", response_model=List[OrderSchema])
def get_orders(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    주문 목록 조회 (현재 사용자의 주문만)
    """
    query = db.query(Order).filter(
        Order.user_id == current_user.id
    )
    
    if status:
        query = query.filter(Order.status == status)
    
    orders = query.order_by(Order.created_at.desc()).all()
    return orders

# orders.py에 추가할 코드
# Line 43 다음에 이 코드를 추가하세요

@router.get("/history")
def get_order_history(
    status: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    주문 이력 조회 (필터 + 통계)
    
    Parameters:
    - status: 주문 상태 필터 (pending, confirmed, delivered, cancelled)
    - start_date: 시작일 (YYYY-MM-DD)
    - end_date: 종료일 (YYYY-MM-DD)  
    - search: 검색어 (제품명, 주문번호)
    """
    from sqlalchemy import or_
    from datetime import datetime, timedelta
    
    # 기본 쿼리 (현재 사용자만)
    query = db.query(Order).filter(Order.user_id == current_user.id)
    
    # 상태 필터
    if status:
        query = query.filter(Order.status == status)
    
    # 날짜 범위 필터
    if start_date:
        query = query.filter(Order.created_at >= start_date)
    if end_date:
        # end_date는 해당일 23:59:59까지 포함
        end_datetime = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        query = query.filter(Order.created_at < end_datetime)
    
    # 검색 필터 (제품명 or 주문번호 or 제품코드)
    if search:
        query = query.filter(
            or_(
                Order.product_name.contains(search),
                Order.product_code.contains(search),
                Order.order_number.contains(search)
            )
        )
    
    # 주문 목록 조회
    orders = query.order_by(Order.created_at.desc()).all()
    
    # 통계 계산 (전체 주문 대상)
    all_orders = db.query(Order).filter(Order.user_id == current_user.id).all()
    
    # ✅ unit_price 없이 수량만으로 통계 계산
    statistics = {
        "total_quantity": sum(o.quantity for o in all_orders if o.status != 'cancelled'),
        "total_count": len(all_orders),
        "delivered_count": len([o for o in all_orders if o.status == 'delivered']),
        "confirmed_count": len([o for o in all_orders if o.status == 'confirmed']),
        "pending_count": len([o for o in all_orders if o.status == 'pending']),
        "cancelled_count": len([o for o in all_orders if o.status == 'cancelled']),
    }
    
    # 응답
    return {
        "orders": [
            {
                "id": o.id,
                "order_number": o.order_number,
                "product_code": o.product_code,
                "product_name": o.product_name,
                "quantity": o.quantity,
                "order_date": o.created_at.strftime('%Y-%m-%d') if o.created_at else None,
                "due_date": o.due_date.strftime('%Y-%m-%d') if o.due_date else None,
                "status": o.status,
                "priority": o.priority,
            }
            for o in orders
        ],
        "statistics": statistics
    }


@router.get("/{order_id}", response_model=OrderSchema)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    특정 주문 조회
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")
    return order

@router.post("/create", response_model=OrderSchema)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    주문 생성
    """
    # 같은 사용자의 같은 주문번호 중복 체크
    existing = db.query(Order).filter(
        Order.order_number == order.order_number,
        Order.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"이미 존재하는 주문번호입니다: {order.order_number}"
        )
    
    # ⭐ 변경: user_id 제외하고 서버에서 강제 주입
    db_order = Order(
        **order.dict(exclude={'user_id'}),
        user_id=current_user.id,
        status="pending",
        created_at=datetime.utcnow()
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.put("/update/{order_id}", response_model=OrderSchema)
def update_order(
    order_id: int,
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    주문 수정
    """
    db_order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not db_order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")
    
    # ⭐ 변경: user_id 수정 방지
    for key, value in order.dict(exclude={'user_id'}).items():
        setattr(db_order, key, value)
    
    db_order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_order)
    return db_order

@router.delete("/delete/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    주문 삭제
    """
    db_order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not db_order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")
    
    db.delete(db_order)
    db.commit()
    return {"message": "주문이 삭제되었습니다"}

@router.post("/urgent", response_model=OrderSchema)
def create_urgent_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    긴급 주문 생성 (우선순위 최상위)
    """
    # ⭐ 변경: user_id, is_urgent, priority 제외하고 서버에서 강제 설정
    db_order = Order(
        **order.dict(exclude={'user_id', 'is_urgent', 'priority'}),
        user_id=current_user.id,
        is_urgent=True,
        priority=1,
        status="pending",
        created_at=datetime.utcnow()
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


@router.get("/download/template")
def download_order_template():
    """주문 템플릿 다운로드"""
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    from core.excel_parser import create_order_template

    excel_bytes = create_order_template()

    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=order_template.xlsx"
        },
    )




@router.post("/upload")
async def upload_orders(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """주문 정보 엑셀 업로드"""
    from api.upload import parse_order_excel
    
    try:
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="엑셀 파일만 업로드 가능합니다")
        
        orders = await parse_order_excel(file)
        
        success_count = 0
        error_count = 0
        
        for order in orders:
            try:
                existing = db.query(Order).filter(
                    Order.order_number == order['order_number'],
                    Order.user_id == current_user.id
                ).first()
                
                if existing:
                    for key, value in order.items():
                        if key != 'user_id':  # ⭐ user_id 수정 방지
                            setattr(existing, key, value)
                    existing.updated_at = datetime.now()
                else:
                    # ⭐ user_id 제외하고 생성
                    order_data = {k: v for k, v in order.items() if k != 'user_id'}
                    db_order = Order(**order_data, user_id=current_user.id)
                    db.add(db_order)
                
                success_count += 1
            except Exception as e:
                error_count += 1
                print(f"주문 저장 실패: {e}")
        
        db.commit()
        
        return {
            "success": True,
            "message": f"주문 {success_count}개 업로드 완료",
            "data": {
                "success_count": success_count,
                "error_count": error_count
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")