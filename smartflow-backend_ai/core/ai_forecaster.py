"""
SmartFlow AI 수요 예측 모듈
XGBoost + LightGBM + CatBoost 앙상블 모델 연동
"""
import pickle
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import os

class DemandForecaster:
    """
    AI 수요 예측기
    - 모델: XGBoost + LightGBM + CatBoost 앙상블
    - 기능: T+1 ~ T+4일 수요 예측 + 확률 계산
    """
    
    def __init__(self, model_path: str = "./ai_models/models.pkl"):
        """
        모델 초기화
        
        Args:
            model_path: 학습된 모델 파일 경로
        """
        self.model_path = model_path
        self.models = None
        self.feature_columns = [
            'T일 예정 수주량', 'T+1일 예정 수주량', 'T+2일 예정 수주량', 
            'T+3일 예정 수주량', 'T+4일 예정 수주량',
            '작년 T일 예정 수주량', '작년 T+1일 예정 수주량', 
            '작년 T+2일 예정 수주량', '작년 T+3일 예정 수주량', 
            '작년 T+4일 예정 수주량',
            'Temperature', 'Humidity',
            'DoW_Monday', 'DoW_Saturday', 'DoW_Sunday', 
            'DoW_Thursday', 'DoW_Tuesday', 'DoW_Wednesday'
        ]
        
        # 모델 로드 시도
        self._load_models()
    
    def _load_models(self):
        """학습된 모델 로드"""
        try:
            if os.path.exists(self.model_path):
                with open(self.model_path, 'rb') as f:
                    self.models = pickle.load(f)
                print(f"✅ AI 모델 로드 성공: {self.model_path}")
            else:
                print(f"⚠️  모델 파일 없음: {self.model_path}")
                self.models = None
        except Exception as e:
            print(f"❌ 모델 로드 실패: {str(e)}")
            self.models = None
    
    def predict_demand(
        self, 
        product_code: str,
        current_orders: Dict[str, int],
        last_year_orders: Dict[str, int],
        temperature: float,
        humidity: float,
        day_of_week: str
    ) -> Dict:
        """
        수요 예측 실행
        
        Args:
            product_code: 제품 코드 (예: "Product_c0")
            current_orders: 현재 예정 수주량 {'T': 100, 'T+1': 120, ...}
            last_year_orders: 작년 예정 수주량
            temperature: 기온
            humidity: 습도
            day_of_week: 요일 (Monday, Tuesday, ...)
        
        Returns:
            {
                'product_code': 'Product_c0',
                'predictions': {
                    'T+1': {'quantity': 830, 'probability': 0.72},
                    'T+2': {'quantity': 820, 'probability': 0.68},
                    'T+3': {'quantity': 815, 'probability': 0.65},
                    'T+4': {'quantity': 810, 'probability': 0.62}
                },
                'recommendation': 'VIP 고객 제품 - 즉시 850개 발주 권장',
                'priority': 'high',
                'model_version': 'v1.0'
            }
        """
        # 모델이 없으면 더미 데이터 반환
        if self.models is None:
            return self._generate_dummy_prediction(product_code)
        
        try:
            # 입력 데이터 준비
            input_data = self._prepare_input(
                current_orders, last_year_orders, 
                temperature, humidity, day_of_week
            )
            
            # T+1 ~ T+4 예측
            predictions = {}
            for horizon in ['T+1', 'T+2', 'T+3', 'T+4']:
                if f'{horizon}_classifier' in self.models and f'{horizon}_regressor' in self.models:
                    # 1단계: 발주 발생 확률 예측
                    classifier = self.models[f'{horizon}_classifier']
                    prob = classifier.predict_proba(input_data)[0][1]
                    
                    # 2단계: 수주량 예측
                    regressor = self.models[f'{horizon}_regressor']
                    quantity = int(regressor.predict(input_data)[0])
                    
                    predictions[horizon] = {
                        'quantity': max(0, quantity),
                        'probability': round(float(prob), 2)
                    }
            
            # 추천 사항 생성
            recommendation, priority = self._generate_recommendation(predictions)
            
            return {
                'product_code': product_code,
                'predictions': predictions,
                'recommendation': recommendation,
                'priority': priority,
                'model_version': 'v1.0',
                'status': 'success'
            }
            
        except Exception as e:
            print(f"❌ 예측 실패: {str(e)}")
            return self._generate_dummy_prediction(product_code)
    
    def _prepare_input(
        self,
        current_orders: Dict[str, int],
        last_year_orders: Dict[str, int],
        temperature: float,
        humidity: float,
        day_of_week: str
    ) -> pd.DataFrame:
        """입력 데이터를 모델 형식으로 변환"""
        # 요일 원-핫 인코딩
        dow_encoded = {f'DoW_{day}': 0 for day in [
            'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'
        ]}
        if day_of_week in dow_encoded:
            dow_encoded[f'DoW_{day_of_week}'] = 1
        
        # 데이터프레임 생성
        data = {
            'T일 예정 수주량': current_orders.get('T', 0),
            'T+1일 예정 수주량': current_orders.get('T+1', 0),
            'T+2일 예정 수주량': current_orders.get('T+2', 0),
            'T+3일 예정 수주량': current_orders.get('T+3', 0),
            'T+4일 예정 수주량': current_orders.get('T+4', 0),
            '작년 T일 예정 수주량': last_year_orders.get('T', 0),
            '작년 T+1일 예정 수주량': last_year_orders.get('T+1', 0),
            '작년 T+2일 예정 수주량': last_year_orders.get('T+2', 0),
            '작년 T+3일 예정 수주량': last_year_orders.get('T+3', 0),
            '작년 T+4일 예정 수주량': last_year_orders.get('T+4', 0),
            'Temperature': temperature,
            'Humidity': humidity,
            **dow_encoded
        }
        
        df = pd.DataFrame([data])
        
        # 필요한 컬럼만 선택
        return df[self.feature_columns]
    
    def _generate_recommendation(
        self, 
        predictions: Dict
    ) -> Tuple[str, str]:
        """
        예측 결과 기반 추천 생성
        
        Returns:
            (recommendation, priority)
        """
        # T+1 확률이 높으면 즉시 발주
        t1_prob = predictions.get('T+1', {}).get('probability', 0)
        t1_qty = predictions.get('T+1', {}).get('quantity', 0)
        
        # T+4 확률 체크
        t4_prob = predictions.get('T+4', {}).get('probability', 0)
        t4_qty = predictions.get('T+4', {}).get('quantity', 0)
        
        if t1_prob >= 0.7:
            priority = 'high'
            recommendation = f"🔴 즉시 발주 필요 - {int(t1_qty * 1.1)}개 준비 권장 (안전재고 10% 포함)"
        elif t1_prob >= 0.4:
            priority = 'medium'
            recommendation = f"🟡 발주 가능성 중간 - {int(t1_qty * 1.05)}개 준비 권장"
        else:
            priority = 'low'
            if t4_prob >= 0.7:
                recommendation = f"⚪ 현재 불필요 but 4일 후 {t4_qty}개 확률 {int(t4_prob*100)}% - 3일 내 준비"
            else:
                recommendation = "⚪ 최소 재고만 유지 - 발주 필요성 낮음"
        
        return recommendation, priority
    
    def _generate_dummy_prediction(self, product_code: str) -> Dict:
        """모델 없을 때 더미 예측 (개발용)"""
        np.random.seed(hash(product_code) % 2**32)
        
        predictions = {}
        for i, horizon in enumerate(['T+1', 'T+2', 'T+3', 'T+4']):
            prob = 0.7 - i * 0.1 + np.random.uniform(-0.1, 0.1)
            qty = int(800 - i * 20 + np.random.uniform(-50, 50))
            
            predictions[horizon] = {
                'quantity': max(0, qty),
                'probability': round(max(0, min(1, prob)), 2)
            }
        
        recommendation, priority = self._generate_recommendation(predictions)
        
        return {
            'product_code': product_code,
            'predictions': predictions,
            'recommendation': recommendation,
            'priority': priority,
            'model_version': 'dummy',
            'status': 'dummy_mode'
        }
    
    def batch_predict(
        self,
        products_data: List[Dict]
    ) -> List[Dict]:
        """
        여러 제품 일괄 예측
        
        Args:
            products_data: 제품별 입력 데이터 리스트
        
        Returns:
            예측 결과 리스트
        """
        results = []
        for data in products_data:
            result = self.predict_demand(
                product_code=data['product_code'],
                current_orders=data['current_orders'],
                last_year_orders=data['last_year_orders'],
                temperature=data.get('temperature', 20.0),
                humidity=data.get('humidity', 50.0),
                day_of_week=data.get('day_of_week', 'Monday')
            )
            results.append(result)
        
        return results


# 재고 최적화 함수
def calculate_inventory_policy(
    product_code: str,
    forecast_data: Dict,
    lead_time_days: int = 3,
    service_level: float = 0.95
) -> Dict:
    """
    재고 정책 계산 (안전재고, 재주문점)
    
    Args:
        product_code: 제품 코드
        forecast_data: 예측 결과
        lead_time_days: 리드타임 (일)
        service_level: 서비스 수준 (0.95 = 95%)
    
    Returns:
        {
            'product_code': 'Product_c0',
            'safety_stock': 150,
            'reorder_point': 350,
            'recommended_order_qty': 800,
            'explanation': '...'
        }
    """
    predictions = forecast_data.get('predictions', {})
    
    # 평균 수요 계산
    avg_demand = np.mean([
        p['quantity'] for p in predictions.values()
    ])
    
    # 수요 변동성 (표준편차)
    std_demand = np.std([
        p['quantity'] for p in predictions.values()
    ])
    
    # 안전재고 = Z-score * √(리드타임) * 표준편차
    z_score = 1.65  # 95% 서비스 수준
    safety_stock = int(z_score * np.sqrt(lead_time_days) * std_demand)
    
    # 재주문점 = 리드타임 수요 + 안전재고
    reorder_point = int(avg_demand * lead_time_days + safety_stock)
    
    # 추천 발주량 = 평균 수요 * 5일
    recommended_order_qty = int(avg_demand * 5)
    
    return {
        'product_code': product_code,
        'safety_stock': safety_stock,
        'reorder_point': reorder_point,
        'recommended_order_qty': recommended_order_qty,
        'lead_time_days': lead_time_days,
        'service_level': service_level,
        'avg_daily_demand': int(avg_demand),
        'explanation': f"평균 일일 수요 {int(avg_demand)}개 기준, "
                      f"리드타임 {lead_time_days}일, "
                      f"서비스 수준 {int(service_level*100)}% 적용"
    }


# 글로벌 싱글톤 인스턴스
_forecaster_instance = None

def get_forecaster() -> DemandForecaster:
    """포캐스터 싱글톤 인스턴스 반환"""
    global _forecaster_instance
    if _forecaster_instance is None:
        _forecaster_instance = DemandForecaster()
    return _forecaster_instance
