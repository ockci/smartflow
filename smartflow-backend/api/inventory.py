"""
재고 관리 API (통합 버전)
- 실제 재고 CRUD
- 재고 정책 계산
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.database import get_db
from models.models import Inventory, InventoryPolicy, Forecast, User
from pydantic import BaseModel
from datetime import date, timedelta
from api.auth import get_current_user
import math

router = APIRouter()

# ============================================================
# Pydantic 스키마
# ============================================================

class InventoryCreate(BaseModel):
    product_code: str
    product_name: str
    current_stock: int
    unit: str = "개"
    location: str | None = None
    min_stock: int = 0
    max_stock: int | None = None
    unit_cost: float | None = None

class InventoryUpdate(BaseModel):
    product_name: str | None = None
    current_stock: int | None = None
    unit: str | None = None
    location: str | None = None
    min_stock: int | None = None
    max_stock: int | None = None
    unit_cost: float | None = None

class InventoryResponse(BaseModel):
    id: int
    product_code: str
    product_name: str
    current_stock: int
    unit: str
    location: str | None
    min_stock: int
    max_stock: int | None
    unit_cost: float | None
    status: str
    days_left: float | None
    week_demand: int | None
    risk: str  # 위험도
    
    class Config:
        from_attributes = True

class InventoryCalculateRequest(BaseModel):
    product_code: str
    lead_time_days: int = 7
    service_level: float = 0.95

class InventoryPolicyResponse(BaseModel):
    product_code: str
    safety_stock: int
    reorder_point: int
    recommended_order_qty: int
    lead_time_days: int
    service_level: float
    
    class Config:
        from_attributes = True

# ============================================================
# 실제 재고 CRUD API
# ============================================================

@router.get("/list", response_model=List[InventoryResponse])
def get_inventory_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """재고 목록 조회 (현재 사용자만)"""
    try:
        inventories = db.query(Inventory).filter(
            Inventory.user_id == current_user.id
        ).all()
        
        result = []
        for inv in inventories:
            # 예측 데이터 가져오기 (7일치)
            forecasts = db.query(Forecast).filter(
                Forecast.user_id == current_user.id,
                Forecast.product_code == inv.product_code,
                Forecast.forecast_date >= date.today(),
                Forecast.forecast_date < date.today() + timedelta(days=7)
            ).all()
            
            week_demand = sum(f.predicted_demand for f in forecasts) if forecasts else 0
            avg_daily_demand = week_demand / 7 if week_demand > 0 else 0
            days_left = inv.current_stock / avg_daily_demand if avg_daily_demand > 0 else 999
            
            # 상태 및 위험도 판단
            if days_left < 3:
                status = "urgent"
                risk = "높음"
            elif days_left < 7:
                status = "warning"
                risk = "중간"
            elif days_left > 30:
                status = "excess"
                risk = "매우낮음"
            else:
                status = "normal"
                risk = "낮음"
            
            result.append({
                "id": inv.id,
                "product_code": inv.product_code,
                "product_name": inv.product_name,
                "current_stock": inv.current_stock,
                "unit": inv.unit,
                "location": inv.location,
                "min_stock": inv.min_stock,
                "max_stock": inv.max_stock,
                "unit_cost": inv.unit_cost,
                "status": status,
                "days_left": round(days_left, 1) if days_left < 999 else None,
                "week_demand": week_demand,
                "risk": risk,
            })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"재고 목록 조회 실패: {str(e)}")

@router.post("/create")
def create_inventory(
    data: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """재고 등록"""
    try:
        existing = db.query(Inventory).filter(
            Inventory.user_id == current_user.id,
            Inventory.product_code == data.product_code
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="이미 등록된 제품입니다")
        
        inventory = Inventory(
            **data.dict(),
            user_id=current_user.id
        )
        
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
        
        return {
            "message": "재고가 등록되었습니다",
            "inventory": inventory
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"재고 등록 실패: {str(e)}")

@router.put("/update/{product_code}")
def update_inventory(
    product_code: str,
    data: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """재고 수정"""
    try:
        inventory = db.query(Inventory).filter(
            Inventory.user_id == current_user.id,
            Inventory.product_code == product_code
        ).first()
        
        if not inventory:
            raise HTTPException(status_code=404, detail="재고를 찾을 수 없습니다")
        
        update_data = data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(inventory, key, value)
        
        db.commit()
        db.refresh(inventory)
        
        return {
            "message": "재고가 수정되었습니다",
            "inventory": inventory
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"재고 수정 실패: {str(e)}")

@router.delete("/delete/{product_code}")
def delete_inventory(
    product_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """재고 삭제"""
    try:
        inventory = db.query(Inventory).filter(
            Inventory.user_id == current_user.id,
            Inventory.product_code == product_code
        ).first()
        
        if not inventory:
            raise HTTPException(status_code=404, detail="재고를 찾을 수 없습니다")
        
        db.delete(inventory)
        db.commit()
        
        return {"message": "재고가 삭제되었습니다"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"재고 삭제 실패: {str(e)}")

@router.get("/{product_code}")
def get_inventory_detail(
    product_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """재고 상세 조회"""
    try:
        inventory = db.query(Inventory).filter(
            Inventory.user_id == current_user.id,
            Inventory.product_code == product_code
        ).first()
        
        if not inventory:
            raise HTTPException(status_code=404, detail="재고를 찾을 수 없습니다")
        
        policy = db.query(InventoryPolicy).filter(
            InventoryPolicy.user_id == current_user.id,
            InventoryPolicy.product_code == product_code
        ).first()
        
        forecasts = db.query(Forecast).filter(
            Forecast.user_id == current_user.id,
            Forecast.product_code == product_code,
            Forecast.forecast_date >= date.today()
        ).order_by(Forecast.forecast_date).limit(7).all()
        
        return {
            "inventory": inventory,
            "policy": policy,
            "forecasts": [
                {
                    "date": f.forecast_date.isoformat(),
                    "demand": f.predicted_demand
                } for f in forecasts
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"재고 조회 실패: {str(e)}")

# ============================================================
# 재고 정책 계산 API (기존)
# ============================================================

@router.post("/calculate")
def calculate_inventory_policy(
    request: InventoryCalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """재고 정책 계산"""
    try:
        forecasts = db.query(Forecast).filter(
            Forecast.product_code == request.product_code,
            Forecast.user_id == current_user.id
        ).order_by(Forecast.forecast_date).limit(30).all()
        
        if not forecasts:
            raise HTTPException(
                status_code=400,
                detail=f"{request.product_code}의 예측 데이터가 없습니다. 먼저 예측을 실행하세요."
            )
        
        demands = [f.predicted_demand for f in forecasts]
        avg_demand = sum(demands) / len(demands)
        variance = sum((d - avg_demand) ** 2 for d in demands) / len(demands)
        std_dev = math.sqrt(variance)
        
        z_score = 1.65 if request.service_level == 0.95 else 1.96
        safety_stock = int(z_score * std_dev * math.sqrt(request.lead_time_days))
        reorder_point = int(avg_demand * request.lead_time_days) + safety_stock
        recommended_order_qty = int(avg_demand * 30)
        
        existing = db.query(InventoryPolicy).filter(
            InventoryPolicy.product_code == request.product_code,
            InventoryPolicy.user_id == current_user.id
        ).first()
        
        if existing:
            existing.safety_stock = safety_stock
            existing.reorder_point = reorder_point
            existing.recommended_order_qty = recommended_order_qty
            existing.lead_time_days = request.lead_time_days
            existing.service_level = request.service_level
        else:
            policy = InventoryPolicy(
                product_code=request.product_code,
                safety_stock=safety_stock,
                reorder_point=reorder_point,
                recommended_order_qty=recommended_order_qty,
                lead_time_days=request.lead_time_days,
                service_level=request.service_level,
                user_id=current_user.id
            )
            db.add(policy)
        
        db.commit()
        
        return {
            "message": "재고 정책이 계산되었습니다",
            "product_code": request.product_code,
            "safety_stock": safety_stock,
            "reorder_point": reorder_point,
            "recommended_order_qty": recommended_order_qty,
            "avg_daily_demand": int(avg_demand),
            "std_deviation": int(std_dev)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"재고 정책 계산 실패: {str(e)}")

@router.get("/status/{product_code}")
def get_inventory_status(
    product_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """제품별 재고 상태 조회"""
    try:
        policy = db.query(InventoryPolicy).filter(
            InventoryPolicy.product_code == product_code,
            InventoryPolicy.user_id == current_user.id
        ).first()
        
        if not policy:
            raise HTTPException(
                status_code=404,
                detail=f"{product_code}의 재고 정책이 없습니다. 먼저 계산하세요."
            )
        
        # 실제 재고 조회
        inventory = db.query(Inventory).filter(
            Inventory.product_code == product_code,
            Inventory.user_id == current_user.id
        ).first()
        
        current_stock = inventory.current_stock if inventory else policy.safety_stock + 500
        
        status = "정상"
        if current_stock < policy.safety_stock:
            status = "긴급"
        elif current_stock < policy.reorder_point:
            status = "주문필요"
        
        return {
            "product_code": product_code,
            "current_stock": current_stock,
            "safety_stock": policy.safety_stock,
            "reorder_point": policy.reorder_point,
            "recommended_order_qty": policy.recommended_order_qty,
            "status": status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"재고 상태 조회 실패: {str(e)}")

@router.get("/alerts")
def get_inventory_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """재고 알림 목록"""
    try:
        policies = db.query(InventoryPolicy).filter(
            InventoryPolicy.user_id == current_user.id
        ).all()
        
        alerts = []
        
        for policy in policies:
            # 실제 재고 조회
            inventory = db.query(Inventory).filter(
                Inventory.product_code == policy.product_code,
                Inventory.user_id == current_user.id
            ).first()
            
            current_stock = inventory.current_stock if inventory else policy.safety_stock + 500
            
            if current_stock < policy.safety_stock:
                alerts.append({
                    "product_code": policy.product_code,
                    "level": "긴급",
                    "message": f"안전재고 미만 (현재: {current_stock}, 안전: {policy.safety_stock})"
                })
            elif current_stock < policy.reorder_point:
                alerts.append({
                    "product_code": policy.product_code,
                    "level": "주의",
                    "message": f"재주문 필요 (현재: {current_stock}, 재주문점: {policy.reorder_point})"
                })
        
        return {"alerts": alerts, "total": len(alerts)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"알림 조회 실패: {str(e)}")