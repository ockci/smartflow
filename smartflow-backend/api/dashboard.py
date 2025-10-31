from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Order, Schedule, Equipment, User, Product
from datetime import datetime, date, timedelta
from sqlalchemy import func
from api.auth import get_current_user
import httpx

router = APIRouter()

# 대시보드 요약 (새 버전 - 옵션 2)
@router.get("/summary")
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """대시보드 요약 정보 - 생산 중심 + AI 예측"""
    try:
        today = date.today()
        three_days_later = today + timedelta(days=3)
        
        # 1. 오늘 발주 필요 (AI 예측 T+1) + 내일 예상 수요 (T+2)
        today_order_needed = 0
        tomorrow_demand = 0
        
        try:
            # AI 서버에서 전체 제품 예측 가져오기
            async with httpx.AsyncClient(timeout=10.0) as client:
                products = db.query(Product).filter(Product.user_id == current_user.id).all()
                
                for product in products:
                    try:
                        response = await client.get(
                            f"http://localhost:8001/predict/{product.product_code}"
                        )
                        if response.status_code == 200:
                            forecast_data = response.json()
                            forecasts = forecast_data.get('forecasts', [])
                            
                            # T+1 (오늘 발주 필요)
                            if len(forecasts) > 0:
                                t1_prediction = forecasts[0].get('prediction', {})
                                if t1_prediction.get('will_order'):
                                    today_order_needed += t1_prediction.get('quantity', 0) or 0
                            
                            # T+2 (내일 예상 수요)
                            if len(forecasts) > 1:
                                t2_prediction = forecasts[1].get('prediction', {})
                                if t2_prediction.get('will_order'):
                                    tomorrow_demand += t2_prediction.get('quantity', 0) or 0
                    except:
                        continue
        except Exception as e:
            print(f"AI 예측 조회 실패: {e}")
            # AI 실패 시 간단한 규칙 기반 (최근 7일 평균)
            recent_orders = db.query(func.sum(Order.quantity)).filter(
                Order.user_id == current_user.id,
                Order.created_at >= datetime.now() - timedelta(days=7)
            ).scalar() or 0
            today_order_needed = int(recent_orders / 7)  # 일평균
            tomorrow_demand = int(recent_orders / 7)
        
        # 2. 오늘 생산 예정 (스케줄 기반)
        today_schedules = db.query(Schedule).filter(
            func.date(Schedule.start_time) == today,
            Schedule.user_id == current_user.id
        ).all()
        
        today_production = 0
        for schedule in today_schedules:
            order = db.query(Order).filter(
                Order.id == schedule.order_id,
                Order.user_id == current_user.id
            ).first()
            if order:
                today_production += order.quantity
        
        # 3. 긴급 주문
        urgent_orders = db.query(Order).filter(
            Order.is_urgent == True,
            Order.status == "pending",
            Order.user_id == current_user.id
        ).count()
        
        # 4. 납기 임박 (3일 이내)
        due_soon = db.query(Order).filter(
            Order.status == "pending",
            Order.due_date <= three_days_later,
            Order.due_date >= today,
            Order.user_id == current_user.id
        ).count()
        
        return {
            "today_order_needed": int(today_order_needed),
            "tomorrow_demand": int(tomorrow_demand),
            "today_production": int(today_production),
            "urgent_orders": urgent_orders,
            "due_soon": due_soon,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"요약 정보 조회 실패: {str(e)}")

# 오늘 생산 현황
@router.get("/production")
def get_production_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """오늘 생산 현황 (현재 사용자만)"""
    try:
        today = date.today()
        
        # 오늘 스케줄
        schedules = db.query(Schedule).filter(
            func.date(Schedule.start_time) == today,
            Schedule.user_id == current_user.id
        ).all()
        
        production_status = []
        for schedule in schedules:
            order = db.query(Order).filter(
                Order.id == schedule.order_id,
                Order.user_id == current_user.id
            ).first()
            
            # 진행률 계산
            now = datetime.now()
            if now < schedule.start_time:
                progress = 0
                status_text = "대기"
            elif now > schedule.end_time:
                progress = 100
                status_text = "완료"
            else:
                elapsed = (now - schedule.start_time).total_seconds()
                total = (schedule.end_time - schedule.start_time).total_seconds()
                progress = int((elapsed / total) * 100)
                status_text = "진행중"
            
            production_status.append({
                "machine_id": schedule.machine_id,
                "order_number": order.order_number if order else "N/A",
                "product_code": order.product_code if order else "N/A",
                "progress": progress,
                "estimated_completion": schedule.end_time.strftime("%H:%M"),
                "status": status_text
            })
        
        return {"production": production_status, "total": len(production_status)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"생산 현황 조회 실패: {str(e)}")

# 긴급 알림
@router.get("/alerts")
def get_dashboard_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """대시보드 알림 (현재 사용자만)"""
    try:
        alerts = []
        
        # 1. 납기 임박 주문 (3일 이내)
        three_days_later = date.today() + timedelta(days=3)
        urgent_orders = db.query(Order).filter(
            Order.status == "pending",
            Order.due_date <= three_days_later,
            Order.due_date >= date.today(),
            Order.user_id == current_user.id
        ).all()
        
        for order in urgent_orders:
            days_left = (order.due_date - date.today()).days
            alerts.append({
                "type": "납기임박",
                "severity": "urgent" if days_left <= 1 else "warning",
                "message": f"주문 {order.order_number} 납기 {days_left}일 남음",
                "order_number": order.order_number
            })
        
        return {"alerts": alerts, "total": len(alerts)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"알림 조회 실패: {str(e)}")