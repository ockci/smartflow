"""
SmartFlow - 하이브리드 AI 발주 예측 시스템
제품 관리와 자동 연동, 과거 데이터 부족 문제 해결
신규 AI 모델 (8001 포트) 통합
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import statistics
import requests
from pydantic import BaseModel
import pickle
import numpy as np

# 절대 경로로 import (api 폴더 내부)
from database.database import get_db
from models.models import Product, Order, User
from api.auth import get_current_user

router = APIRouter(prefix="/api/ai-forecast", tags=["ai-forecast"])

# ============================================
# 📊 Pydantic 스키마
# ============================================

class ProductForecastRequest(BaseModel):
    product_id: int

class PredictionResult(BaseModel):
    will_order: Optional[bool]
    quantity: Optional[int]
    confidence: str  # 없음, 낮음, 중간, 높음
    probability: float  # ⬅️ 필수로 변경

class HorizonForecast(BaseModel):
    horizon: str  # T+1, T+2, T+3, T+4
    date: str  # YYYY-MM-DD
    prediction: PredictionResult
    reasoning: Optional[str] = None

class DataAvailability(BaseModel):
    days_of_data: int
    total_orders: int
    can_use_ml: bool
    forecast_method: str

class ProductForecastResponse(BaseModel):
    product_id: int
    product_name: str
    product_code: str
    product_type: Optional[str] = None  # ⬅️ 새로 추가
    method: str
    data_availability: DataAvailability
    forecasts: List[HorizonForecast]
    message: str
    action_required: bool
    recommendation: str

class BatchForecastSummary(BaseModel):
    total_products: int
    by_method: Dict[str, int]
    products: List[Dict]

# ============================================
# 🧠 하이브리드 예측 시스템 (핵심)
# ============================================

class HybridForecastSystem:
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
        self.min_history_days = 30
        self.ai_server_url = "http://localhost:8001/api/forecast/predict"  # ⬅️ 새 AI 서버
    
    def get_data_availability(self, product_id: int) -> DataAvailability:
        """제품별 데이터 가용성 확인"""
        # ✅ Product 조회하여 product_code 얻기
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.user_id == self.user_id
        ).first()
        
        if not product:
            return DataAvailability(
                days_of_data=0,
                total_orders=0,
                can_use_ml=False,
                forecast_method="MANUAL"
            )
        
        # ✅ product_code로 Order 조회
        orders = self.db.query(Order).filter(
            Order.product_code == product.product_code,
            Order.user_id == self.user_id
        ).all()
        
        if not orders:
            days_of_data = 0
        else:
            unique_dates = set([o.created_at.date() for o in orders])
            days_of_data = len(unique_dates)
        
        return DataAvailability(
            days_of_data=days_of_data,
            total_orders=len(orders),
            can_use_ml=(days_of_data >= self.min_history_days),
            forecast_method=self._select_method(days_of_data)
        )
    
    def _select_method(self, days: int) -> str:
        """데이터량에 따라 예측 방법 자동 선택"""
        if days < 7:
            return "MANUAL"
        elif days < 30:
            return "RULE_BASED"
        elif days < 90:
            return "SIMPLE_ML"
        else:
            return "TWO_STAGE_AI"
    
    def predict_multi_horizon(self, product_id: int) -> Tuple[List[HorizonForecast], Optional[str]]:
        """
        T+1 ~ T+4 일괄 예측
        
        Returns:
            (forecasts, product_type)
        """
        availability = self.get_data_availability(product_id)
        method = availability.forecast_method
        
        horizons = []
        product_type = None
        base_date = datetime.now()
        
        for i in range(1, 5):
            forecast_date = base_date + timedelta(days=i)
            
            if method == "MANUAL":
                forecast = self._manual_forecast(product_id, i, forecast_date)
            elif method == "RULE_BASED":
                forecast = self._rule_based_forecast(product_id, i, forecast_date)
            elif method == "SIMPLE_ML":
                forecast = self._simple_ml_forecast(product_id, i, forecast_date)
            else:
                # ⬇️ 새 AI 서버 호출
                forecast, product_type = self._two_stage_forecast_v3(product_id, i, forecast_date)
            
            horizons.append(forecast)
        
        return horizons, product_type
    
    def _manual_forecast(self, product_id: int, horizon: int, forecast_date: datetime) -> HorizonForecast:
        """Phase 1: 수동 입력 필요 (데이터 부족)"""
        return HorizonForecast(
            horizon=f"T+{horizon}",
            date=forecast_date.strftime("%Y-%m-%d"),
            prediction=PredictionResult(
                will_order=None,
                quantity=None,
                confidence="없음",
                probability=0.0
            ),
            reasoning="과거 주문 데이터 부족 - 수동으로 발주 계획을 입력해주세요"
        )
    
    def _rule_based_forecast(self, product_id: int, horizon: int, forecast_date: datetime) -> HorizonForecast:
        """Phase 2: 규칙 기반 (최근 7일 평균)"""
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.user_id == self.user_id
        ).first()
        
        if not product:
            return self._manual_forecast(product_id, horizon, forecast_date)
        
        cutoff_date = datetime.now() - timedelta(days=7)
        recent_orders = self.db.query(Order).filter(
            Order.product_code == product.product_code,
            Order.user_id == self.user_id,
            Order.created_at >= cutoff_date
        ).all()
        
        quantities = [o.quantity for o in recent_orders if o.quantity > 0]
        
        if not quantities:
            avg_quantity = 0
            will_order = False
            probability = 0.0
            order_frequency = 0.0  # ⬅️ 추가
        else:
            avg_quantity = statistics.mean(quantities)
            order_frequency = len(quantities) / 7
            will_order = order_frequency > 0.3  # 주 2회 이상 발주
            probability = min(order_frequency * 100, 100.0)
        
        return HorizonForecast(
            horizon=f"T+{horizon}",
            date=forecast_date.strftime("%Y-%m-%d"),
            prediction=PredictionResult(
                will_order=will_order,
                quantity=round(avg_quantity) if will_order else 0,
                confidence="낮음",
                probability=probability
            ),
            reasoning=f"최근 7일 평균 {avg_quantity:.0f}개, 발주 빈도 {order_frequency:.1%}"
        )
    
    def _simple_ml_forecast(self, product_id: int, horizon: int, forecast_date: datetime) -> HorizonForecast:
        """Phase 3: 통계 모델 (지수평활)"""
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.user_id == self.user_id
        ).first()
        
        if not product:
            return self._rule_based_forecast(product_id, horizon, forecast_date)
        
        cutoff_date = datetime.now() - timedelta(days=30)
        recent_orders = self.db.query(Order).filter(
            Order.product_code == product.product_code,
            Order.user_id == self.user_id,
            Order.created_at >= cutoff_date
        ).all()
        
        quantities = [o.quantity for o in recent_orders if o.quantity > 0]
        
        if len(quantities) < 5:
            return self._rule_based_forecast(product_id, horizon, forecast_date)
        
        # 지수평활
        alpha = 0.3
        forecast_value = quantities[0]
        for q in quantities[1:]:
            forecast_value = alpha * q + (1 - alpha) * forecast_value
        
        zero_count = len([q for q in quantities if q == 0])
        zero_ratio = zero_count / len(quantities) if quantities else 1
        will_order = zero_ratio < 0.5
        
        return HorizonForecast(
            horizon=f"T+{horizon}",
            date=forecast_date.strftime("%Y-%m-%d"),
            prediction=PredictionResult(
                will_order=will_order,
                quantity=round(forecast_value) if will_order else 0,
                confidence="중간",
                probability=(1 - zero_ratio) * 100 if will_order else 0.0
            ),
            reasoning=f"지수평활 예측 {forecast_value:.0f}개, Zero 비율 {zero_ratio*100:.0f}%"
        )
    
    def _two_stage_forecast_v3(
        self, 
        product_id: int, 
        horizon: int, 
        forecast_date: datetime
    ) -> Tuple[HorizonForecast, Optional[str]]:
        """
        Phase 4: Two-Stage AI 모델 (새 버전 - 8001 포트)
        
        Returns:
            (forecast, product_type)
        """
        try:
            # 제품 정보 조회
            product = self.db.query(Product).filter(
                Product.id == product_id,
                Product.user_id == self.user_id
            ).first()
            
            if not product:
                return self._simple_ml_forecast(product_id, horizon, forecast_date), None
            
            # ⬇️ 새 AI 서버(8001) 호출
            response = requests.post(
                self.ai_server_url,
                json={
                    "product_code": product.product_code,
                    "base_date": None,  # 최신 날짜 자동 사용
                    "days": 4  # T+1 ~ T+4
                },
                timeout=10
            )
            
            if response.status_code == 200:
                ai_result = response.json()
                
                # 응답 성공 확인
                if not ai_result.get("success", False):
                    raise Exception("AI 서버 예측 실패")
                
                data = ai_result.get("data", {})
                predictions = data.get("predictions", [])
                product_type = data.get("product_type")
                
                # Horizon에 맞는 예측 찾기
                if len(predictions) >= horizon:
                    pred = predictions[horizon - 1]
                    
                    quantity = pred.get("quantity", 0)
                    probability = pred.get("probability", 0.0) * 100  # 0-1 → 0-100
                    will_order = probability >= 50.0
                    
                    # 신뢰도 계산
                    if probability >= 70:
                        confidence = "높음"
                    elif probability >= 40:
                        confidence = "중간"
                    else:
                        confidence = "낮음"
                    
                    return HorizonForecast(
                        horizon=f"T+{horizon}",
                        date=forecast_date.strftime("%Y-%m-%d"),
                        prediction=PredictionResult(
                            will_order=will_order,
                            quantity=int(quantity) if will_order else 0,
                            confidence=confidence,
                            probability=probability
                        ),
                        reasoning=f"신규 AI 모델 (정확도 88%+, MAE 13.29) - {pred.get('recommend', '')}"
                    ), product_type
            
            # AI 서버 호출 실패 시 폴백
            print(f"AI 서버 응답 오류: {response.status_code}")
            return self._simple_ml_forecast(product_id, horizon, forecast_date), None
            
        except requests.exceptions.Timeout:
            print(f"AI 서버 타임아웃")
            return self._simple_ml_forecast(product_id, horizon, forecast_date), None
            
        except requests.exceptions.ConnectionError:
            print(f"AI 서버 연결 실패 - 8001 포트 확인 필요")
            return self._simple_ml_forecast(product_id, horizon, forecast_date), None
            
        except Exception as e:
            print(f"AI 서버 호출 실패: {str(e)}")
            return self._simple_ml_forecast(product_id, horizon, forecast_date), None

# ============================================
# 🚀 API 엔드포인트
# ============================================

@router.post("/predict", response_model=ProductForecastResponse)
def predict_product_demand(
    request: ProductForecastRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ✅ 원래대로
):
    """단일 제품 T+1~T+4 예측"""
    
    # 제품 존재 확인 (본인 제품만)
    product = db.query(Product).filter(
        Product.id == request.product_id,
        Product.user_id == current_user.id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
    
    # 예측 실행
    forecaster = HybridForecastSystem(db, current_user.id)
    availability = forecaster.get_data_availability(request.product_id)
    horizons, product_type = forecaster.predict_multi_horizon(request.product_id)
    
    # 메시지 생성
    messages = {
        "MANUAL": f"📊 데이터 수집 중 ({availability.days_of_data}/7일) - 주문 데이터를 입력해주세요",
        "RULE_BASED": f"📈 단순 규칙 기반 예측 ({availability.days_of_data}일 데이터)",
        "SIMPLE_ML": f"🧮 통계 모델 예측 ({availability.days_of_data}일 데이터, 정확도 60-70%)",
        "TWO_STAGE_AI": f"🤖 신규 AI 모델 예측 ({availability.days_of_data}일 데이터, 정확도 88%+)"
    }
    
    recommendations = {
        "MANUAL": "💡 주문 이력을 쌓아가면서 점차 AI 예측 정확도가 향상됩니다",
        "RULE_BASED": "💡 7일간 데이터를 더 쌓으면 통계 모델로 업그레이드됩니다",
        "SIMPLE_ML": "💡 60일간 데이터를 더 쌓으면 AI 모델로 업그레이드됩니다",
        "TWO_STAGE_AI": "💡 충분한 데이터로 높은 정확도의 신규 AI 예측을 제공합니다"
    }
    
    return ProductForecastResponse(
        product_id=request.product_id,
        product_name=product.product_name,
        product_code=product.product_code,
        product_type=product_type,  # ⬅️ 새로 추가
        method=availability.forecast_method,
        data_availability=availability,
        forecasts=horizons,
        message=messages[availability.forecast_method],
        action_required=(availability.forecast_method == "MANUAL"),
        recommendation=recommendations[availability.forecast_method]
    )

@router.get("/batch", response_model=BatchForecastSummary)
def batch_predict_all_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """전체 제품 일괄 예측 상태 조회"""
    
    # 사용자의 모든 제품 조회
    products = db.query(Product).filter(
        Product.user_id == current_user.id
    ).all()
    
    if not products:
        return BatchForecastSummary(
            total_products=0,
            by_method={},
            products=[]
        )
    
    forecaster = HybridForecastSystem(db, current_user.id)
    
    results = []
    method_count = {"MANUAL": 0, "RULE_BASED": 0, "SIMPLE_ML": 0, "TWO_STAGE_AI": 0}
    
    for product in products:
        availability = forecaster.get_data_availability(product.id)
        method_count[availability.forecast_method] += 1
        
        results.append({
            "product_id": product.id,
            "product_name": product.product_name,
            "product_code": product.product_code,
            "method": availability.forecast_method,
            "days_of_data": availability.days_of_data,
            "can_predict": availability.forecast_method != "MANUAL"
        })
    
    return BatchForecastSummary(
        total_products=len(products),
        by_method=method_count,
        products=results
    )

@router.get("/status")
def get_system_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """시스템 전체 상태 요약"""
    
    products = db.query(Product).filter(
        Product.user_id == current_user.id
    ).all()
    
    if not products:
        return {
            "status": "no_products",
            "message": "등록된 제품이 없습니다. 제품을 먼저 등록해주세요.",
            "total_products": 0
        }
    
    forecaster = HybridForecastSystem(db, current_user.id)
    
    method_counts = {"MANUAL": 0, "RULE_BASED": 0, "SIMPLE_ML": 0, "TWO_STAGE_AI": 0}
    
    for product in products:
        availability = forecaster.get_data_availability(product.id)
        method_counts[availability.forecast_method] += 1
    
    # 전체 시스템 레벨 판단
    if method_counts["TWO_STAGE_AI"] > 0:
        system_level = "AI_READY"
        message = "🤖 신규 AI 모델을 사용할 수 있습니다!"
    elif method_counts["SIMPLE_ML"] > 0:
        system_level = "STATISTICAL"
        message = "🧮 통계 모델을 사용 중입니다"
    elif method_counts["RULE_BASED"] > 0:
        system_level = "BASIC"
        message = "📈 기본 규칙 기반 예측 중입니다"
    else:
        system_level = "DATA_COLLECTION"
        message = "📊 데이터 수집 단계입니다"
    
    return {
        "status": system_level,
        "message": message,
        "total_products": len(products),
        "by_method": method_counts,
        "recommendations": {
            "manual_products": method_counts["MANUAL"],
            "need_more_data": method_counts["MANUAL"] + method_counts["RULE_BASED"]
        },
        "ai_server_connected": _check_ai_server_connection()  # ⬅️ 새로 추가
    }

def _check_ai_server_connection() -> bool:
    """AI 서버(8001) 연결 상태 확인"""
    try:
        response = requests.get("http://localhost:8001/", timeout=2)
        return response.status_code == 200
    except:
        return False