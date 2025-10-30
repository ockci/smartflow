"""
SmartFlow 데이터베이스 모델 (완전판 - Equipment 중복 제거 + Product, BOM, InventoryTransaction 포함)
SQLAlchemy ORM 모델 정의
"""

from sqlalchemy import (
    Boolean, Column, Integer, String, Float, DateTime, Date, Text, ForeignKey, Time
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.database import Base
from datetime import datetime

# -------------------------------
# 사용자(User) 모델
# -------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    company_name = Column(String, nullable=True)
    is_active = Column(Integer, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계
    equipment = relationship("Equipment", back_populates="user")
    orders = relationship("Order", back_populates="user")
    schedules = relationship("Schedule", back_populates="user")
    forecasts = relationship("Forecast", back_populates="user")
    inventories = relationship("Inventory", back_populates="user")
    inventory_policies = relationship("InventoryPolicy", back_populates="user")
    products = relationship("Product", back_populates="user")


# -------------------------------
# 설비(Equipment) 모델 (✅ 중복 제거 + 안전 처리)
# -------------------------------
class Equipment(Base):
    """설비 정보 테이블"""
    __tablename__ = "equipment"
    __table_args__ = {'extend_existing': True}

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


# -------------------------------
# 주문(Order) 모델
# -------------------------------
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


# -------------------------------
# 스케줄(Schedule) 모델
# -------------------------------
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


# -------------------------------
# 예측(Forecast) 모델
# -------------------------------
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


# -------------------------------
# 재고(Inventory) 모델
# -------------------------------
class Inventory(Base):
    """재고 현황 테이블"""
    __tablename__ = "inventories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_code = Column(String(50), index=True)
    product_name = Column(String(100))
    current_stock = Column(Integer, default=0)
    unit = Column(String(20), default="개")
    location = Column(String(100), nullable=True)
    min_stock = Column(Integer, default=0)
    max_stock = Column(Integer, nullable=True)
    unit_cost = Column(Float, nullable=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="inventories")


# -------------------------------
# 재고 정책(InventoryPolicy) 모델
# -------------------------------
class InventoryPolicy(Base):
    """재고 정책 테이블"""
    __tablename__ = "inventory_policies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_code = Column(String(50), index=True)
    safety_stock = Column(Integer)
    reorder_point = Column(Integer)
    recommended_order_qty = Column(Integer)
    lead_time_days = Column(Integer)
    service_level = Column(Float, default=0.95)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="inventory_policies")


# -------------------------------
# 제품(Product) 모델
# -------------------------------
class Product(Base):
    """제품 정보 마스터"""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_code = Column(String(50), index=True)
    product_name = Column(String(100))
    unit_price = Column(Float, nullable=True)
    unit_cost = Column(Float, nullable=True)
    required_tonnage = Column(Integer, nullable=True)
    cycle_time = Column(Integer, nullable=True)
    cavity_count = Column(Integer, default=1)
    unit = Column(String(20), default="개")
    min_stock = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="products")
    bom_items = relationship("BOM", back_populates="product", foreign_keys="BOM.product_code")


# -------------------------------
# 자재명세서(BOM) 모델
# -------------------------------
class BOM(Base):
    """자재 명세서"""
    __tablename__ = "bom"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_code = Column(String(50), ForeignKey("products.product_code"))
    material_code = Column(String(50))
    material_name = Column(String(100))
    quantity_per_unit = Column(Float)
    unit = Column(String(20))

    product = relationship("Product", back_populates="bom_items", foreign_keys=[product_code])


# -------------------------------
# 재고 이동 이력(InventoryTransaction) 모델
# -------------------------------
class InventoryTransaction(Base):
    """재고 이동 이력"""
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_code = Column(String(50), index=True)
    transaction_type = Column(String(20))
    quantity = Column(Integer)
    before_stock = Column(Integer)
    after_stock = Column(Integer)
    reference_id = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
