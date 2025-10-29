from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Product, User
from pydantic import BaseModel
from datetime import datetime
from api.auth import get_current_user

router = APIRouter()

# ====================================
# 🧩 Pydantic 스키마
# ====================================

class ProductCreate(BaseModel):
    product_code: str
    product_name: str
    unit_price: float = None
    unit_cost: float = None
    required_tonnage: int = None
    cycle_time: int = None
    cavity_count: int = 1
    unit: str = "개"
    min_stock: int = 0


class ProductResponse(BaseModel):
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
    updated_at: Optional[datetime] = None  # ✅ 수정됨

    class Config:
        from_attributes = True


# ====================================
# 📋 CRUD API
# ====================================

@router.get("/list", response_model=List[ProductResponse])
def get_product_list(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    products = db.query(Product).filter(Product.user_id == current_user.id).all()
    return products


@router.post("/create", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Product).filter(
        Product.product_code == product.product_code,
        Product.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 제품 코드입니다.")

    db_product = Product(**product.dict(), user_id=current_user.id, created_at=datetime.utcnow())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.delete("/{product_code}")
def delete_product(product_code: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_product = db.query(Product).filter(
        Product.product_code == product_code,
        Product.user_id == current_user.id
    ).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
    db.delete(db_product)
    db.commit()
    return {"message": "제품이 삭제되었습니다"}

@router.put("/update/{product_code}", response_model=ProductResponse)
def update_product(
    product_code: str, 
    product: ProductCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """제품 수정"""
    db_product = db.query(Product).filter(
        Product.product_code == product_code,
        Product.user_id == current_user.id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
    
    # 제품 코드가 변경되는 경우 중복 체크
    if product.product_code != product_code:
        existing = db.query(Product).filter(
            Product.product_code == product.product_code,
            Product.user_id == current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="이미 존재하는 제품 코드입니다.")
    
    # 데이터 업데이트
    for key, value in product.dict().items():
        setattr(db_product, key, value)
    
    db_product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_product)
    return db_product

# ====================================
# 🧾 엑셀 업로드 (한글 컬럼명 인식)
# ====================================
@router.post("/upload")
async def upload_products(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    import pandas as pd
    from io import BytesIO

    contents = await file.read()
    df = pd.read_excel(BytesIO(contents))

    header_map = {
        '제품코드': 'product_code',
        '제품명': 'product_name',
        '판매가': 'unit_price',  # ✅ 추가
        '판매단가': 'unit_price',
        '원가': 'unit_cost',  # ✅ 추가
        '제조원가': 'unit_cost',
        '필요톤수': 'required_tonnage',
        '사이클타임': 'cycle_time',  # ✅ 추가
        '사이클타임(초)': 'cycle_time',
        '캐비티': 'cavity_count',  # ✅ 추가
        '캐비티수': 'cavity_count',
        '최소재고': 'min_stock',
        '최소재고관리': 'min_stock',  # ✅ 추가
        '단위': 'unit',
    }
    df.columns = [header_map.get(c.strip(), c.strip()) for c in df.columns]

    success_count = 0
    for _, row in df.iterrows():
        product_code = str(row['product_code'])
        existing = db.query(Product).filter(Product.product_code == product_code, Product.user_id == current_user.id).first()

        product_data = {
            'product_code': product_code,
            'product_name': str(row['product_name']),
            'unit_price': float(row.get('unit_price', 0)),
            'unit_cost': float(row.get('unit_cost', 0)),
            'required_tonnage': int(row.get('required_tonnage', 0)),
            'cycle_time': int(row.get('cycle_time', 0)),
            'cavity_count': int(row.get('cavity_count', 1)),
            'unit': str(row.get('unit', "개")),
            'min_stock': int(row.get('min_stock', 0)),
        }

        if existing:
            for k, v in product_data.items():
                setattr(existing, k, v)
            existing.updated_at = datetime.utcnow()
        else:
            db.add(Product(**product_data, user_id=current_user.id))
        success_count += 1

    db.commit()
    return {"success": True, "message": f"제품 {success_count}개 업로드 완료"}



@router.put("/update/{product_code}", response_model=ProductResponse)
def update_product(
    product_code: str, 
    product: ProductCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    db_product = db.query(Product).filter(
        Product.product_code == product_code,
        Product.user_id == current_user.id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
    
    for key, value in product.dict().items():
        setattr(db_product, key, value)
    
    db_product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_product)
    return db_product

# products.py에 추가
@router.put("/update/{product_code}", response_model=ProductResponse)
def update_product(
    product_code: str, 
    product: ProductCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    db_product = db.query(Product).filter(
        Product.product_code == product_code,
        Product.user_id == current_user.id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
    
    for key, value in product.dict().items():
        setattr(db_product, key, value)
    
    db_product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_product)
    return db_product


