"""
제품 정보 관리 API
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Product, User
from pydantic import BaseModel
from datetime import datetime
from api.auth import get_current_user

router = APIRouter()

# ====================================
# Pydantic 스키마
# ====================================

class ProductCreate(BaseModel):
    """제품 생성/수정 스키마"""
    product_code: str
    product_name: str
    unit_price: float = None
    unit_cost: float = None
    required_tonnage: int = None
    cycle_time: int = None  # 초
    cavity_count: int = 1
    unit: str = "개"
    min_stock: int = 0

class ProductResponse(BaseModel):
    """제품 응답 스키마"""
    id: int
    user_id: int
    product_code: str
    product_name: str
    unit_price: float = None
    unit_cost: float = None
    required_tonnage: int = None
    cycle_time: int = None
    cavity_count: int
    unit: str
    min_stock: int
    created_at: datetime
    updated_at: datetime = None

    class Config:
        from_attributes = True

# ====================================
# API 엔드포인트
# ====================================

@router.get("/list", response_model=List[ProductResponse])
def get_product_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    제품 목록 조회 (현재 사용자의 제품만)
    """
    products = db.query(Product).filter(
        Product.user_id == current_user.id
    ).all()
    return products

@router.get("/{product_code}", response_model=ProductResponse)
def get_product(
    product_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    특정 제품 조회
    """
    product = db.query(Product).filter(
        Product.product_code == product_code,
        Product.user_id == current_user.id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
    return product

@router.post("/create", response_model=ProductResponse)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    제품 생성
    """
    # 같은 사용자의 같은 product_code 중복 체크
    existing = db.query(Product).filter(
        Product.product_code == product.product_code,
        Product.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"이미 존재하는 제품 코드입니다: {product.product_code}"
        )
    
    # 제품 생성
    db_product = Product(
        **product.dict(),
        user_id=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.put("/update/{product_code}", response_model=ProductResponse)
def update_product(
    product_code: str,
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    제품 수정
    """
    db_product = db.query(Product).filter(
        Product.product_code == product_code,
        Product.user_id == current_user.id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
    
    # 수정
    for key, value in product.dict().items():
        setattr(db_product, key, value)
    
    db_product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/delete/{product_code}")
def delete_product(
    product_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    제품 삭제
    """
    db_product = db.query(Product).filter(
        Product.product_code == product_code,
        Product.user_id == current_user.id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
    
    db.delete(db_product)
    db.commit()
    return {"message": "제품이 삭제되었습니다"}

@router.post("/upload")
async def upload_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    제품 정보 엑셀 업로드
    
    엑셀 컬럼:
    - product_code: 제품코드
    - product_name: 제품명
    - unit_price: 판매단가
    - unit_cost: 제조원가
    - required_tonnage: 필요톤수
    - cycle_time: 사이클타임(초)
    - cavity_count: 캐비티수
    - min_stock: 최소재고
    """
    import pandas as pd
    from io import BytesIO
    
    try:
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="엑셀 파일만 업로드 가능합니다")
        
        # 엑셀 읽기
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # 필수 컬럼 체크
        required_cols = ['product_code', 'product_name']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(
                status_code=400,
                detail=f"필수 컬럼이 없습니다: {', '.join(missing_cols)}"
            )
        
        success_count = 0
        error_count = 0
        
        for _, row in df.iterrows():
            try:
                product_code = str(row['product_code'])
                
                # 기존 제품 확인
                existing = db.query(Product).filter(
                    Product.product_code == product_code,
                    Product.user_id == current_user.id
                ).first()
                
                product_data = {
                    'product_code': product_code,
                    'product_name': str(row['product_name']),
                    'unit_price': float(row['unit_price']) if pd.notna(row.get('unit_price')) else None,
                    'unit_cost': float(row['unit_cost']) if pd.notna(row.get('unit_cost')) else None,
                    'required_tonnage': int(row['required_tonnage']) if pd.notna(row.get('required_tonnage')) else None,
                    'cycle_time': int(row['cycle_time']) if pd.notna(row.get('cycle_time')) else None,
                    'cavity_count': int(row['cavity_count']) if pd.notna(row.get('cavity_count')) else 1,
                    'min_stock': int(row['min_stock']) if pd.notna(row.get('min_stock')) else 0,
                }
                
                if existing:
                    # 업데이트
                    for key, value in product_data.items():
                        if value is not None:
                            setattr(existing, key, value)
                    existing.updated_at = datetime.now()
                else:
                    # 신규 생성
                    db_product = Product(**product_data, user_id=current_user.id)
                    db.add(db_product)
                
                success_count += 1
            except Exception as e:
                error_count += 1
                print(f"제품 저장 실패: {e}")
        
        db.commit()
        
        return {
            "success": True,
            "message": f"제품 {success_count}개 업로드 완료",
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
