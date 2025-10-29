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
    inventories = relationship("Inventory", back_populates="user")  # ⭐ 추가
    inventory_policies = relationship("InventoryPolicy", back_populates="user")  # ⭐ 추가

class Equipment(Base):
    """설비 정보 테이블"""
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    machine_id = Column(String(50), index=True)
    machine_name = Column(String(100))
    tonnage = Column(Integer)
    capacity_per_hour = Column(Integer)
    shift_start = Column(String(10))
    shift_end = Column(String(10))
    status = Column(String(20), default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="equipment")

class Order(Base):
    """주문 정보 테이블"""
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_number = Column(String(50), index=True)
    product_code = Column(String(50), index=True)
    product_name = Column(String(100))
    quantity = Column(Integer)
    due_date = Column(Date)
    priority = Column(Integer, default=1)
    status = Column(String(20), default="pending")
    is_urgent = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="orders")
    schedules = relationship("Schedule", back_populates="order")

class Schedule(Base):
    """스케줄 결과 테이블"""
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    schedule_id = Column(String(50), index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    machine_id = Column(String(50))
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer)
    is_on_time = Column(Boolean)
    status = Column(String(20), default="planned")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="schedules")
    order = relationship("Order", back_populates="schedules")

class Forecast(Base):
    """예측 결과 테이블"""
    __tablename__ = "forecasts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_code = Column(String(50), index=True)
    forecast_date = Column(Date)
    predicted_demand = Column(Integer)
    confidence_lower = Column(Integer)
    confidence_upper = Column(Integer)
    actual_demand = Column(Integer, nullable=True)
    mape = Column(Float, nullable=True)
    model_version = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="forecasts")

# ⭐⭐⭐ 새로 추가: 실제 재고 테이블 ⭐⭐⭐
class Inventory(Base):
    """재고 현황 테이블 (실제 재고 수량)"""
    __tablename__ = "inventories"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_code = Column(String(50), index=True)
    product_name = Column(String(100))
    current_stock = Column(Integer, default=0)  # 현재 재고
    unit = Column(String(20), default="개")  # 단위
    location = Column(String(100), nullable=True)  # 보관 위치
    min_stock = Column(Integer, default=0)  # 최소 재고 (알림용)
    max_stock = Column(Integer, nullable=True)  # 최대 재고
    unit_cost = Column(Float, nullable=True)  # 단가
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="inventories")

class InventoryPolicy(Base):
    """재고 정책 테이블 (안전재고, 재주문점 등)"""
    __tablename__ = "inventory_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_code = Column(String(50), index=True)
    safety_stock = Column(Integer)  # 안전재고
    reorder_point = Column(Integer)  # 재주문점
    recommended_order_qty = Column(Integer)  # 추천 발주량
    lead_time_days = Column(Integer)  # 리드타임
    service_level = Column(Float, default=0.95)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="inventory_policies")