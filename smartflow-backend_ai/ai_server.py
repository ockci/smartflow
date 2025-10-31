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
    """
    14일 시퀀스 → 8차원 임베딩 변환
    CNN 기반 시퀀스 인코더
    """
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
        # 1. 모델 파일 로드
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
            print("⚠️  모델 파일 없음 - 더미 모드로 실행")
            return
        
        # 2. Encoder 로드
        self.encoder = SequenceEncoder(dropout=0.2).to(self.device)
        
        # Option 1: encoder_state가 패키지에 포함된 경우
        if 'encoder_state' in self.package:
            self.encoder.load_state_dict(self.package['encoder_state'])
            print("✅ Encoder 로드 (패키지 내장)")
        
        # Option 2: 별도 파일에서 로드
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
        
        # 3. 모델 정보 출력
        if isinstance(self.package, dict):
            print(f"📦 모델 버전: {self.package.get('version', 'unknown')}")
            print(f"🎯 성능: {self.package.get('performance', {})}")
            print(f"🔑 Horizon 개수: {len(self.package.get('models', {}))}")
    
    def is_loaded(self):
        """모델 로드 여부"""
        return self.package is not None and self.encoder is not None


# 싱글톤 인스턴스
model_loader = SmartFlowModelLoader()


# ============================================================================
# 제품 분류
# ============================================================================

def classify_product(stats: Dict) -> str:
    """
    제품 통계 기반 분류
    
    Args:
        stats: {mean, std, cv, zero_ratio, ...}
    
    Returns:
        'Type A' | 'Stable' | 'Emergency' | 'Sparse'
    """
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
    """
    예측용 28개 피처 생성
    
    Args:
        sequence: 14일 과거 수주량 [day1, day2, ..., day14]
        product_stats: {mean, std, max, cv, zero_ratio}
        product_type: 'Type A' | 'Stable' | 'Emergency' | 'Sparse'
        current_data: {
            t_day_quantity: 현재 T일 수주량,
            last_year_quantity: 작년 동기 수주량,
            temperature: 기온,
            humidity: 습도,
            dow: 요일(0-6),
            is_weekday: 주중 여부,
            month: 월(1-12)
        }
        horizon_info: {
            horizon: 1-4,
            future_dow: 미래 요일,
            future_month: 미래 월,
            future_temp: 미래 기온,
            future_hum: 미래 습도
        }
    
    Returns:
        np.ndarray: shape (28,)
    """
    # 현재 피처 (15개)
    current_features = [
        current_data.get('t_day_quantity', 0),
        current_data.get('last_year_quantity', 0),
        product_stats.get('mean', 0),
        product_stats.get('std', 0),
        product_stats.get('max', 0),
        current_data.get('dow', 0),
        current_data.get('is_weekday', 1),
        current_data.get('month', 1),
        current_data.get('temperature', 20.0),
        current_data.get('humidity', 50.0),
        *get_product_type_features(product_type),  # 4개
        int(current_data.get('t_day_quantity', 0) == 0)  # is_zero
    ]
    
    # 미래 피처 (5개)
    future_features = [
        horizon_info.get('horizon', 1),
        horizon_info.get('future_dow', 0),
        horizon_info.get('future_month', 1),
        horizon_info.get('future_temp', 20.0),
        horizon_info.get('future_hum', 50.0)
    ]
    
    # 임베딩은 별도로 추가됨 (8개)
    # 최종: [embedding(8) + current(15) + future(5)] = 28개
    
    return np.array(current_features + future_features)


# ============================================================================
# Two-Stage 예측
# ============================================================================

def predict_with_probability(
    features: np.ndarray,
    embeddings: np.ndarray,
    horizon: str
) -> tuple:
    """
    Two-Stage 앙상블 예측 (3모델 평균)
    
    Args:
        features: shape (N, 20) - 현재 + 미래 피처
        embeddings: shape (N, 8) - 시퀀스 임베딩
        horizon: 'T+1', 'T+2', 'T+3', 'T+4'
    
    Returns:
        (probabilities, quantities)
    """
    if not model_loader.is_loaded():
        raise HTTPException(status_code=503, detail="모델이 로드되지 않음")
    
    models = model_loader.package['models'].get(horizon)
    if not models:
        print(f"⚠️ {horizon} 모델 없음 - 기본값 반환")
        return np.array([0.3]), np.array([50])
    
    # 최종 피처 결합 [임베딩(8) + 피처(20)]
    X = np.hstack([embeddings, features])
    
    # Stage 1: Classification (3모델 앙상블의 평균)
    clf_models = models.get('clf')
    
    if not clf_models or not isinstance(clf_models, list):
        print(f"⚠️ {horizon} Stage 1 모델 없음 - 기본값 반환")
        return np.array([0.3]), np.array([50])
    
    # 3개 모델의 확률 평균
    probas = sum(m.predict_proba(X)[:, 1] for m in clf_models) / len(clf_models)
    
    # Threshold 적용
    threshold = models.get('th', 0.5)
    will_order = probas >= threshold
    
    # Stage 2: Regression (3모델 앙상블의 평균)
    reg_models = models.get('reg')
    
    if not reg_models or not isinstance(reg_models, list):
        print(f"⚠️ {horizon} Stage 2 모델 없음 - 평균값 사용")
        quantities = np.zeros(len(X))
        quantities[will_order] = 50
        return probas, quantities
    
    quantities = np.zeros(len(X))
    
    if will_order.any():
        X_order = X[will_order]
        # 3개 모델의 예측 평균
        pred = sum(m.predict(X_order) for m in reg_models) / len(reg_models)
        quantities[will_order] = np.maximum(pred, 0)
    
    return probas, quantities


# ============================================================================
# Pydantic 모델
# ============================================================================

class ForecastRequest(BaseModel):
    product_code: str
    base_date: Optional[str] = None  # YYYY-MM-DD or None (최신)
    days: int = 4  # T+1 ~ T+4


class PredictionItem(BaseModel):
    date: str
    horizon: str
    product_type: str
    probability: float
    quantity: int
    recommend: str


class ForecastResponse(BaseModel):
    success: bool
    data: Dict


# ============================================================================
# API 엔드포인트
# ============================================================================

@app.get("/")
def root():
    return {
        "message": "SmartFlow AI Backend v3.0",
        "status": "running",
        "model_loaded": model_loader.is_loaded(),
        "version": "3.0.0",
        "approach": "Two-Stage Ensemble (XGBoost + LightGBM + CatBoost)",
        "features": {
            "sequence_encoder": True,
            "product_classification": True,
            "horizons": ["T+1", "T+2", "T+3", "T+4"]
        },
        "performance": model_loader.package.get('performance', {}) if model_loader.is_loaded() else {}
    }


@app.post("/api/forecast/predict")
def predict_demand(request: ForecastRequest):
    """
    수요 예측 API (메인)
    
    실제 구현 시 필요한 것:
    1. 데이터베이스 연결 (과거 14일 데이터 조회)
    2. 제품 통계 계산
    3. 날씨 데이터 (또는 평균값)
    """
    try:
        if not model_loader.is_loaded():
            return {
                "success": False,
                "error": "모델이 로드되지 않았습니다",
                "recommendation": "smartflow_final_custom.pkl 파일을 ai_models/ 폴더에 배치하세요"
            }
        
        # =============================================
        # TODO: 실제 구현 필요
        # =============================================
        # 1. 데이터베이스에서 과거 14일 데이터 조회
        sequence = get_product_sequence_from_db(request.product_code)  # 구현 필요
        
        # 2. 제품 통계 계산
        product_stats = calculate_product_stats(sequence)  # 구현 필요
        product_type = classify_product(product_stats)
        
        # 3. 현재 데이터 준비
        current_data = get_current_data(request.product_code)  # 구현 필요
        
        # =============================================
        
        # 더미 데이터 (개발용)
        if len(sequence) == 0:
            sequence = list(np.random.randint(50, 200, 14))
            product_stats = {
                'mean': np.mean(sequence),
                'std': np.std(sequence),
                'max': np.max(sequence),
                'cv': np.std(sequence) / (np.mean(sequence) + 1e-6),
                'zero_ratio': 0.1
            }
            product_type = classify_product(product_stats)
            current_data = {
                't_day_quantity': sequence[-1],
                'last_year_quantity': int(sequence[-1] * 1.1),
                'temperature': 20.0,
                'humidity': 50.0,
                'dow': datetime.now().weekday(),
                'is_weekday': 1 if datetime.now().weekday() < 5 else 0,
                'month': datetime.now().month
            }
        
        # 시퀀스 → 임베딩
        seq_tensor = np.array([sequence]).reshape(-1, 14, 1)
        embeddings = get_embeddings(seq_tensor, model_loader.encoder, model_loader.device)
        
        # Horizon별 예측
        predictions = []
        base_date = datetime.strptime(request.base_date, '%Y-%m-%d') if request.base_date else datetime.now()
        
        for i, horizon in enumerate(['T+1', 'T+2', 'T+3', 'T+4'][:request.days]):
            future_date = base_date + timedelta(days=i+1)
            
            horizon_info = {
                'horizon': i + 1,
                'future_dow': future_date.weekday(),
                'future_month': future_date.month,
                'future_temp': current_data.get('temperature', 20.0),
                'future_hum': current_data.get('humidity', 50.0)
            }
            
            features = create_features_for_prediction(
                sequence, product_stats, product_type,
                current_data, horizon_info
            ).reshape(1, -1)
            
            probas, quantities = predict_with_probability(features, embeddings, horizon)
            
            predictions.append({
                'date': future_date.strftime('%Y-%m-%d'),
                'horizon': horizon,
                'product_type': product_type,
                'probability': round(float(probas[0]), 2),
                'quantity': int(quantities[0]),
                'recommend': '✅ 발주 권장' if probas[0] >= 0.5 else '❌ 발주 불필요'
            })
        
        # 요약 통계
        total_qty = sum(p['quantity'] for p in predictions)
        avg_prob = np.mean([p['probability'] for p in predictions])
        high_conf = sum(1 for p in predictions if p['probability'] >= 0.7)
        
        return {
            "success": True,
            "data": {
                "product_code": request.product_code,
                "product_type": product_type,
                "predictions": predictions,
                "summary": {
                    "total_quantity": total_qty,
                    "avg_probability": round(avg_prob, 2),
                    "high_confidence_days": high_conf,
                    "recommendation": f"총 {total_qty}개 예상, 평균 확률 {int(avg_prob*100)}%"
                }
            }
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"예측 실패: {str(e)}")


@app.get("/api/model/status")
def get_model_status():
    """모델 상태 확인"""
    if not model_loader.is_loaded():
        return {
            "model_loaded": False,
            "error": "모델 파일 없음",
            "searched_paths": model_loader.model_paths
        }
    
    return {
        "model_loaded": True,
        "version": model_loader.package.get('version', 'unknown'),
        "performance": model_loader.package.get('performance', {}),
        "device": str(model_loader.device),
        "horizons": list(model_loader.package.get('models', {}).keys()),
        "encoder_loaded": model_loader.encoder is not None
    }


# ============================================================================
# 헬퍼 함수 (실제 구현 필요)
# ============================================================================

def get_product_sequence_from_db(product_code: str) -> List[float]:
    """
    데이터베이스에서 과거 14일 시퀀스 조회
    
    TODO: 실제 데이터베이스 연결 구현
    - Order 테이블에서 날짜별 집계
    - 빈 날짜는 0으로 채움
    """
    # 임시 더미 데이터
    return []


def calculate_product_stats(sequence: List[float]) -> Dict:
    """시퀀스에서 통계 계산"""
    if not sequence:
        return {'mean': 0, 'std': 0, 'max': 0, 'cv': 0, 'zero_ratio': 0}
    
    arr = np.array(sequence)
    mean_val = np.mean(arr)
    std_val = np.std(arr)
    
    return {
        'mean': mean_val,
        'std': std_val,
        'max': np.max(arr),
        'cv': std_val / (mean_val + 1e-6),
        'zero_ratio': (arr == 0).mean()
    }


def get_current_data(product_code: str) -> Dict:
    """
    현재 데이터 조회
    
    TODO: 실제 구현
    - 최근 주문 데이터
    - 작년 동기 데이터
    - 날씨 정보
    """
    return {}


# ============================================================================
# 서버 실행
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 80)
    print("🚀 SmartFlow AI Server v3.0 - Custom Final Model")
    print("=" * 80)
    uvicorn.run(app, host="0.0.0.0", port=8001)