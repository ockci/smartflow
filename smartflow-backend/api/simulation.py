# simulation.py
# smartflow-backend/api/simulation.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
import requests

from database.database import get_db
from models.models import Order, Product, User
from api.auth import get_current_user

router = APIRouter()


@router.get("/run/{product_id}")
def run_simulation(
    product_id: int,
    scenario: str = "normal",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    완전 AI 기반 재고 시뮬레이션
    모든 계산을 AI 서버(8001)에서 수행
    """
    
    # 1. 제품 정보 조회
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.user_id == current_user.id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
    
    print(f"🎯 시뮬레이션 시작: {product.product_name} ({product.product_code})")
    
    # 2. 과거 14일 주문 데이터 조회
    fourteen_days_ago = datetime.now() - timedelta(days=14)
    
    past_orders = db.query(
        func.date(Order.created_at).label('order_date'),
        func.sum(Order.quantity).label('total_quantity')
    ).filter(
        Order.product_code == product.product_code,
        Order.user_id == current_user.id,
        Order.created_at >= fourteen_days_ago
    ).group_by(
        func.date(Order.created_at)
    ).all()
    
    # 14일 배열 생성
    historical_usage = []
    for i in range(14):
        target_date = (datetime.now() - timedelta(days=13-i)).date()
        matching_order = next((o for o in past_orders if o.order_date == target_date), None)
        historical_usage.append(float(matching_order.total_quantity) if matching_order else 0.0)
    
    print(f"📊 과거 14일 데이터: {historical_usage}")
    
    # 3. 초기 재고 설정
    initial_stock = getattr(product, 'current_stock', None)
    if initial_stock is None:
        # Product 테이블에 current_stock이 없으면 계산
        total_orders = db.query(func.sum(Order.quantity)).filter(
            Order.product_code == product.product_code,
            Order.user_id == current_user.id
        ).scalar() or 0
        initial_stock = max(0, 1000 - total_orders)  # 초기 1000에서 차감
    
    lead_time = getattr(product, 'lead_time', 7)
    
    print(f"💰 초기 재고: {initial_stock}, 리드타임: {lead_time}일")
    
    # 4. AI 서버에 전체 분석 요청
    try:
        print(f"🤖 AI 서버로 전체 분석 요청...")
        ai_response = requests.post(
            "http://localhost:8001/api/inventory/full-analysis",
            json={
                "product_code": product.product_code,
                "scenario": scenario,
                "historical_data": historical_usage,
                "initial_stock": initial_stock,
                "lead_time": lead_time
            },
            timeout=30
        )
        
        if ai_response.status_code == 200:
            ai_data = ai_response.json()
            print(f"✅ AI 분석 성공!")
            print(f"   - 현재 재고: {ai_data['current_stock']}")
            print(f"   - 안전 재고: {ai_data['safety_stock']}")
            print(f"   - AI 모델 사용: {ai_data['ai_model']['used']}")
            
            # AI 응답을 프론트엔드 형식으로 변환
            return {
                "product_id": product.id,
                "product_name": product.product_name,
                "current_stock": ai_data['current_stock'],
                "safety_stock": ai_data['safety_stock'],
                "ai_predictions": [
                    {
                        "date": p['date'],
                        "predicted_usage": p['quantity'],
                        "confidence_lower": p['confidence_lower'],
                        "confidence_upper": p['confidence_upper']
                    }
                    for p in ai_data['predictions']
                ],
                "scenario_results": ai_data['simulation'],
                "alerts": ai_data['alerts'],
                "summary": ai_data['summary']
            }
        else:
            print(f"❌ AI 서버 오류: {ai_response.status_code}")
            raise HTTPException(status_code=500, detail=f"AI 서버 오류: {ai_response.text}")
    
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503, 
            detail="AI 서버(8001)에 연결할 수 없습니다. AI 서버가 실행 중인지 확인하세요."
        )
    
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="AI 분석 시간 초과")
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"시뮬레이션 실패: {str(e)}")


@router.get("/eligible-products")
def get_eligible_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """AI 시뮬레이션 가능한 제품 목록 (90일 이상 데이터)"""
    cutoff_date = datetime.now() - timedelta(days=90)
    
    products_with_data = db.query(
        Order.product_code,
        func.count(Order.id).label('order_count'),
        func.min(Order.created_at).label('first_order'),
        func.max(Order.created_at).label('last_order')
    ).filter(
        Order.user_id == current_user.id
    ).group_by(
        Order.product_code
    ).having(
        func.min(Order.created_at) <= cutoff_date
    ).all()
    
    result = []
    for data in products_with_data:
        product = db.query(Product).filter(
            Product.product_code == data.product_code,
            Product.user_id == current_user.id
        ).first()
        
        if product:
            days_span = (data.last_order - data.first_order).days
            result.append({
                "id": product.id,
                "product_code": product.product_code,
                "product_name": product.product_name,
                "order_count": data.order_count,
                "days_span": days_span,
                "eligible": days_span >= 90
            })
    
    eligible = [r for r in result if r['eligible']]
    
    return {
        "total_products": len(result),
        "eligible_count": len(eligible),
        "products": eligible
    }