"""
생산 스케줄링 API (개선 버전)
core/scheduler.py의 ProductionScheduler 사용
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func  # ← 이 줄 추가!
from typing import List, Dict
from datetime import datetime, timedelta, time as datetime_time
from pydantic import BaseModel

from database.database import get_db
from models.models import Schedule, Order, Equipment, Product, User
from api.auth import get_current_user
from core.scheduler import ProductionScheduler

router = APIRouter()

class ScheduleRequest(BaseModel):
    days: int = 1
    order_ids: List[int] | None = None

@router.post("/generate")
def generate_schedule(
    request: ScheduleRequest = ScheduleRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    생산 스케줄 생성 (ProductionScheduler 사용)
    
    - 톤수 매칭
    - 제품별 사이클 타임 기반 계산
    - shift 시간 고려
    - 납기 준수율 최대화
    """
    try:
        print("🔍 1. 스케줄 생성 시작")
        
        # 0. 기존 스케줄 삭제 (중복 방지)
        existing_schedules = db.query(Schedule).filter(
            Schedule.user_id == current_user.id
        ).all()
        
        if existing_schedules:
            print(f"🗑️  기존 스케줄 {len(existing_schedules)}개 삭제")
            for schedule in existing_schedules:
                db.delete(schedule)
            
            # 주문 상태 초기화
            db.query(Order).filter(
                Order.user_id == current_user.id,
                Order.status == "scheduled"
            ).update({"status": "pending"})
            
            db.commit()
            print("✅ 기존 스케줄 삭제 완료")
        
        # 1. 활성 설비 조회
        equipment_list = db.query(Equipment).filter(
            Equipment.status == "active",
            Equipment.user_id == current_user.id
        ).all()
        
        if not equipment_list:
            raise HTTPException(status_code=400, detail="활성 설비가 없습니다")
        
        print(f"✅ 2. 설비 {len(equipment_list)}개 조회")
        
        # 2. pending/scheduled 주문 조회 (하루 최대 20개로 제한)
        orders = db.query(Order).filter(
            Order.status.in_(["pending", "scheduled"]),
            Order.user_id == current_user.id
        ).order_by(
            Order.is_urgent.desc(),  # 긴급 주문 먼저
            Order.due_date.asc(),     # 납기일 빠른 순
            Order.priority.asc()      # 우선순위 낮은 순
        ).limit(20).all()  # 하루 최대 20개만 스케줄링
        
        if not orders:
            raise HTTPException(status_code=400, detail="스케줄링할 주문이 없습니다")
        
        print(f"✅ 3. 주문 {len(orders)}개 조회")
        
        # 3. 제품 정보 조회 (톤수, 사이클타임 등)
        products = db.query(Product).filter(
            Product.user_id == current_user.id
        ).all()
        
        print(f"✅ 4. 제품 {len(products)}개 조회")
        
        # 4. 데이터를 딕셔너리로 변환
        equipment_dicts = [
            {
                'machine_id': eq.machine_id,
                'machine_name': eq.machine_name,
                'tonnage': eq.tonnage,
                'capacity_per_hour': eq.capacity_per_hour,
                'shift_start': eq.shift_start,
                'shift_end': eq.shift_end,
                'status': eq.status,
            }
            for eq in equipment_list
        ]
        
        order_dicts = [
            {
                'id': o.id,
                'order_number': o.order_number,
                'product_code': o.product_code,
                'quantity': o.quantity,
                'due_date': o.due_date.isoformat() if o.due_date else '9999-12-31',
                'priority': o.priority,
                'is_urgent': o.is_urgent
            }
            for o in orders
        ]
        
        product_dicts = [
            {
                'product_code': p.product_code,
                'product_name': p.product_name,
                'required_tonnage': p.required_tonnage,
                'cycle_time': p.cycle_time,
                'cavity_count': p.cavity_count
            }
            for p in products
        ]
        
        # 5. ProductionScheduler로 스케줄 생성 ⭐
        print("⏳ 5. 스케줄링 시작...")
        scheduler = ProductionScheduler(
            equipment_list=equipment_dicts,
            orders=order_dicts,
            products=product_dicts
        )
        
        result = scheduler.generate_schedule()
        
        print(f"✅ 6. 스케줄 {len(result['schedules'])}개 생성 완료")
        
        # 6. DB 저장
        schedule_id = result['schedule_id']
        
        # order_number → order_id 매핑 생성
        order_map = {o.order_number: o.id for o in orders}
        
        for item in result['schedules']:
            # order_number로 order_id 찾기
            order_number = item['order_number']
            order_id = order_map.get(order_number)
            
            if not order_id:
                print(f"⚠️  주문번호 {order_number}를 찾을 수 없어 스킵합니다")
                continue
            
            db_schedule = Schedule(
                user_id=current_user.id,
                schedule_id=schedule_id,
                order_id=order_id,
                machine_id=item['machine_id'],
                start_time=datetime.fromisoformat(item['start_time']),
                end_time=datetime.fromisoformat(item['end_time']),
                duration_minutes=item['duration_minutes'],
                is_on_time=item['is_on_time']
            )
            db.add(db_schedule)
            
            # 주문 상태 업데이트
            order = db.query(Order).filter(Order.id == order_id).first()
            if order:
                order.status = "scheduled"
        
        db.commit()
        print("✅ 7. DB 저장 완료")
        
        # 7. 응답 데이터 포맷팅 (order_id 추가)
        formatted_schedules = []
        for item in result['schedules'][:50]:  # 최대 50개만
            order_number = item['order_number']
            order_id = order_map.get(order_number, 0)
            
            formatted_schedules.append({
                **item,
                'order_id': order_id
            })
        
        return {
            "success": True,
            "message": f"{len(result['schedules'])}개 주문이 스케줄링되었습니다",
            "schedule_id": schedule_id,
            "metrics": result['metrics'],
            "schedule": formatted_schedules
        }
        
    except Exception as e:
        db.rollback()
        import traceback
        print(f"❌ 에러 발생:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"스케줄 생성 실패: {str(e)}")


@router.get("/list")
def list_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """스케줄 목록 조회"""
    schedules = db.query(Schedule).filter(
        Schedule.user_id == current_user.id
    ).order_by(Schedule.start_time).all()
    
    if not schedules:
        return {
            "schedule": [],
            "metrics": {
                "on_time_rate": 0,
                "utilization": 0,
                "total_orders": 0,
                "on_time_orders": 0
            },
            "total": 0
        }
    
    # metrics 계산
    on_time_count = sum(1 for s in schedules if s.is_on_time)
    total_count = len(schedules)
    
    metrics = {
        "on_time_rate": round((on_time_count / total_count) * 100, 2) if total_count > 0 else 0,
        "utilization": 75.0,
        "total_orders": total_count,
        "on_time_orders": on_time_count
    }
    
    # 스케줄 데이터 변환
    schedule_list = []
    for s in schedules:
        order = db.query(Order).filter(Order.id == s.order_id).first()
        schedule_list.append({
            "id": s.id,
            "order_number": order.order_number if order else "N/A",
            "product_code": order.product_code if order else "N/A",
            "machine_id": s.machine_id,
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat(),
            "duration_minutes": s.duration_minutes,
            "is_on_time": s.is_on_time,
            "status": s.status or "planned"
        })
    
    return {
        "schedule": schedule_list,
        "metrics": metrics,
        "total": total_count
    }


@router.put("/{schedule_id}/complete")
def complete_production(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """생산 완료 처리"""
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.user_id == current_user.id
    ).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="스케줄을 찾을 수 없습니다")
    
    if schedule.status != 'in_progress':
        raise HTTPException(status_code=400, detail="생산 중인 작업만 완료할 수 있습니다")
    
    schedule.status = 'completed'
    schedule.actual_end = datetime.now()
    
    db.commit()
    db.refresh(schedule)
    
    return {"message": "생산이 완료되었습니다", "schedule_id": schedule_id}


@router.get("/weekly-summary")
def get_weekly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """주간 요약"""
    try:
        today = datetime.now().date()
        weekly_data = []
        
        for i in range(2):
            target_date = today + timedelta(days=i)
    
            schedules = db.query(Schedule).join(Order).filter(
                Schedule.user_id == current_user.id,
                func.date(Schedule.start_time) == target_date  # ← db.func → func
            ).all()
            
            total_quantity = sum(
                db.query(Order).filter(Order.id == s.order_id).first().quantity 
                for s in schedules
            ) if schedules else 0
            
            equipment_count = len(set(s.machine_id for s in schedules))
            
            total_minutes = sum(s.duration_minutes for s in schedules)
            max_minutes = equipment_count * 10 * 60 if equipment_count > 0 else 1  # 10시간 가동
            utilization = round((total_minutes / max_minutes) * 100, 1)
            
            weekly_data.append({
                "date": target_date.strftime("%Y-%m-%d"),
                "day_of_week": ["월", "화", "수", "목", "금", "토", "일"][target_date.weekday()],
                "scheduled_quantity": total_quantity,
                "equipment_count": equipment_count,
                "utilization": min(utilization, 100)
            })
        
        return {
            "weekly_summary": weekly_data,
            "total_quantity": sum(d["scheduled_quantity"] for d in weekly_data),
            "avg_utilization": round(sum(d["utilization"] for d in weekly_data) / 2, 1) if weekly_data else 0
        }
        
    except Exception as e:
        import traceback
        print(f"❌ 주간 요약 에러:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"주간 요약 조회 실패: {str(e)}")


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """스케줄 삭제"""
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.user_id == current_user.id
    ).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="스케줄을 찾을 수 없습니다")
    
    order = db.query(Order).filter(Order.id == schedule.order_id).first()
    if order:
        order.status = "pending"
    
    db.delete(schedule)
    db.commit()
    
    return {"success": True, "message": "스케줄이 삭제되었습니다"}


# schedule.py에 추가할 코드

@router.patch("/{schedule_id}/status")
def update_schedule_status(
    schedule_id: int,
    status: str,  # "in_progress" 또는 "completed"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    스케줄 상태 변경 (작업 시작/완료 등록)
    
    status 값:
    - "planned": 계획됨 (기본값)
    - "in_progress": 가동중
    - "completed": 완료
    - "cancelled": 취소
    """
    # 유효한 상태값 체크
    valid_statuses = ["planned", "in_progress", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"유효하지 않은 상태값입니다. 가능한 값: {valid_statuses}"
        )
    
    # 스케줄 조회
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.user_id == current_user.id
    ).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="스케줄을 찾을 수 없습니다")
    
    # 상태 업데이트
    old_status = schedule.status
    schedule.status = status
    
    # 완료 처리 시 주문 상태도 업데이트
    if status == "completed":
        order = db.query(Order).filter(Order.id == schedule.order_id).first()
        if order:
            order.status = "completed"
    
    db.commit()
    
    return {
        "success": True,
        "message": f"상태가 변경되었습니다: {old_status} → {status}",
        "schedule_id": schedule_id,
        "status": status
    }


@router.get("/in-progress")
def get_in_progress_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """현재 가동중인 스케줄 조회"""
    schedules = db.query(Schedule).filter(
        Schedule.user_id == current_user.id,
        Schedule.status == "in_progress"
    ).order_by(Schedule.start_time).all()
    
    result = []
    for s in schedules:
        order = db.query(Order).filter(Order.id == s.order_id).first()
        equipment = db.query(Equipment).filter(Equipment.machine_id == s.machine_id).first()
        
        result.append({
            "id": s.id,
            "machine_id": s.machine_id,
            "machine_name": equipment.machine_name if equipment else s.machine_id,
            "order_number": order.order_number if order else "N/A",
            "product_code": order.product_code if order else "N/A",
            "product_name": order.product_name if order else "N/A",
            "quantity": order.quantity if order else 0,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "actual_start": s.start_time.isoformat() if s.start_time else None,  # 추가
            "status": s.status
        })
    
    return {
        "in_progress": result,
        "total": len(result)
    }
