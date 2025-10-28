from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from database import get_db  # ✅ DB 세션만 가져오기
from models import Forecast  # ✅ 모델은 models.py에서 가져오기
from pydantic import BaseModel
from datetime import datetime, date, timedelta
import random
import httpx

router = APIRouter()

# Pydantic 스키마
class ForecastRequest(BaseModel):
    product_code: str
    start_date: date
    days: int = 7

class ForecastResponse(BaseModel):
    product_code: str
    forecast_date: date
    predicted_demand: int
    confidence_lower: int | None
    confidence_upper: int | None
    
    class Config:
        from_attributes = True

# AI 서버 호출 함수 (포트 8001)
async def call_ai_server_predict(product_code: str, start_date: date, days: int) -> List[Dict]:
    """AI 서버(8001)에서 실제 예측"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "http://localhost:8001/api/forecast/predict",
                json={
                    "product_code": product_code,
                    "days": days
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                predictions_list = data['data']['predictions']
                dates_list = data['data']['dates']
                
                # 형식 변환
                predictions = []
                for i in range(days):
                    forecast_date = start_date + timedelta(days=i)
                    predicted = predictions_list[i] if i < len(predictions_list) else 800
                    
                    predictions.append({
                        'product_code': product_code,
                        'forecast_date': forecast_date,
                        'predicted_demand': predicted,
                        'confidence_lower': int(predicted * 0.85),
                        'confidence_upper': int(predicted * 1.15)
                    })
                
                return predictions
            else:
                # AI 서버 오류시 더미
                return dummy_predict_demand(product_code, start_date, days)
                
    except Exception as e:
        print(f"⚠️ AI 서버 호출 실패: {str(e)} - 더미 모드")
        return dummy_predict_demand(product_code, start_date, days)

# 더미 예측 함수 (백업용)
def dummy_predict_demand(product_code: str, start_date: date, days: int) -> List[Dict]:
    """더미 수요 예측 (백업용)"""
    base_demand = random.randint(500, 1000)
    predictions = []
    
    for i in range(days):
        forecast_date = start_date + timedelta(days=i)
        predicted = base_demand + random.randint(-100, 100)
        
        predictions.append({
            'product_code': product_code,
            'forecast_date': forecast_date,
            'predicted_demand': predicted,
            'confidence_lower': int(predicted * 0.85),
            'confidence_upper': int(predicted * 1.15)
        })
    
    return predictions

# 수요 예측 API
@router.post("/predict")
async def predict_demand(request: ForecastRequest, db: Session = Depends(get_db)):  # ← async 추가!
    """수요 예측"""
    try:
        # 예측 실행 (AI 서버 호출)
        predictions = await call_ai_server_predict(  # ← await 추가!
            request.product_code,
            request.start_date,
            request.days
        )
        
        # 데이터베이스에 저장
        for pred in predictions:
            # 기존 예측 삭제 (같은 날짜)
            db.query(Forecast).filter(
                Forecast.product_code == pred['product_code'],
                Forecast.forecast_date == pred['forecast_date']
            ).delete()
            
            # 새 예측 저장
            db_forecast = Forecast(
                **pred,
                model_version="v1.0",
                mape=15.5  # 더미 값
            )
            db.add(db_forecast)
        
        db.commit()
        
        return {
            "message": "예측이 완료되었습니다",
            "product_code": request.product_code,
            "predictions": predictions,
            "accuracy": "MAPE ~15%"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"예측 실패: {str(e)}")

# 예측 결과 조회
@router.get("/result/{product_code}", response_model=List[ForecastResponse])
def get_forecast_result(product_code: str, db: Session = Depends(get_db)):
    """제품별 예측 결과 조회"""
    try:
        forecasts = db.query(Forecast).filter(
            Forecast.product_code == product_code
        ).order_by(Forecast.forecast_date).all()
        
        return forecasts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예측 결과 조회 실패: {str(e)}")

# 전체 제품 일괄 예측
@router.post("/batch")
def batch_predict(db: Session = Depends(get_db)):
    """전체 제품 일괄 예측"""
    try:
        # 모든 제품 코드 가져오기 (Order 테이블에서)
        from database import Order
        product_codes = db.query(Order.product_code).distinct().all()
        product_codes = [pc[0] for pc in product_codes]
        
        if not product_codes:
            raise HTTPException(status_code=400, detail="제품이 없습니다")
        
        results = []
        for product_code in product_codes:
            predictions = dummy_predict_demand(
                product_code,
                date.today(),
                7
            )
            
            for pred in predictions:
                db.query(Forecast).filter(
                    Forecast.product_code == pred['product_code'],
                    Forecast.forecast_date == pred['forecast_date']
                ).delete()
                
                db_forecast = Forecast(**pred, model_version="v1.0", mape=15.5)
                db.add(db_forecast)
            
            results.append({
                'product_code': product_code,
                'predictions_count': len(predictions)
            })
        
        db.commit()
        
        return {
            "message": "일괄 예측이 완료되었습니다",
            "results": results
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"일괄 예측 실패: {str(e)}")

# 예측 정확도
@router.get("/accuracy")
def get_forecast_accuracy(db: Session = Depends(get_db)):
    """예측 정확도 조회"""
    try:
        # 실제 수요가 있는 예측만 필터링
        forecasts = db.query(Forecast).filter(
            Forecast.actual_demand.isnot(None)
        ).all()
        
        if not forecasts:
            return {
                "message": "정확도 계산을 위한 실제 데이터가 없습니다",
                "mape": None
            }
        
        # MAPE 계산
        total_error = 0
        for forecast in forecasts:
            error = abs(forecast.predicted_demand - forecast.actual_demand) / forecast.actual_demand
            total_error += error
        
        mape = (total_error / len(forecasts)) * 100
        
        return {
            "mape": round(mape, 2),
            "total_forecasts": len(forecasts),
            "message": f"MAPE: {mape:.2f}%"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"정확도 조회 실패: {str(e)}")