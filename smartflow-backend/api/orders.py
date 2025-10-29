"""
주문 관리 API (수정 버전 - user_id 필터링 추가)
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Order
from schemas import OrderCreate, Order as OrderSchema
from api.auth import get_current_user
from models import User
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
    """
    주문 템플릿 엑셀 파일 다운로드
    """
    file_path = os.path.join(TEMPLATE_DIR, "order_template.xlsx")

    if not os.path.exists(file_path):
        return Response(
            content="Template file not found",
            status_code=404
        )

    return FileResponse(
        path=file_path,
        filename="주문_템플릿.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.get("/download/template")
def download_excel_template(type: str = Query("order", enum=["order", "equipment"])):
    """
    엑셀 템플릿 다운로드
    - type=order → 주문 템플릿
    - type=equipment → 설비 템플릿
    """
    if type == "equipment":
        excel_bytes = create_equipment_template()
        filename = "설비정보_템플릿.xlsx"
    else:
        excel_bytes = create_order_template()
        filename = "주문정보_템플릿.xlsx"

    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )


@router.get("/download/template")
def download_order_template_direct():
    """주문 템플릿 다운로드"""
    import pandas as pd
    
    df = pd.DataFrame({
        '주문번호': ['ORD-001', 'ORD-002', 'ORD-003'],
        '제품코드': ['Product_c0', 'Product_c6', 'Product_c15'],
        '제품명': ['전자부품 A-100', '자동차 부품 B-200', '가전 부품 C-300'],
        '수량': [1000, 800, 1200],
        '납기일': ['2025-11-15', '2025-11-20', '2025-11-25'],
        '우선순위': [1, 2, 1],
        '긴급여부': [False, False, True],
        '비고': ['', '', '긴급 주문']
    })
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='주문정보')
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=order_template.xlsx"},
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