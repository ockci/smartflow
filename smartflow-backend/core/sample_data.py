"""
샘플 데이터 생성기
사용자에게 예시 데이터를 제공하는 모듈
"""
import pandas as pd
from datetime import datetime, timedelta
import random
from io import BytesIO


def create_sample_orders(count: int = 100) -> BytesIO:
    """
    샘플 주문 데이터 생성 (엑셀)
    
    Args:
        count: 생성할 주문 개수
    
    Returns:
        BytesIO: 엑셀 파일 바이너리
    """
    start_date = datetime.now() - timedelta(days=90)
    
    # 샘플 제품 목록
    products = [
        ("PROD001", "플라스틱 용기 A형"),
        ("PROD002", "플라스틱 뚜껑 B형"),
        ("PROD003", "사출 부품 C형"),
        ("PROD004", "자동차 부품 D형"),
        ("PROD005", "전자제품 케이스"),
    ]
    
    data = []
    for i in range(count):
        product = random.choice(products)
        order_date = start_date + timedelta(days=random.randint(0, 90))
        due_date = order_date + timedelta(days=random.randint(7, 30))
        
        data.append({
            "주문번호": f"ORD-2024-{1000+i}",
            "제품코드": product[0],
            "제품명": product[1],
            "수량": random.randint(100, 2000),
            "주문일": order_date.strftime("%Y-%m-%d"),
            "납기일": due_date.strftime("%Y-%m-%d"),
            "우선순위": random.randint(1, 5),
            "상태": random.choice(["pending", "confirmed", "delivered"]),
        })
    
    df = pd.DataFrame(data)
    
    # 엑셀 생성
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='주문데이터')
    output.seek(0)
    
    return output


def create_sample_products(count: int = 20) -> BytesIO:
    """
    샘플 제품 데이터 생성
    """
    data = []
    for i in range(count):
        data.append({
            "제품코드": f"PROD{str(i+1).zfill(3)}",
            "제품명": f"사출제품 {chr(65+i)}형",
            "판매단가": random.randint(1000, 10000),
            "제조원가": random.randint(500, 5000),
            "필요톤수": random.choice([50, 100, 150, 200]),
            "사이클타임(초)": random.randint(20, 120),
            "캐비티수": random.randint(1, 8),
            "단위": "개",
            "최소재고": random.randint(100, 500),
        })
    
    df = pd.DataFrame(data)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='제품정보')
    output.seek(0)
    
    return output


def create_sample_equipment(count: int = 5) -> BytesIO:
    """
    샘플 설비 데이터 생성
    """
    data = []
    for i in range(count):
        data.append({
            "설비ID": f"{i+1}호기",
            "설비명": f"사출기-{i+1}",
            "톤수": random.choice([50, 100, 150, 200, 250]),
            "시간당생산량": random.randint(20, 100),
            "운영시작": "08:00",
            "운영종료": "18:00",
            "상태": "active",
        })
    
    df = pd.DataFrame(data)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='설비정보')
    output.seek(0)
    
    return output