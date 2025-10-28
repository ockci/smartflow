"""
SmartFlow 데이터베이스 모델 (수정 버전 - user_id 추가)
SQLAlchemy ORM 모델 정의
"""
from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime, Date, Text, ForeignKey, Time
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    """사용자 테이블"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(100))
    company_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # ⭐ 관계 추가
    equipment = relationship("Equipment", back_populates="user")
    orders = relationship("Order", back_populates="user")
    schedules = relationship("Schedule", back_populates="user")
    forecasts = relationship("Forecast", back_populates="user")

class Equipment(Base):
    """설비 정보 테이블"""
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ⭐ 추가
    machine_id = Column(String(50), index=True)  # unique 제거 (user별로 구분)
    machine_name = Column(String(100))
    tonnage = Column(Integer)  # 톤수
    capacity_per_hour = Column(Integer)  # 시간당 생산능력
    shift_start = Column(String(10))  # "08:00"
    shift_end = Column(String(10))  # "18:00"
    status = Column(String(20), default="active")  # active, maintenance, inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # ⭐ 관계 추가
    user = relationship("User", back_populates="equipment")

class Order(Base):
    """주문 정보 테이블"""
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ⭐ 추가
    order_number = Column(String(50), index=True)  # unique 제거
    product_code = Column(String(50), index=True)
    product_name = Column(String(100))
    quantity = Column(Integer)
    due_date = Column(Date)
    priority = Column(Integer, default=1)  # 1=높음, 5=낮음
    status = Column(String(20), default="pending")  # pending, scheduled, in_progress, completed
    is_urgent = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # ⭐ 관계 추가
    user = relationship("User", back_populates="orders")
    schedules = relationship("Schedule", back_populates="order")

class Schedule(Base):
    """스케줄 결과 테이블"""
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ⭐ 추가
    schedule_id = Column(String(50), index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    machine_id = Column(String(50))
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer)
    is_on_time = Column(Boolean)
    status = Column(String(20), default="planned")  # planned, in_progress, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # ⭐ 관계 추가
    user = relationship("User", back_populates="schedules")
    order = relationship("Order", back_populates="schedules")

class Forecast(Base):
    """예측 결과 테이블"""
    __tablename__ = "forecasts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ⭐ 추가
    product_code = Column(String(50), index=True)
    forecast_date = Column(Date)
    predicted_demand = Column(Integer)
    confidence_lower = Column(Integer)
    confidence_upper = Column(Integer)
    actual_demand = Column(Integer, nullable=True)
    mape = Column(Float, nullable=True)
    model_version = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # ⭐ 관계 추가
    user = relationship("User", back_populates="forecasts")

class InventoryPolicy(Base):
    """재고 정책 테이블"""
    __tablename__ = "inventory_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ⭐ 추가
    product_code = Column(String(50), index=True)  # unique 제거
    safety_stock = Column(Integer)  # 안전재고
    reorder_point = Column(Integer)  # 재주문점
    recommended_order_qty = Column(Integer)  # 추천 발주량
    lead_time_days = Column(Integer)  # 리드타임
    service_level = Column(Float, default=0.95)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())