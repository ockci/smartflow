from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
from database import get_db  # ✅ DB 세션만 database에서
from models import InventoryPolicy, Forecast  # ✅ 모델은 models.py에서 불러오기
from pydantic import BaseModel
import math

router = APIRouter()

# Pydantic 스키마
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

# 재고 정책 계산
@router.post("/calculate")
def calculate_inventory_policy(
    request: InventoryCalculateRequest,
    db: Session = Depends(get_db)
):
    """재고 정책 계산"""
    try:
        # 1. 예측 데이터 가져오기
        forecasts = db.query(Forecast).filter(
            Forecast.product_code == request.product_code
        ).order_by(Forecast.forecast_date).limit(30).all()
        
        if not forecasts:
            raise HTTPException(
                status_code=400,
                detail=f"{request.product_code}의 예측 데이터가 없습니다. 먼저 예측을 실행하세요."
            )
        
        # 2. 평균 수요 및 표준편차 계산
        demands = [f.predicted_demand for f in forecasts]
        avg_demand = sum(demands) / len(demands)
        variance = sum((d - avg_demand) ** 2 for d in demands) / len(demands)
        std_dev = math.sqrt(variance)
        
        # 3. 안전재고 계산 (Z-score 방식)
        z_score = 1.65 if request.service_level == 0.95 else 1.96  # 95% or 97.5%
        safety_stock = int(z_score * std_dev * math.sqrt(request.lead_time_days))
        
        # 4. 재주문점 계산
        reorder_point = int(avg_demand * request.lead_time_days) + safety_stock
        
        # 5. 경제적 주문량 (간단 버전)
        recommended_order_qty = int(avg_demand * 30)  # 한 달치
        
        # 6. 데이터베이스에 저장
        existing = db.query(InventoryPolicy).filter(
            InventoryPolicy.product_code == request.product_code
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
                service_level=request.service_level
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

# 제품별 재고 상태
@router.get("/status/{product_code}")
def get_inventory_status(product_code: str, db: Session = Depends(get_db)):
    """제품별 재고 상태 조회"""
    try:
        policy = db.query(InventoryPolicy).filter(
            InventoryPolicy.product_code == product_code
        ).first()
        
        if not policy:
            raise HTTPException(
                status_code=404,
                detail=f"{product_code}의 재고 정책이 없습니다. 먼저 계산하세요."
            )
        
        # 현재 재고 (더미 - 실제로는 별도 Inventory 테이블 필요)
        current_stock = policy.safety_stock + 500
        
        # 상태 판단
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

# 재고 알림
@router.get("/alerts")
def get_inventory_alerts(db: Session = Depends(get_db)):
    """재고 알림 목록"""
    try:
        policies = db.query(InventoryPolicy).all()
        alerts = []
        
        for policy in policies:
            # 현재 재고 (더미)
            current_stock = policy.safety_stock + 500
            
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