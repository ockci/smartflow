"""
SmartFlow Pydantic 스키마
API 요청/응답 데이터 검증
"""
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime, date
from typing import Optional, List


# -------------------------------
# 설비 생성/수정용 스키마
# -------------------------------
class EquipmentCreate(BaseModel):
    machine_id: str
    machine_name: Optional[str] = None
    tonnage: Optional[int] = None
    capacity_per_hour: Optional[int] = None
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    status: Optional[str] = "active"


# -------------------------------
# 설비 응답용 스키마
# -------------------------------
class Equipment(BaseModel):
    id: int
    user_id: int
    machine_id: str
    machine_name: Optional[str] = None
    tonnage: Optional[int] = None
    capacity_per_hour: Optional[int] = None
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ==================== 주문 스키마 ====================
class OrderBase(BaseModel):
    order_number: str
    product_code: str
    product_name: Optional[str] = None
    quantity: int = Field(..., ge=0)
    due_date: date
    priority: int = Field(default=1, ge=1, le=5)
    is_urgent: bool = False
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    product_name: Optional[str] = None
    quantity: Optional[int] = None
    due_date: Optional[date] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    is_urgent: Optional[bool] = None
    notes: Optional[str] = None

class Order(OrderBase):
    id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# ==================== 스케줄 스키마 ====================
class ScheduleItem(BaseModel):
    order_number: str
    product_code: str
    machine_id: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    is_on_time: bool
    due_date: date

class ScheduleResponse(BaseModel):
    schedule_id: str
    schedules: List[ScheduleItem]
    metrics: dict
    generated_at: datetime

class GanttData(BaseModel):
    machine_id: str
    tasks: List[dict]

# ==================== 예측 스키마 ====================
class ForecastRequest(BaseModel):
    product_code: str
    start_date: date
    days: int = Field(default=7, ge=1, le=30)

class ForecastResult(BaseModel):
    product_code: str
    predictions: List[int]
    dates: List[date]
    confidence_intervals: List[dict]
    accuracy: Optional[float] = None

# ==================== 재고 스키마 ====================
class InventoryPolicy(BaseModel):
    product_code: str
    safety_stock: int
    reorder_point: int
    recommended_order_qty: int
    lead_time_days: int
    service_level: float = 0.95

class InventoryStatus(BaseModel):
    product_code: str
    current_stock: int
    safety_stock: int
    reorder_point: int
    status: str  # "safe", "warning", "critical"
    recommended_action: str

# ==================== 대시보드 스키마 ====================
class DashboardSummary(BaseModel):
    total_orders: int
    pending_orders: int
    in_progress_orders: int
    completed_orders: int
    on_time_rate: float
    equipment_utilization: float
    alerts_count: int

class ProductionStatus(BaseModel):
    machine_id: str
    current_order: Optional[str]
    progress: float
    status: str

class Alert(BaseModel):
    type: str  # "inventory", "deadline", "equipment"
    severity: str  # "low", "medium", "high"
    message: str
    timestamp: datetime

# ==================== 엑셀 업로드 응답 ====================
class UploadResponse(BaseModel):
    success: bool
    message: str
    count: int
    errors: Optional[List[str]] = None

# ==================== 사용자 및 인증 스키마 ====================
class UserBase(BaseModel):
    email: EmailStr
    username: str
    company_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[EmailStr] = None