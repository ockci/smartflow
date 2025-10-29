"""
SmartFlow 엑셀 파싱 모듈
엑셀 파일 업로드 및 검증
"""
import pandas as pd
from io import BytesIO
from fastapi import UploadFile, HTTPException
from typing import List, Dict
from datetime import datetime

async def parse_equipment_excel(file: UploadFile) -> List[Dict]:
    """
    설비 정보 엑셀 파싱
    
    필수 컬럼:
    - 사출기번호: 설비 ID (예: "1호기", "2호기")
    - 톤수: 사출기 톤수 (예: 100, 150, 200)
    - 가동시간_시작: 시작 시간 (예: "08:00")
    - 가동시간_종료: 종료 시간 (예: "18:00")
    - 생산능력_개_시간: 시간당 생산 개수 (예: 50)
    
    Returns:
        설비 정보 리스트
    """
    try:
        # 파일 읽기
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # 필수 컬럼 체크
        required_cols = ['사출기번호', '톤수', '가동시간_시작', '가동시간_종료', '생산능력_개_시간']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"필수 컬럼 누락: {', '.join(missing)}"
            )
        
        # 데이터 검증 및 변환
        equipment_list = []
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # 데이터 타입 검증
                if not isinstance(row['톤수'], (int, float)) or row['톤수'] <= 0:
                    errors.append(f"{idx+2}번째 줄: 톤수는 양수여야 합니다")
                    continue
                
                if not isinstance(row['생산능력_개_시간'], (int, float)) or row['생산능력_개_시간'] <= 0:
                    errors.append(f"{idx+2}번째 줄: 생산능력은 양수여야 합니다")
                    continue
                
                # 시간 형식 검증
                start_time = str(row['가동시간_시작']).strip()
                end_time = str(row['가동시간_종료']).strip()
                
                equipment_list.append({
                    'machine_id': str(row['사출기번호']).strip(),
                    'machine_name': str(row.get('설비명', '')).strip() or None,
                    'tonnage': int(row['톤수']),
                    'capacity_per_hour': int(row['생산능력_개_시간']),
                    'shift_start': start_time,
                    'shift_end': end_time,
                    'status': 'active'
                })
            except Exception as e:
                errors.append(f"{idx+2}번째 줄: {str(e)}")
        
        if errors:
            raise HTTPException(
                status_code=400,
                detail={"message": "데이터 검증 실패", "errors": errors}
            )
        
        return equipment_list
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"엑셀 파일 처리 중 오류: {str(e)}"
        )

async def parse_order_excel(file: UploadFile) -> List[Dict]:
    """
    주문 정보 엑셀 파싱
    
    필수 컬럼:
    - 주문번호: 주문 ID (예: "ORD-001")
    - 제품코드: 제품 코드 (예: "Product_c0")
    - 수량: 주문 수량 (예: 1000)
    - 납기일: 납품 기한 (예: "2025-11-15")
    
    선택 컬럼:
    - 제품명: 제품 이름
    - 우선순위: 1~5 (기본값: 1)
    - 긴급여부: True/False (기본값: False)
    
    Returns:
        주문 정보 리스트
    """
    try:
        # 파일 읽기
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # 필수 컬럼 체크
        required_cols = ['주문번호', '제품코드', '수량', '납기일']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"필수 컬럼 누락: {', '.join(missing)}"
            )
        
        # 날짜 파싱
        df['납기일'] = pd.to_datetime(df['납기일'], errors='coerce')
        
        # 데이터 검증 및 변환
        orders = []
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # 수량 검증
                if not isinstance(row['수량'], (int, float)) or row['수량'] <= 0:
                    errors.append(f"{idx+2}번째 줄: 수량은 양수여야 합니다")
                    continue
                
                # 날짜 검증
                if pd.isna(row['납기일']):
                    errors.append(f"{idx+2}번째 줄: 납기일 형식이 잘못되었습니다")
                    continue
                
                # 우선순위 검증
                priority = int(row.get('우선순위', 1))
                if priority < 1 or priority > 5:
                    priority = 1
                
                orders.append({
                    'order_number': str(row['주문번호']).strip(),
                    'product_code': str(row['제품코드']).strip(),
                    'product_name': str(row.get('제품명', '')).strip() or None,
                    'quantity': int(row['수량']),
                    'due_date': row['납기일'].strftime('%Y-%m-%d'),
                    'priority': priority,
                    'is_urgent': bool(row.get('긴급여부', False)),
                    'notes': str(row.get('비고', '')).strip() or None
                })
            except Exception as e:
                errors.append(f"{idx+2}번째 줄: {str(e)}")
        
        if errors:
            raise HTTPException(
                status_code=400,
                detail={"message": "데이터 검증 실패", "errors": errors}
            )
        
        return orders
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"엑셀 파일 처리 중 오류: {str(e)}"
        )

def create_equipment_template() -> bytes:
    """
    설비 정보 엑셀 템플릿 생성
    
    Returns:
        엑셀 파일 바이트
    """
    df = pd.DataFrame({
        '사출기번호': ['1호기', '2호기', '3호기'],
        '설비명': ['소형 사출기', '중형 사출기', '대형 사출기'],
        '톤수': [100, 150, 200],
        '생산능력_개_시간': [50, 80, 100],
        '가동시간_시작': ['08:00', '08:00', '08:00'],
        '가동시간_종료': ['18:00', '18:00', '20:00']
    })
    
    output = BytesIO()
    df.to_excel(output, index=False, engine='openpyxl')
    output.seek(0)
    return output.getvalue()

def create_order_template() -> bytes:
    """
    주문 정보 엑셀 템플릿 생성
    
    Returns:
        엑셀 파일 바이트
    """
    df = pd.DataFrame({
        '주문번호': ['ORD-001', 'ORD-002', 'ORD-003'],
        '제품코드': ['Product_c0', 'Product_c6', 'Product_c15'],
        '제품명': ['전자부품 A-100', '자동차 부품 B-200', '가전 부품 C-300'],
        '수량': [1000, 800, 1200],
        '납기일': ['2025-11-15', '2025-11-20', '2025-11-25'],
        '우선순위': [1, 2, 1],
        '긴급여부': [False, False, True],
        '비고': ['', '', '긴급 주문']
    })
    
    output = BytesIO()
    df.to_excel(output, index=False, engine='openpyxl')
    output.seek(0)
    return output.getvalue()

def create_product_template() -> bytes:
    """
    제품 정보 엑셀 템플릿 생성
    
    Returns:
        엑셀 파일 바이트
    """
    df = pd.DataFrame({
        '제품코드': ['PROD-001', 'PROD-002', 'PROD-003'],
        '제품명': ['전자부품 A', '자동차 부품 B', '가전 부품 C'],
        '사이클타임(초)': [30, 45, 60],
        '캐비티수': [4, 2, 8],
        '필요톤수': [100, 150, 200],
        '원자재명': ['플라스틱 A', '플라스틱 B', '플라스틱 C'],
        '원자재_단위당_사용량(kg)': [0.5, 0.8, 0.3],
        '비고': ['', '', '']
    })
    
    output = BytesIO()
    df.to_excel(output, index=False, engine='openpyxl')
    output.seek(0)
    return output.getvalue()