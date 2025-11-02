"""
발주 관리 API
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date
import pandas as pd
from io import BytesIO

from database.database import get_db
from models.models import PurchaseOrder, User
from api.auth import get_current_user

router = APIRouter(prefix="/api/purchase-orders", tags=["Purchase Orders"])


# ============================================================================
# 발주 CRUD
# ============================================================================

@router.get("/list")
def list_purchase_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """발주 목록 조회"""
    purchases = db.query(PurchaseOrder).filter(
        PurchaseOrder.user_id == current_user.id
    ).order_by(PurchaseOrder.created_at.desc()).all()
    
    return purchases


@router.post("/create")
def create_purchase_order(
    purchase_number: str,
    product_code: str,
    product_name: str,
    quantity: int,
    order_date: str,
    supplier: str = None,
    unit_price: float = None,
    expected_date: str = None,
    priority: int = 3,
    is_ai_recommended: bool = False,
    notes: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """발주 등록"""
    
    # 중복 체크
    existing = db.query(PurchaseOrder).filter(
        PurchaseOrder.purchase_number == purchase_number,
        PurchaseOrder.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 발주번호입니다")
    
    # 총액 계산
    total_price = None
    if unit_price:
        total_price = unit_price * quantity
    
    # 발주 생성
    new_purchase = PurchaseOrder(
        user_id=current_user.id,
        purchase_number=purchase_number,
        product_code=product_code,
        product_name=product_name,
        quantity=quantity,
        supplier=supplier,
        unit_price=unit_price,
        total_price=total_price,
        order_date=datetime.strptime(order_date, "%Y-%m-%d").date(),
        expected_date=datetime.strptime(expected_date, "%Y-%m-%d").date() if expected_date else None,
        priority=priority,
        is_ai_recommended=is_ai_recommended,
        notes=notes,
        status="pending"
    )
    
    db.add(new_purchase)
    db.commit()
    db.refresh(new_purchase)
    
    print(f"✅ 발주 등록: {purchase_number}")
    
    return {
        "success": True,
        "message": "발주가 등록되었습니다",
        "data": new_purchase
    }


@router.put("/update-status/{purchase_id}")
def update_purchase_status(
    purchase_id: int,
    status: str,  # pending, ordered, received
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """발주 상태 업데이트"""
    
    valid_statuses = ["pending", "ordered", "received"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="올바르지 않은 상태입니다")
    
    purchase = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == purchase_id,
        PurchaseOrder.user_id == current_user.id
    ).first()
    
    if not purchase:
        raise HTTPException(status_code=404, detail="발주를 찾을 수 없습니다")
    
    purchase.status = status
    purchase.updated_at = datetime.now()
    
    db.commit()
    
    return {
        "success": True,
        "message": f"발주 상태가 '{status}'로 변경되었습니다",
        "data": purchase
    }


@router.delete("/delete/{purchase_id}")
def delete_purchase_order(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """발주 삭제"""
    
    purchase = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == purchase_id,
        PurchaseOrder.user_id == current_user.id
    ).first()
    
    if not purchase:
        raise HTTPException(status_code=404, detail="발주를 찾을 수 없습니다")
    
    db.delete(purchase)
    db.commit()
    
    return {
        "success": True,
        "message": "발주가 삭제되었습니다"
    }


# ============================================================================
# AI 추천 발주
# ============================================================================

@router.get("/ai-recommendations")
def get_ai_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    AI 추천 발주 목록
    
    ForecastPage에서 예측한 결과를 바탕으로
    재고 부족이 예상되는 제품의 발주를 추천
    """
    from models.models import Product, Inventory
    
    recommendations = []
    
    # 모든 제품 조회
    products = db.query(Product).filter(
        Product.user_id == current_user.id
    ).all()
    
    for product in products:
        # 재고 조회
        inventory = db.query(Inventory).filter(
            Inventory.product_code == product.product_code,
            Inventory.user_id == current_user.id
        ).first()
        
        if inventory:
            current_stock = inventory.current_stock or 0
            safety_stock = inventory.safety_stock or 100
            
            # 안전재고 이하면 추천
            if current_stock < safety_stock:
                shortage = safety_stock - current_stock
                recommended_qty = shortage * 2  # 2배 발주 추천
                
                recommendations.append({
                    "product_code": product.product_code,
                    "product_name": product.product_name,
                    "current_stock": current_stock,
                    "safety_stock": safety_stock,
                    "shortage": shortage,
                    "recommended_quantity": recommended_qty,
                    "priority": 1 if current_stock < safety_stock * 0.5 else 2,
                    "reason": f"현재 재고 {current_stock}개, 안전재고 {safety_stock}개 미달"
                })
    
    return {
        "success": True,
        "count": len(recommendations),
        "recommendations": recommendations
    }


# ============================================================================
# 엑셀 업로드/다운로드
# ============================================================================

@router.post("/upload")
async def upload_purchase_orders(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """발주 엑셀 업로드"""
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="엑셀 파일만 업로드 가능합니다")
    
    try:
        # 엑셀 읽기
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # 필수 컬럼 체크
        required_columns = ['발주번호', '제품코드', '제품명', '수량', '발주일']
        for col in required_columns:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"필수 컬럼 '{col}'이 없습니다")
        
        success_count = 0
        error_count = 0
        
        for _, row in df.iterrows():
            try:
                # 중복 체크
                existing = db.query(PurchaseOrder).filter(
                    PurchaseOrder.purchase_number == str(row['발주번호']),
                    PurchaseOrder.user_id == current_user.id
                ).first()
                
                if existing:
                    error_count += 1
                    continue
                
                # 발주 생성
                new_purchase = PurchaseOrder(
                    user_id=current_user.id,
                    purchase_number=str(row['발주번호']),
                    product_code=str(row['제품코드']),
                    product_name=str(row['제품명']),
                    quantity=int(row['수량']),
                    supplier=str(row.get('공급업체', '')),
                    unit_price=float(row.get('단가', 0)) if pd.notna(row.get('단가')) else None,
                    order_date=pd.to_datetime(row['발주일']).date(),
                    expected_date=pd.to_datetime(row['입고예정일']).date() if pd.notna(row.get('입고예정일')) else None,
                    priority=int(row.get('우선순위', 3)),
                    notes=str(row.get('비고', '')),
                    status="pending"
                )
                
                if new_purchase.unit_price:
                    new_purchase.total_price = new_purchase.unit_price * new_purchase.quantity
                
                db.add(new_purchase)
                success_count += 1
                
            except Exception as e:
                error_count += 1
                print(f"발주 저장 실패: {e}")
        
        db.commit()
        
        return {
            "success": True,
            "message": f"발주 {success_count}개 업로드 완료",
            "data": {
                "success_count": success_count,
                "error_count": error_count
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")


@router.get("/download/template")
def download_purchase_template():
    """발주 템플릿 다운로드"""
    from fastapi.responses import StreamingResponse
    
    # 템플릿 데이터
    template_data = {
        '발주번호': ['PO-2025001', 'PO-2025002'],
        '제품코드': ['PROD001', 'PROD002'],
        '제품명': ['제품A', '제품B'],
        '수량': [1000, 500],
        '공급업체': ['공급업체A', '공급업체B'],
        '단가': [1000, 2000],
        '발주일': ['2025-01-01', '2025-01-02'],
        '입고예정일': ['2025-01-15', '2025-01-20'],
        '우선순위': [1, 2],
        '비고': ['긴급 발주', '정기 발주']
    }
    
    df = pd.DataFrame(template_data)
    
    # 엑셀로 변환
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='발주 템플릿')
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=purchase_order_template.xlsx"}
    )