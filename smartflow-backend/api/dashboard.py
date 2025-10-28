from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db  # ✅ DB 세션만 여기서
from models import Order, Schedule, Equipment  # ✅ 모델은 models.py에서 불러오기
from datetime import datetime, date
from sqlalchemy import func

router = APIRouter()

# 대시보드 요약
@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """대시보드 요약 정보"""
    try:
        # 1. 전체 주문 통계
        total_orders = db.query(Order).count()
        pending_orders = db.query(Order).filter(Order.status == "pending").count()
        completed_orders = db.query(Order).filter(Order.status == "completed").count()
        
        # 2. 오늘 스케줄
        today = date.today()
        today_schedules = db.query(Schedule).filter(
            func.date(Schedule.start_time) == today
        ).count()
        
        # 3. 설비 가동률
        active_equipment = db.query(Equipment).filter(Equipment.status == "active").count()
        
        # 4. 납기 임박 주문
        urgent_orders = db.query(Order).filter(
            Order.status == "pending",
            Order.due_date <= date.today()
        ).count()
        
        return {
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "completed_orders": completed_orders,
            "today_schedules": today_schedules,
            "active_equipment": active_equipment,
            "urgent_orders": urgent_orders,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"요약 정보 조회 실패: {str(e)}")

# 오늘 생산 현황
@router.get("/production")
def get_production_status(db: Session = Depends(get_db)):
    """오늘 생산 현황"""
    try:
        today = date.today()
        
        # 오늘 스케줄
        schedules = db.query(Schedule).filter(
            func.date(Schedule.start_time) == today
        ).all()
        
        production_status = []
        for schedule in schedules:
            order = db.query(Order).filter(Order.id == schedule.order_id).first()
            
            # 진행률 계산 (더미)
            now = datetime.now()
            if now < schedule.start_time:
                progress = 0
            elif now > schedule.end_time:
                progress = 100
            else:
                elapsed = (now - schedule.start_time).total_seconds()
                total = (schedule.end_time - schedule.start_time).total_seconds()
                progress = int((elapsed / total) * 100)
            
            production_status.append({
                "machine_id": schedule.machine_id,
                "order_number": order.order_number if order else "N/A",
                "product_code": order.product_code if order else "N/A",
                "progress": progress,
                "status": "진행중" if 0 < progress < 100 else "대기" if progress == 0 else "완료"
            })
        
        return {"production": production_status, "total": len(production_status)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"생산 현황 조회 실패: {str(e)}")

# 긴급 알림
@router.get("/alerts")
def get_dashboard_alerts(db: Session = Depends(get_db)):
    """대시보드 알림"""
    try:
        alerts = []
        
        # 1. 납기 임박 주문
        urgent_orders = db.query(Order).filter(
            Order.status == "pending",
            Order.due_date <= date.today()
        ).all()
        
        for order in urgent_orders:
            days_left = (order.due_date - date.today()).days
            alerts.append({
                "type": "납기임박",
                "level": "긴급" if days_left <= 0 else "주의",
                "message": f"주문 {order.order_number} 납기 {abs(days_left)}일 {'초과' if days_left < 0 else '남음'}",
                "order_number": order.order_number
            })
        
        # 2. 재고 알림 (더미)
        alerts.append({
            "type": "재고부족",
            "level": "주의",
            "message": "Product_c0 재고 재주문 필요",
            "product_code": "Product_c0"
        })
        
        return {"alerts": alerts, "total": len(alerts)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"알림 조회 실패: {str(e)}")