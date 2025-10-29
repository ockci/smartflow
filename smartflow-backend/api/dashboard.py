from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Order, Schedule, Equipment, User
from datetime import datetime, date
from sqlalchemy import func
from api.auth import get_current_user

router = APIRouter()

# 대시보드 요약
@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ⭐ 인증 추가
):
    """대시보드 요약 정보 (현재 사용자만)"""
    try:
        # ⭐ 모든 쿼리에 user_id 필터링
        # 1. 전체 주문 통계
        total_orders = db.query(Order).filter(
            Order.user_id == current_user.id
        ).count()
        
        pending_orders = db.query(Order).filter(
            Order.status == "pending",
            Order.user_id == current_user.id
        ).count()
        
        completed_orders = db.query(Order).filter(
            Order.status == "completed",
            Order.user_id == current_user.id
        ).count()
        
        # 2. 오늘 스케줄
        today = date.today()
        today_schedules = db.query(Schedule).filter(
            func.date(Schedule.start_time) == today,
            Schedule.user_id == current_user.id
        ).count()
        
        # 3. 설비 가동률
        active_equipment = db.query(Equipment).filter(
            Equipment.status == "active",
            Equipment.user_id == current_user.id
        ).count()
        
        # 4. 납기 임박 주문
        urgent_orders = db.query(Order).filter(
            Order.status == "pending",
            Order.due_date <= date.today(),
            Order.user_id == current_user.id
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
def get_production_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ⭐ 인증 추가
):
    """오늘 생산 현황 (현재 사용자만)"""
    try:
        today = date.today()
        
        # ⭐ user_id 필터링
        # 오늘 스케줄
        schedules = db.query(Schedule).filter(
            func.date(Schedule.start_time) == today,
            Schedule.user_id == current_user.id
        ).all()
        
        production_status = []
        for schedule in schedules:
            # ⭐ 주문도 user_id 확인
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
    current_user: User = Depends(get_current_user)  # ⭐ 인증 추가
):
    """대시보드 알림 (현재 사용자만)"""
    try:
        alerts = []
        
        # ⭐ user_id 필터링
        # 1. 납기 임박 주문
        urgent_orders = db.query(Order).filter(
            Order.status == "pending",
            Order.due_date <= date.today(),
            Order.user_id == current_user.id
        ).all()
        
        for order in urgent_orders:
            days_left = (order.due_date - date.today()).days
            alerts.append({
                "type": "납기임박",
                "severity": "urgent" if days_left <= 0 else "warning",
                "message": f"주문 {order.order_number} 납기 {abs(days_left)}일 {'초과' if days_left < 0 else '남음'}",
                "order_number": order.order_number
            })
        
        return {"alerts": alerts, "total": len(alerts)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"알림 조회 실패: {str(e)}")