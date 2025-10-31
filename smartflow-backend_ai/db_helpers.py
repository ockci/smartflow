"""
SmartFlow - 데이터베이스 헬퍼 함수
AI 모델을 위한 시계열 데이터 추출

파일 위치: smartflow-backend/api/db_helpers.py (또는 ai_server.py에 통합)
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import pandas as pd
import numpy as np
from models.models import Order, Product


# ============================================================================
# 시퀀스 데이터 추출
# ============================================================================

def get_product_sequence(
    db: Session,
    user_id: int,
    product_code: str,
    base_date: datetime,
    seq_len: int = 14
) -> List[float]:
    """
    제품의 과거 N일 수주량 시퀀스 추출
    
    Args:
        db: 데이터베이스 세션
        user_id: 사용자 ID
        product_code: 제품 코드
        base_date: 기준 날짜
        seq_len: 시퀀스 길이 (기본 14일)
    
    Returns:
        List[float]: [day1, day2, ..., day14] 수주량
                     최근 데이터가 뒤쪽 (day14 = 기준일)
    
    Example:
        >>> seq = get_product_sequence(db, 1, "Product_c0", datetime(2025, 11, 1), 14)
        >>> seq
        [120, 0, 135, 140, 0, 150, 145, 130, 155, 0, 140, 145, 150, 148]
         ↑                                                             ↑
         14일 전                                                      오늘
    """
    start_date = base_date - timedelta(days=seq_len - 1)
    
    # Order 테이블에서 날짜별 집계
    query = db.query(
        func.date(Order.due_date).label('date'),
        func.sum(Order.quantity).label('total_quantity')
    ).filter(
        Order.user_id == user_id,
        Order.product_code == product_code,
        Order.due_date >= start_date.date(),
        Order.due_date <= base_date.date()
    ).group_by(
        func.date(Order.due_date)
    ).order_by(
        func.date(Order.due_date)
    )
    
    results = query.all()
    
    # 날짜별 딕셔너리 생성
    date_quantities = {
        r.date: float(r.total_quantity) for r in results
    }
    
    # 시퀀스 생성 (빈 날짜는 0으로 채움)
    sequence = []
    for i in range(seq_len):
        date = (start_date + timedelta(days=i)).date()
        quantity = date_quantities.get(date, 0.0)
        sequence.append(quantity)
    
    return sequence


# ============================================================================
# 제품 통계 계산
# ============================================================================

def calculate_product_stats(
    db: Session,
    user_id: int,
    product_code: str,
    days: int = 90
) -> Dict:
    """
    제품의 과거 통계 계산 (제품 분류용)
    
    Args:
        db: 데이터베이스 세션
        user_id: 사용자 ID
        product_code: 제품 코드
        days: 통계 기간 (기본 90일)
    
    Returns:
        {
            'mean': 평균 일일 수주량,
            'std': 표준편차,
            'max': 최대 수주량,
            'cv': 변동계수 (CV),
            'zero_ratio': Zero 비율
        }
    """
    start_date = datetime.now() - timedelta(days=days)
    
    # 날짜별 집계
    query = db.query(
        func.date(Order.due_date).label('date'),
        func.sum(Order.quantity).label('total_quantity')
    ).filter(
        Order.user_id == user_id,
        Order.product_code == product_code,
        Order.due_date >= start_date.date()
    ).group_by(
        func.date(Order.due_date)
    )
    
    results = query.all()
    
    if not results:
        return {
            'mean': 0,
            'std': 0,
            'max': 0,
            'cv': 0,
            'zero_ratio': 1.0
        }
    
    # 전체 날짜 범위 생성 (0 포함)
    all_dates = pd.date_range(start=start_date.date(), end=datetime.now().date())
    date_quantities = {r.date: float(r.total_quantity) for r in results}
    quantities = [date_quantities.get(date.date(), 0.0) for date in all_dates]
    
    arr = np.array(quantities)
    mean_val = np.mean(arr)
    std_val = np.std(arr)
    
    return {
        'mean': float(mean_val),
        'std': float(std_val),
        'max': float(np.max(arr)),
        'cv': float(std_val / (mean_val + 1e-6)),
        'zero_ratio': float((arr == 0).mean())
    }


# ============================================================================
# 현재 데이터 조회
# ============================================================================

def get_current_data(
    db: Session,
    user_id: int,
    product_code: str,
    base_date: datetime
) -> Dict:
    """
    현재(T일) 데이터 조회
    
    Returns:
        {
            't_day_quantity': T일 수주량,
            'last_year_quantity': 작년 동일 날짜 수주량,
            'temperature': 기온 (기본값 20.0),
            'humidity': 습도 (기본값 50.0),
            'dow': 요일 (0=월요일),
            'is_weekday': 주중 여부 (1/0),
            'month': 월 (1-12)
        }
    """
    # T일 수주량
    t_day = db.query(
        func.sum(Order.quantity)
    ).filter(
        Order.user_id == user_id,
        Order.product_code == product_code,
        Order.due_date == base_date.date()
    ).scalar() or 0
    
    # 작년 동일 날짜
    last_year_date = base_date - timedelta(days=365)
    last_year = db.query(
        func.sum(Order.quantity)
    ).filter(
        Order.user_id == user_id,
        Order.product_code == product_code,
        Order.due_date == last_year_date.date()
    ).scalar() or 0
    
    return {
        't_day_quantity': float(t_day),
        'last_year_quantity': float(last_year),
        'temperature': 20.0,  # TODO: 실제 날씨 API 연동
        'humidity': 50.0,     # TODO: 실제 날씨 API 연동
        'dow': base_date.weekday(),
        'is_weekday': 1 if base_date.weekday() < 5 else 0,
        'month': base_date.month
    }


# ============================================================================
# 배치 조회 (성능 최적화)
# ============================================================================

def get_multiple_sequences(
    db: Session,
    user_id: int,
    product_codes: List[str],
    base_date: datetime,
    seq_len: int = 14
) -> Dict[str, List[float]]:
    """
    여러 제품의 시퀀스를 한 번에 조회 (배치 최적화)
    
    Returns:
        {
            'Product_c0': [120, 0, 135, ...],
            'Product_c6': [200, 210, 205, ...],
            ...
        }
    """
    start_date = base_date - timedelta(days=seq_len - 1)
    
    # 한 번의 쿼리로 모든 제품 조회
    query = db.query(
        Order.product_code,
        func.date(Order.due_date).label('date'),
        func.sum(Order.quantity).label('total_quantity')
    ).filter(
        Order.user_id == user_id,
        Order.product_code.in_(product_codes),
        Order.due_date >= start_date.date(),
        Order.due_date <= base_date.date()
    ).group_by(
        Order.product_code,
        func.date(Order.due_date)
    )
    
    results = query.all()
    
    # 제품별로 그룹화
    product_data = {}
    for r in results:
        if r.product_code not in product_data:
            product_data[r.product_code] = {}
        product_data[r.product_code][r.date] = float(r.total_quantity)
    
    # 각 제품의 시퀀스 생성
    sequences = {}
    for product_code in product_codes:
        date_quantities = product_data.get(product_code, {})
        sequence = []
        for i in range(seq_len):
            date = (start_date + timedelta(days=i)).date()
            quantity = date_quantities.get(date, 0.0)
            sequence.append(quantity)
        sequences[product_code] = sequence
    
    return sequences


# ============================================================================
# 제품 마스터 정보
# ============================================================================

def get_product_info(db: Session, user_id: int, product_code: str) -> Dict:
    """
    제품 마스터 정보 조회
    
    Returns:
        {
            'id': 제품 ID,
            'product_code': 제품 코드,
            'product_name': 제품명,
            'unit_price': 단가,
            'required_tonnage': 필요 톤수,
            ...
        }
    """
    product = db.query(Product).filter(
        Product.user_id == user_id,
        Product.product_code == product_code
    ).first()
    
    if not product:
        return None
    
    return {
        'id': product.id,
        'product_code': product.product_code,
        'product_name': product.product_name,
        'unit_price': product.unit_price,
        'unit_cost': product.unit_cost,
        'required_tonnage': product.required_tonnage,
        'cycle_time': product.cycle_time,
        'cavity_count': product.cavity_count
    }


# ============================================================================
# 사용 예제
# ============================================================================

def example_usage(db: Session, user_id: int):
    """
    헬퍼 함수 사용 예제
    """
    product_code = "Product_c0"
    base_date = datetime.now()
    
    # 1. 14일 시퀀스 조회
    sequence = get_product_sequence(db, user_id, product_code, base_date, 14)
    print(f"시퀀스: {sequence}")
    
    # 2. 제품 통계 계산
    stats = calculate_product_stats(db, user_id, product_code, 90)
    print(f"통계: {stats}")
    
    # 3. 제품 분류
    from api.ai_helpers import classify_product  # ai_server.py의 함수
    product_type = classify_product(stats)
    print(f"제품 타입: {product_type}")
    
    # 4. 현재 데이터
    current = get_current_data(db, user_id, product_code, base_date)
    print(f"현재 데이터: {current}")
    
    # 5. 배치 조회 (여러 제품)
    product_codes = ["Product_c0", "Product_c6", "Product_e0"]
    sequences = get_multiple_sequences(db, user_id, product_codes, base_date, 14)
    print(f"배치 시퀀스: {list(sequences.keys())}")


# ============================================================================
# 캐싱 (선택적 - Redis 사용 시)
# ============================================================================

def get_cached_sequence(
    cache_key: str,
    db: Session,
    user_id: int,
    product_code: str,
    base_date: datetime,
    seq_len: int = 14
) -> List[float]:
    """
    Redis 캐싱을 활용한 시퀀스 조회
    
    캐시 키: f"seq:{user_id}:{product_code}:{base_date.date()}"
    TTL: 1시간
    """
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, decode_responses=True)
        
        # 캐시 확인
        cached = r.get(cache_key)
        if cached:
            return eval(cached)  # 주의: 실제로는 json.loads 사용
        
        # 캐시 없으면 DB 조회
        sequence = get_product_sequence(db, user_id, product_code, base_date, seq_len)
        
        # 캐시 저장 (1시간)
        r.setex(cache_key, 3600, str(sequence))
        
        return sequence
    
    except Exception as e:
        print(f"캐시 오류: {e}")
        # 캐시 실패 시 직접 조회
        return get_product_sequence(db, user_id, product_code, base_date, seq_len)


# ============================================================================
# 데이터 검증
# ============================================================================

def validate_sequence_data(
    db: Session,
    user_id: int,
    product_code: str,
    min_days: int = 14
) -> Tuple[bool, str]:
    """
    예측을 위한 데이터 충분성 검증
    
    Returns:
        (is_valid, message)
        - is_valid: True/False
        - message: 검증 결과 메시지
    """
    # 전체 데이터 개수
    total_orders = db.query(func.count(Order.id)).filter(
        Order.user_id == user_id,
        Order.product_code == product_code
    ).scalar()
    
    if total_orders == 0:
        return False, "주문 데이터가 없습니다"
    
    # 최근 데이터 확인
    latest_order = db.query(Order).filter(
        Order.user_id == user_id,
        Order.product_code == product_code
    ).order_by(Order.due_date.desc()).first()
    
    if not latest_order:
        return False, "최근 주문 데이터가 없습니다"
    
    days_ago = (datetime.now().date() - latest_order.due_date).days
    if days_ago > 30:
        return False, f"최근 주문이 {days_ago}일 전입니다 (30일 이상 오래됨)"
    
    # 날짜 범위
    start_date = datetime.now() - timedelta(days=min_days)
    recent_count = db.query(func.count(Order.id)).filter(
        Order.user_id == user_id,
        Order.product_code == product_code,
        Order.due_date >= start_date.date()
    ).scalar()
    
    if recent_count < 3:
        return False, f"최근 {min_days}일간 주문이 {recent_count}건뿐입니다 (최소 3건 필요)"
    
    return True, f"검증 통과 (총 {total_orders}건, 최근 {recent_count}건)"


# ============================================================================
# 제품 목록 조회
# ============================================================================

def get_predictable_products(
    db: Session,
    user_id: int,
    min_orders: int = 10
) -> List[str]:
    """
    예측 가능한 제품 목록 조회
    
    Args:
        min_orders: 최소 주문 건수
    
    Returns:
        예측 가능한 제품 코드 리스트
    """
    query = db.query(
        Order.product_code,
        func.count(Order.id).label('order_count')
    ).filter(
        Order.user_id == user_id
    ).group_by(
        Order.product_code
    ).having(
        func.count(Order.id) >= min_orders
    ).order_by(
        func.count(Order.id).desc()
    )
    
    results = query.all()
    return [r.product_code for r in results]
