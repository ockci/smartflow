"""
ìŠ¤ì¼€ì¤„ë§ API (ìˆ˜ì • ë²„ì „ - user_id í•„í„°ë§ ì¶”ê°€)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from database import get_db  # âœ… DB ì„¸ì…˜ë§Œ databaseì—ì„œ
from models import Schedule, Order, Equipment  # âœ… ëª¨ë¸ë“¤ì€ modelsì—ì„œ ê°€ì ¸ì˜¤ê¸°
from pydantic import BaseModel
from datetime import datetime, timedelta
from api.auth import get_current_user
from models import User
import time

router = APIRouter()

# ============================================================
# ðŸ“˜ Pydantic ìŠ¤í‚¤ë§ˆ
# ============================================================

class ScheduleRequest(BaseModel):
    order_ids: List[int] | None = None  # Noneì´ë©´ ëª¨ë“  pending ì£¼ë¬¸

class ScheduleResponse(BaseModel):
    id: int
    schedule_id: str
    order_id: int
    machine_id: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    is_on_time: bool
    status: str
    
    class Config:
        from_attributes = True

class ScheduleMetrics(BaseModel):
    on_time_rate: float
    utilization: float
    total_orders: int
    on_time_orders: int
    elapsed_time: float


# ============================================================
# âš™ï¸ ìŠ¤ì¼€ì¤„ë§ ì•Œê³ ë¦¬ì¦˜ (Greedy)
# ============================================================

class ProductionScheduler:
    def __init__(self, equipment_list: List[Equipment], orders: List[Order]):
        self.equipment = {eq.machine_id: eq for eq in equipment_list}
        self.orders = sorted(
            orders,
            key=lambda x: (x.priority, x.due_date)
        )
        
        # ê° ì‚¬ì¶œê¸°ì˜ í˜„ìž¬ ì‹œê°„ ì¶”ì 
        self.machine_timelines = {
            eq.machine_id: datetime.now()
            for eq in equipment_list
        }
    
    def generate_schedule(self) -> tuple[List[Dict], Dict]:
        """ìŠ¤ì¼€ì¤„ ìƒì„±"""
        schedule = []
        schedule_id = f"SCHEDULE-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        for order in self.orders:
            # ê°€ìž¥ ë¹¨ë¦¬ ì‹œìž‘ ê°€ëŠ¥í•œ ì‚¬ì¶œê¸° ì°¾ê¸°
            best_machine_id = min(
                self.machine_timelines.keys(),
                key=lambda m: self.machine_timelines[m]
            )
            
            machine = self.equipment[best_machine_id]
            start_time = self.machine_timelines[best_machine_id]
            
            # ìž‘ì—… ì‹œê°„ ê³„ì‚°
            work_hours = order.quantity / machine.capacity_per_hour
            duration_minutes = int(work_hours * 60)
            end_time = start_time + timedelta(minutes=duration_minutes)
            
            # ë‚©ê¸° ì¤€ìˆ˜ ì—¬ë¶€
            due_datetime = datetime.combine(order.due_date, datetime.min.time())
            is_on_time = end_time <= due_datetime
            
            schedule.append({
                'schedule_id': schedule_id,
                'order_id': order.id,
                'order_number': order.order_number,
                'product_code': order.product_code,
                'machine_id': best_machine_id,
                'start_time': start_time,
                'end_time': end_time,
                'duration_minutes': duration_minutes,
                'is_on_time': is_on_time,
                'due_date': order.due_date
            })
            
            # íƒ€ìž„ë¼ì¸ ì—…ë°ì´íŠ¸
            self.machine_timelines[best_machine_id] = end_time
        
        # ì„±ëŠ¥ ì§€í‘œ ê³„ì‚°
        metrics = self._calculate_metrics(schedule)
        return schedule, metrics
    
    def _calculate_metrics(self, schedule: List[Dict]) -> Dict:
        """ì„±ëŠ¥ ì§€í‘œ ê³„ì‚°"""
        if not schedule:
            return {
                'on_time_rate': 0,
                'utilization': 0,
                'total_orders': 0,
                'on_time_orders': 0
            }
        
        on_time_count = sum(1 for s in schedule if s['is_on_time'])
        on_time_rate = (on_time_count / len(schedule)) * 100
        
        total_work_time = sum(s['duration_minutes'] for s in schedule)
        total_available_time = len(self.equipment) * 8 * 60
        utilization = (total_work_time / total_available_time) * 100
        
        return {
            'on_time_rate': round(on_time_rate, 2),
            'utilization': round(min(utilization, 100), 2),  # ìµœëŒ€ 100%
            'total_orders': len(schedule),
            'on_time_orders': on_time_count
        }


# ============================================================
# ðŸ§© ìŠ¤ì¼€ì¤„ ìƒì„± API
# ============================================================

@router.post("/generate")
def generate_schedule(
    request: ScheduleRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # â­ ì¸ì¦ ì¶”ê°€
):
    """ìŠ¤ì¼€ì¤„ ìƒì„± (í˜„ìž¬ ì‚¬ìš©ìžì˜ ì„¤ë¹„/ì£¼ë¬¸ë§Œ ì‚¬ìš©)"""
    try:
        start = time.time()
        
        # 1. ì„¤ë¹„ ëª©ë¡ ê°€ì ¸ì˜¤ê¸° (â­ user_id í•„í„°ë§)
        equipment_list = db.query(Equipment).filter(
            Equipment.status == "active",
            Equipment.user_id == current_user.id  # â­
        ).all()
        
        if not equipment_list:
            raise HTTPException(
                status_code=400,
                detail="í™œì„± ì„¤ë¹„ê°€ ì—†ìŠµë‹ˆë‹¤. ë¨¼ì € ì„¤ë¹„ë¥¼ ë“±ë¡í•´ì£¼ì„¸ìš”."
            )
        
        # 2. ì£¼ë¬¸ ëª©ë¡ ê°€ì ¸ì˜¤ê¸° (â­ user_id í•„í„°ë§)
        query = db.query(Order).filter(
            Order.status.in_(["pending", "scheduled"]),
            Order.user_id == current_user.id  # â­
        )
        
        if request and request.order_ids:
            query = query.filter(Order.id.in_(request.order_ids))
        
        orders = query.all()
        
        if not orders:
            raise HTTPException(
                status_code=400,
                detail="ìŠ¤ì¼€ì¤„ë§í•  ì£¼ë¬¸ì´ ì—†ìŠµë‹ˆë‹¤. ë¨¼ì € ì£¼ë¬¸ì„ ë“±ë¡í•´ì£¼ì„¸ìš”."
            )
        
        # 3. ìŠ¤ì¼€ì¤„ë§ ì‹¤í–‰
        scheduler = ProductionScheduler(equipment_list, orders)
        schedule_result, metrics = scheduler.generate_schedule()
        
        # 4. ë°ì´í„°ë² ì´ìŠ¤ì— ì €ìž¥ (â­ user_id í¬í•¨)
        for item in schedule_result:
            db_schedule = Schedule(
                user_id=current_user.id,  # â­ ì¶”ê°€
                schedule_id=item['schedule_id'],
                order_id=item['order_id'],
                machine_id=item['machine_id'],
                start_time=item['start_time'],
                end_time=item['end_time'],
                duration_minutes=item['duration_minutes'],
                is_on_time=item['is_on_time']
            )
            db.add(db_schedule)
            
            # ì£¼ë¬¸ ìƒíƒœ ì—…ë°ì´íŠ¸
            order = db.query(Order).filter(Order.id == item['order_id']).first()
            if order:
                order.status = "scheduled"
        
        db.commit()
        
        elapsed = time.time() - start
        
        return {
            "success": True,
            "message": "ìŠ¤ì¼€ì¤„ì´ ì„±ê³µì ìœ¼ë¡œ ìƒì„±ë˜ì—ˆìŠµë‹ˆë‹¤.",
            "data": {
                "schedule_id": schedule_result[0]['schedule_id'] if schedule_result else None,
                "schedule": schedule_result,
                "metrics": {**metrics, "elapsed_time": round(elapsed, 2)}
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        print(f"ìŠ¤ì¼€ì¤„ ìƒì„± ì˜¤ë¥˜: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"ìŠ¤ì¼€ì¤„ ìƒì„± ì‹¤íŒ¨: {str(e)}"
        )


# ============================================================
# ðŸ“Š ìŠ¤ì¼€ì¤„ ê²°ê³¼ ì¡°íšŒ API
# ============================================================

@router.get("/result")
def get_schedule_result(
    schedule_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # â­ ì¸ì¦ ì¶”ê°€
):
    """ìŠ¤ì¼€ì¤„ ê²°ê³¼ ì¡°íšŒ (í˜„ìž¬ ì‚¬ìš©ìžì˜ ìŠ¤ì¼€ì¤„ë§Œ)"""
    try:
        # â­ user_id í•„í„°ë§ ì¶”ê°€
        query = db.query(Schedule).filter(
            Schedule.user_id == current_user.id
        )
        
        if schedule_id:
            query = query.filter(Schedule.schedule_id == schedule_id)
        else:
            # ìµœì‹  ìŠ¤ì¼€ì¤„
            latest = db.query(Schedule.schedule_id).filter(
                Schedule.user_id == current_user.id
            ).order_by(Schedule.created_at.desc()).first()
            
            if latest:
                query = query.filter(Schedule.schedule_id == latest.schedule_id)
        
        schedules = query.all()

        if not schedules:
            return {
                "success": True,
                "data": {
                    "schedule": [],
                    "metrics": {
                        "on_time_rate": 0,
                        "utilization": 0,
                        "total_orders": 0,
                        "on_time_orders": 0
                    }
                }
            }

        # metrics ê³„ì‚°
        on_time_count = sum(1 for s in schedules if s.is_on_time)
        total_orders = len(schedules)
        on_time_rate = round((on_time_count / total_orders) * 100, 2) if total_orders else 0
        
        # ê°€ë™ë¥  ê³„ì‚°
        total_work_time = sum(s.duration_minutes for s in schedules)
        equipment_count = db.query(Equipment).filter(
            Equipment.user_id == current_user.id,
            Equipment.status == "active"
        ).count()
        total_available_time = equipment_count * 8 * 60
        utilization = round((total_work_time / total_available_time) * 100, 2) if total_available_time else 0

        # Order ì •ë³´ í¬í•¨
        result = []
        for schedule in schedules:
            order = db.query(Order).filter(Order.id == schedule.order_id).first()
            result.append({
                "id": schedule.id,
                "schedule_id": schedule.schedule_id,
                "order_number": order.order_number if order else "N/A",
                "product_code": order.product_code if order else "N/A",
                "machine_id": schedule.machine_id,
                "start_time": schedule.start_time.isoformat(),
                "end_time": schedule.end_time.isoformat(),
                "duration_minutes": schedule.duration_minutes,
                "is_on_time": schedule.is_on_time,
                "status": schedule.status
            })

        return {
            "success": True,
            "data": {
                "schedule": result,
                "metrics": {
                    "on_time_rate": on_time_rate,
                    "utilization": min(utilization, 100),
                    "total_orders": total_orders,
                    "on_time_orders": on_time_count
                }
            }
        }

    except Exception as e:
        import traceback
        print(f"ìŠ¤ì¼€ì¤„ ì¡°íšŒ ì˜¤ë¥˜: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"ìŠ¤ì¼€ì¤„ ì¡°íšŒ ì‹¤íŒ¨: {str(e)}")


# ============================================================
# ðŸ“… ê°„íŠ¸ì°¨íŠ¸ ë°ì´í„° API
# ============================================================

@router.get("/gantt")
def get_gantt_data(
    schedule_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # â­ ì¸ì¦ ì¶”ê°€
):
    """ê°„íŠ¸ì°¨íŠ¸ìš© ë°ì´í„° (í˜„ìž¬ ì‚¬ìš©ìžë§Œ)"""
    try:
        # â­ user_id í•„í„°ë§
        query = db.query(Schedule).filter(
            Schedule.user_id == current_user.id
        )
        
        if schedule_id:
            query = query.filter(Schedule.schedule_id == schedule_id)
        else:
            latest = db.query(Schedule.schedule_id).filter(
                Schedule.user_id == current_user.id
            ).order_by(Schedule.created_at.desc()).first()
            if latest:
                query = query.filter(Schedule.schedule_id == latest.schedule_id)
        
        schedules = query.all()
        
        gantt_data = []
        for schedule in schedules:
            order = db.query(Order).filter(Order.id == schedule.order_id).first()
            gantt_data.append({
                "task": f"{order.order_number} ({order.product_code})" if order else "Unknown",
                "machine": schedule.machine_id,
                "start": schedule.start_time.isoformat(),
                "end": schedule.end_time.isoformat(),
                "duration": schedule.duration_minutes,
                "on_time": schedule.is_on_time,
                "status": schedule.status
            })
        
        return {"success": True, "data": gantt_data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ê°„íŠ¸ì°¨íŠ¸ ë°ì´í„° ì¡°íšŒ ì‹¤íŒ¨: {str(e)}")