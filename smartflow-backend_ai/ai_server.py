"""
SmartFlow AI Server - 최종 모델 버전
Two-Stage Ensemble (XGBoost + LightGBM + CatBoost)
SequenceEncoder + 제품 분류 시스템

Version: 3.0.0 (Custom Final)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import numpy as np
import pandas as pd
import pickle
import os
import torch
import torch.nn as nn
import torch.nn.functional as F

app = FastAPI(title="SmartFlow AI Backend v3.0", version="3.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# SequenceEncoder (PyTorch)
# ============================================================================

class SequenceEncoder(nn.Module):
    """14일 시퀀스 → 8차원 임베딩 변환"""
    def __init__(self, seq_len=14, emb_dim=8, dropout=0.2):
        super().__init__()
        self.conv1 = nn.Conv1d(1, 32, 3, padding=1)
        self.dropout1 = nn.Dropout(dropout)
        self.conv2 = nn.Conv1d(32, 16, 3, padding=1)
        self.dropout2 = nn.Dropout(dropout)
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.fc = nn.Linear(16, emb_dim)
        self.dropout3 = nn.Dropout(dropout)
    
    def forward(self, x):
        x = x.permute(0, 2, 1)
        x = F.relu(self.conv1(x))
        x = self.dropout1(x)
        x = F.relu(self.conv2(x))
        x = self.dropout2(x)
        x = self.pool(x).squeeze(-1)
        x = F.relu(self.fc(x))
        x = self.dropout3(x)
        return x


def get_embeddings(sequences, encoder, device, batch_size=512):
    """시퀀스 리스트 → 임베딩 변환"""
    encoder.eval()
    embeddings = []
    
    with torch.no_grad():
        for i in range(0, len(sequences), batch_size):
            batch = torch.FloatTensor(sequences[i:i+batch_size]).to(device)
            emb = encoder(batch).cpu().numpy()
            embeddings.append(emb)
    
    return np.vstack(embeddings) if embeddings else np.array([])


# ============================================================================
# 글로벌 모델 로더
# ============================================================================

class SmartFlowModelLoader:
    """모델 패키지 로드 및 관리"""
    
    def __init__(self):
        self.package = None
        self.encoder = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model_paths = [
            "./ai_models/smartflow_final_custom.pkl",
            "../smartflow-backend_ai/ai_models/smartflow_final_custom.pkl",
            "/mnt/user-data/uploads/smartflow_final_custom.pkl",
        ]
        self.encoder_paths = [
            "./ai_models/encoder_custom.pth",
            "../smartflow-backend_ai/ai_models/encoder_custom.pth",
        ]
        self._load_model()
    
    def _load_model(self):
        """모델 패키지 로드"""
        for path in self.model_paths:
            if os.path.exists(path):
                try:
                    with open(path, 'rb') as f:
                        self.package = pickle.load(f)
                    print(f"✅ 모델 로드 성공: {path}")
                    break
                except Exception as e:
                    print(f"❌ {path} 로드 실패: {e}")
                    continue
        
        if self.package is None:
            print("⚠️ 모델 파일 없음 - 더미 모드로 실행")
            return
        
        self.encoder = SequenceEncoder(dropout=0.2).to(self.device)
        
        if 'encoder_state' in self.package:
            self.encoder.load_state_dict(self.package['encoder_state'])
            print("✅ Encoder 로드 (패키지 내장)")
        else:
            for path in self.encoder_paths:
                if os.path.exists(path):
                    try:
                        self.encoder.load_state_dict(torch.load(path, map_location=self.device))
                        print(f"✅ Encoder 로드: {path}")
                        break
                    except Exception as e:
                        print(f"❌ {path} 로드 실패: {e}")
                        continue
        
        self.encoder.eval()
        
        if isinstance(self.package, dict):
            print(f"📦 모델 버전: {self.package.get('version', 'unknown')}")
            print(f"🎯 성능: {self.package.get('performance', {})}")
            print(f"🔑 Horizon 개수: {len(self.package.get('models', {}))}")
    
    def is_loaded(self):
        """모델 로드 여부"""
        return self.package is not None and self.encoder is not None


model_loader = SmartFlowModelLoader()


# ============================================================================
# 제품 분류
# ============================================================================

def classify_product(stats: Dict) -> str:
    """제품 통계 기반 분류"""
    mean_val = stats.get('mean', 0)
    cv = stats.get('cv', 0)
    zero_ratio = stats.get('zero_ratio', 0)
    
    if mean_val > 150 and cv < 0.3 and zero_ratio < 0.15:
        return 'Type A'
    elif mean_val > 50 and cv < 0.8 and zero_ratio < 0.3:
        return 'Stable'
    elif cv > 1.5 and zero_ratio < 0.5:
        return 'Emergency'
    else:
        return 'Sparse'


def get_product_type_features(product_type: str) -> List[int]:
    """제품 타입 원-핫 인코딩"""
    types = ['Type A', 'Stable', 'Emergency', 'Sparse']
    return [1 if t.replace(' ', '_') == product_type.replace(' ', '_') else 0 for t in types]


# ============================================================================
# 피처 생성
# ============================================================================

def create_features_for_prediction(
    sequence: List[float],
    product_stats: Dict,
    product_type: str,
    current_data: Dict,
    horizon_info: Dict
) -> np.ndarray:
    """예측용 28개 피처 생성"""
    current_features = [
        current_data.get('t_day_quantity', 0),
        current_data.get('last_year_quantity', 0),
        product_stats.get('mean', 0),
        product_stats.get('std', 0),
        product_stats.get('max', 0),
        product_stats.get('cv', 0),
        product_stats.get('zero_ratio', 0),
        current_data.get('temperature', 20.0),
        current_data.get('humidity', 50.0),
        current_data.get('dow', 0),
        current_data.get('is_weekday', 1),
        current_data.get('month', 1),
    ]
    
    future_features = [
        horizon_info.get('horizon', 1),
        horizon_info.get('future_dow', 0),
        horizon_info.get('future_month', 1),
        horizon_info.get('future_temp', 20.0),
        horizon_info.get('future_hum', 50.0),
    ]
    
    product_type_features = get_product_type_features(product_type)
    
    rolling_7 = np.mean(sequence[-7:]) if len(sequence) >= 7 else np.mean(sequence)
    rolling_3 = np.mean(sequence[-3:]) if len(sequence) >= 3 else np.mean(sequence)
    trend = sequence[-1] - sequence[0] if len(sequence) > 1 else 0
    
    statistical_features = [
        rolling_7,
        rolling_3,
        trend,
        sequence[-1] if sequence else 0,
    ]
    
    features = current_features + future_features + product_type_features + statistical_features
    return np.array(features)


def predict_with_probability(features, embeddings, horizon):
    """모델로 예측 (확률 + 수량)"""
    if not model_loader.is_loaded():
        avg_qty = features[0, 2] if features.shape[1] > 2 else 50
        return np.array([0.5]), np.array([avg_qty])
    
    try:
        horizon_models = model_loader.package['models'].get(horizon, {})
        clf = horizon_models.get('classifier')
        reg = horizon_models.get('regressor')
        
        if clf is None or reg is None:
            avg_qty = features[0, 2] if features.shape[1] > 2 else 50
            return np.array([0.5]), np.array([avg_qty])
        
        X_combined = np.hstack([features, embeddings])
        
        probas = clf.predict_proba(X_combined)[:, 1] if hasattr(clf, 'predict_proba') else np.array([0.5])
        quantities = reg.predict(X_combined)
        
        return probas, quantities
    
    except Exception as e:
        print(f"예측 오류: {e}")
        avg_qty = features[0, 2] if features.shape[1] > 2 else 50
        return np.array([0.5]), np.array([avg_qty])


# ============================================================================
# API 엔드포인트
# ============================================================================

@app.get("/")
def root():
    return {
        "message": "SmartFlow AI Backend v3.0",
        "status": "running",
        "model_loaded": model_loader.is_loaded(),
        "version": "3.0.0"
    }


@app.post("/api/inventory/full-analysis")
def full_inventory_analysis(request: dict):
    """
    완전한 AI 기반 재고 분석
    - 과거 데이터에서 현재 재고 추정
    - AI 기반 안전재고 계산
    - 4일 예측
    - 시나리오 시뮬레이션
    """
    try:
        product_code = request.get('product_code')
        scenario = request.get('scenario', 'normal')
        historical_data = request.get('historical_data', [])  # 14일 데이터
        initial_stock = request.get('initial_stock', 1000)
        lead_time = request.get('lead_time', 7)
        
        print(f"🤖 AI 전체 분석 시작: {product_code}")
        print(f"📊 과거 데이터: {historical_data}")
        
        # 1. 과거 데이터가 없으면 더미 생성
        if not historical_data or len(historical_data) == 0:
            historical_data = list(np.random.randint(40, 80, 14))
            print(f"⚠️ 데이터 없음 - 더미 생성: {historical_data}")
        
        # 14일로 맞추기
        if len(historical_data) < 14:
            historical_data = historical_data + [0] * (14 - len(historical_data))
        elif len(historical_data) > 14:
            historical_data = historical_data[-14:]
        
        # 2. 통계 계산
        arr = np.array(historical_data)
        mean_val = np.mean(arr[arr > 0]) if np.any(arr > 0) else 50.0
        std_val = np.std(arr[arr > 0]) if np.any(arr > 0) else 15.0
        max_val = np.max(arr)
        cv = std_val / (mean_val + 1e-6)
        zero_ratio = (arr == 0).mean()
        
        product_stats = {
            'mean': mean_val,
            'std': std_val,
            'max': max_val,
            'cv': cv,
            'zero_ratio': zero_ratio
        }
        
        product_type = classify_product(product_stats)
        print(f"📦 제품 타입: {product_type}")
        
        # 3. 현재 재고 추정 (초기재고 - 총 사용량)
        total_usage = sum(historical_data)
        current_stock = max(0, initial_stock - total_usage)
        print(f"💰 현재 재고 추정: {current_stock}")
        
        # 4. AI 기반 안전재고 계산
        # 안전재고 = (평균 일일 사용량 × 리드타임) + (표준편차 × 안전계수 × √리드타임)
        safety_factor = 1.65  # 95% 서비스 수준
        safety_stock = int((mean_val * lead_time) + (std_val * safety_factor * np.sqrt(lead_time)))
        print(f"🛡️ AI 추천 안전재고: {safety_stock}")
        
        # 5. AI 모델로 4일 예측
        current_data = {
            't_day_quantity': historical_data[-1] if historical_data else mean_val,
            'last_year_quantity': mean_val * 1.1,
            'temperature': 20.0,
            'humidity': 50.0,
            'dow': datetime.now().weekday(),
            'is_weekday': 1 if datetime.now().weekday() < 5 else 0,
            'month': datetime.now().month
        }
        
        seq_tensor = np.array([historical_data]).reshape(-1, 14, 1)
        embeddings = get_embeddings(seq_tensor, model_loader.encoder, model_loader.device) if model_loader.is_loaded() else np.zeros((1, 8))
        
        predictions = []
        for i, horizon in enumerate(['T+1', 'T+2', 'T+3', 'T+4']):
            future_date = datetime.now() + timedelta(days=i+1)
            
            horizon_info = {
                'horizon': i + 1,
                'future_dow': future_date.weekday(),
                'future_month': future_date.month,
                'future_temp': 20.0,
                'future_hum': 50.0
            }
            
            features = create_features_for_prediction(
                historical_data, product_stats, product_type,
                current_data, horizon_info
            ).reshape(1, -1)
            
            probas, quantities = predict_with_probability(features, embeddings, horizon)
            
            predictions.append({
                'date': future_date.strftime('%Y-%m-%d'),
                'quantity': float(quantities[0]),
                'probability': float(probas[0]),
                'confidence_lower': float(quantities[0] * 0.8),
                'confidence_upper': float(quantities[0] * 1.2)
            })
        
        print(f"🔮 AI 예측 완료: {[p['quantity'] for p in predictions]}")
        
        # 6. 시나리오 적용 시뮬레이션
        scenario_factors = {
            'normal': 1.0,
            'surge': 1.5,
            'decline': 0.7,
            'disruption': 1.0
        }
        factor = scenario_factors.get(scenario, 1.0)
        
        simulation = []
        stock = float(current_stock)
        
        for i, pred in enumerate(predictions):
            # 시나리오 적용
            if scenario == 'disruption' and i == 2:
                usage = pred['quantity'] * 1.5
                applied_factor = 1.5
            else:
                usage = pred['quantity'] * factor
                applied_factor = factor
            
            stock -= usage
            
            simulation.append({
                "date": pred['date'],
                "stock_level": max(0, stock),
                "daily_usage": usage,
                "scenario_factor": applied_factor
            })
        
        # 7. 경고 생성
        alerts = []
        min_stock = min(s['stock_level'] for s in simulation)
        
        if min_stock < safety_stock:
            alerts.append(f"⚠️ 안전재고({safety_stock}개) 미달 예상")
        
        if min_stock < 0:
            alerts.append(f"🚨 재고 부족 발생 예상")
        
        days_until_safety = None
        for i, s in enumerate(simulation):
            if s['stock_level'] < safety_stock:
                days_until_safety = i + 1
                break
        
        # 8. 요약 통계
        min_stock_result = min(simulation, key=lambda x: x['stock_level'])
        
        summary = {
            "min_stock": int(min_stock),
            "min_stock_date": min_stock_result['date'],
            "days_until_safety_stock": days_until_safety,
            "total_usage": sum(s['daily_usage'] for s in simulation),
            "avg_daily_usage": sum(s['daily_usage'] for s in simulation) / len(simulation),
            "current_stock": int(current_stock),
            "safety_stock": int(safety_stock)
        }
        
        print(f"✅ AI 분석 완료!")
        
        return {
            "success": True,
            "product_code": product_code,
            "product_type": product_type,
            "current_stock": int(current_stock),
            "safety_stock": int(safety_stock),
            "predictions": predictions,
            "simulation": simulation,
            "alerts": alerts,
            "summary": summary,
            "ai_model": {
                "used": model_loader.is_loaded(),
                "version": "3.0.0",
                "method": "TWO_STAGE_ENSEMBLE"
            }
        }
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI 분석 실패: {str(e)}")


@app.post("/api/forecast/predict")
def predict_demand(request: dict):
    """
    간단한 수요 예측 (호환성 유지)
    """
    try:
        product_code = request.get('product_code')
        days = request.get('days', 4)
        
        # 더미 데이터 생성
        historical_data = list(np.random.randint(40, 80, 14))
        
        response = full_inventory_analysis({
            'product_code': product_code,
            'scenario': 'normal',
            'historical_data': historical_data,
            'initial_stock': 1000
        })
        
        return {
            "success": True,
            "data": {
                "product_code": product_code,
                "predictions": response['predictions'],
                "summary": response['summary']
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예측 실패: {str(e)}")


@app.get("/predict/{product_code}")
def predict_demand_simple(product_code: str):
    """GET 방식 예측 (대시보드용)"""
    try:
        historical_data = list(np.random.randint(40, 80, 14))
        
        response = full_inventory_analysis({
            'product_code': product_code,
            'scenario': 'normal',
            'historical_data': historical_data
        })
        
        return {
            "success": True,
            "product_code": product_code,
            "predictions": [p['quantity'] for p in response['predictions']],
            "dates": [p['date'] for p in response['predictions']]
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/api/model/status")
def get_model_status():
    """모델 상태 확인"""
    if not model_loader.is_loaded():
        return {
            "model_loaded": False,
            "error": "모델 파일 없음"
        }
    
    return {
        "model_loaded": True,
        "version": "3.0.0",
        "device": str(model_loader.device),
        "encoder_loaded": model_loader.encoder is not None
    }


if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 80)
    print("🚀 SmartFlow AI Server v3.0 - Full AI Integration")
    print("=" * 80)
    uvicorn.run(app, host="0.0.0.0", port=8001)