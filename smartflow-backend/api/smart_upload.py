"""
스마트 주문 업로드 시스템
- CSV/Excel 모두 지원
- 컬럼 자동 인식 + 수동 매핑
- 회사별 맞춤 포맷 지원
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import pandas as pd
from datetime import datetime
import io
from database.database import get_db
from models.models import Order, User, Product
from api.auth import get_current_user

router = APIRouter(tags=["orders-upload"])

# ============================================
# 📊 스키마
# ============================================

class ColumnMapping(BaseModel):
    """컬럼 매핑 정보"""
    order_number: Optional[str] = None  # 주문번호 컬럼명
    product_code: str  # 제품코드 컬럼명 (필수)
    product_name: Optional[str] = None  # 제품명 컬럼명
    quantity: str  # 수량 컬럼명 (필수)
    order_date: str  # 주문일 컬럼명 (필수)
    due_date: Optional[str] = None  # 납기일 컬럼명
    priority: Optional[str] = None  # 우선순위 컬럼명
    status: Optional[str] = None  # 상태 컬럼명

class UploadPreviewResponse(BaseModel):
    """업로드 미리보기 응답"""
    columns: List[str]  # 파일의 컬럼 목록
    sample_data: List[Dict[str, Any]]  # 샘플 데이터 (최대 5개)
    total_rows: int  # 전체 행 수
    suggested_mapping: ColumnMapping  # AI 추천 매핑
    session_id: str  # 임시 세션 ID

class ConfirmUploadRequest(BaseModel):
    """업로드 확정 요청"""
    session_id: str
    column_mapping: ColumnMapping

# ============================================
# 🧠 스마트 컬럼 매칭 (AI 추천)
# ============================================

class SmartColumnMatcher:
    """컬럼명을 분석해서 자동으로 매핑 추천"""
    
    # 각 필드별 가능한 컬럼명 패턴
    PATTERNS = {
        'product_code': [
            '제품코드', '품목코드', '품번', '제품번호', 'product_code', 'product code', 
            'item_code', 'item code', 'sku', 'part_number', '품목번호'
        ],
        'product_name': [
            '제품명', '품목명', '제품이름', 'product_name', 'product name', 
            'item_name', 'item name', '품명', '품목'
        ],
        'quantity': [
            '수량', '주문수량', '발주수량', 'quantity', 'qty', 'amount', 
            'order_quantity', 'order qty', '개수', '주문량'
        ],
        'order_date': [
            '주문일', '발주일', '주문날짜', '발주날짜', 'order_date', 'order date',
            'date', '날짜', '일자', 'order_time', '주문시간'
        ],
        'due_date': [
            '납기일', '납기', '예정일', 'due_date', 'due date', 'delivery_date',
            'delivery date', '납품일', '출고예정일'
        ],
        'order_number': [
            '주문번호', '발주번호', 'order_number', 'order number', 'order_no',
            'po_number', 'po number', '주문서번호'
        ]
    }
    
    @classmethod
    def suggest_mapping(cls, columns: List[str]) -> ColumnMapping:
        """컬럼명 리스트를 받아서 자동 매핑 추천"""
        
        # 컬럼명을 소문자로 변환 (대소문자 무시)
        columns_lower = [col.lower().strip() for col in columns]
        
        mapping = {}
        
        for field, patterns in cls.PATTERNS.items():
            matched = None
            for i, col in enumerate(columns_lower):
                for pattern in patterns:
                    if pattern.lower() in col or col in pattern.lower():
                        matched = columns[i]  # 원본 컬럼명 사용
                        break
                if matched:
                    break
            
            if matched:
                mapping[field] = matched
        
        # 필수 필드 체크
        if 'product_code' not in mapping:
            mapping['product_code'] = columns[0] if columns else None
        if 'quantity' not in mapping:
            # '수량'이 포함된 컬럼 찾기
            qty_col = next((col for col in columns if '수량' in col.lower() or 'qty' in col.lower()), None)
            mapping['quantity'] = qty_col or (columns[1] if len(columns) > 1 else None)
        if 'order_date' not in mapping:
            # '날짜'나 'date'가 포함된 컬럼 찾기
            date_col = next((col for col in columns if '날짜' in col.lower() or 'date' in col.lower()), None)
            mapping['order_date'] = date_col or (columns[2] if len(columns) > 2 else None)
        
        return ColumnMapping(**mapping)

# ============================================
# 📁 파일 파싱 (CSV/Excel)
# ============================================

class FileParser:
    """CSV와 Excel 파일을 파싱"""
    
    @staticmethod
    async def parse_file(file: UploadFile) -> pd.DataFrame:
        """파일 읽기 (CSV 또는 Excel)"""
        contents = await file.read()
        
        try:
            # Excel 시도
            if file.filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(io.BytesIO(contents))
            # CSV 시도 (여러 인코딩 자동 감지)
            elif file.filename.endswith('.csv'):
                # UTF-8 시도
                try:
                    df = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
                except:
                    # CP949 (한글 Windows) 시도
                    try:
                        df = pd.read_csv(io.BytesIO(contents), encoding='cp949')
                    except:
                        # EUC-KR 시도
                        df = pd.read_csv(io.BytesIO(contents), encoding='euc-kr')
            else:
                raise ValueError("지원하지 않는 파일 형식입니다")
            
            # 빈 행 제거
            df = df.dropna(how='all')
            
            # 컬럼명 정리 (공백 제거)
            df.columns = df.columns.str.strip()
            
            return df
            
        except Exception as e:
            raise ValueError(f"파일 파싱 실패: {str(e)}")

# ============================================
# 🎯 임시 세션 저장소
# ============================================

# 간단한 인메모리 저장소 (실제로는 Redis 사용 권장)
upload_sessions = {}

def create_session_id(user_id: int) -> str:
    """세션 ID 생성"""
    import hashlib
    import time
    timestamp = str(time.time())
    return hashlib.md5(f"{user_id}_{timestamp}".encode()).hexdigest()

# ============================================
# 🚀 API 엔드포인트
# ============================================

@router.post("/upload-preview")
async def preview_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Step 1: 파일 업로드 미리보기
    - 컬럼 목록 반환
    - 샘플 데이터 반환
    - AI 추천 매핑 반환
    """
    
    try:
        # 파일 파싱
        df = await FileParser.parse_file(file)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="빈 파일입니다")
        
        # 컬럼 목록
        columns = df.columns.tolist()
        
        # 샘플 데이터 (최대 5개)
        sample_data = df.head(5).fillna('').to_dict('records')
        
        # AI 추천 매핑
        suggested_mapping = SmartColumnMatcher.suggest_mapping(columns)
        
        # 세션 생성 및 데이터 임시 저장
        session_id = create_session_id(current_user.id)
        upload_sessions[session_id] = {
            'user_id': current_user.id,
            'dataframe': df,
            'timestamp': datetime.now()
        }
        
        return {
            "success": True,
            "data": {
                "columns": columns,
                "sample_data": sample_data,
                "total_rows": len(df),
                "suggested_mapping": suggested_mapping.dict(),
                "session_id": session_id
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"미리보기 실패: {str(e)}")

@router.post("/upload-confirm")
async def confirm_upload(
    request: ConfirmUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Step 2: 업로드 확정
    - 사용자가 확인한 매핑으로 데이터 저장
    """
    
    try:
        # 세션 확인
        if request.session_id not in upload_sessions:
            raise HTTPException(status_code=400, detail="세션이 만료되었습니다. 다시 업로드해주세요.")
        
        session = upload_sessions[request.session_id]
        
        # 권한 확인
        if session['user_id'] != current_user.id:
            raise HTTPException(status_code=403, detail="권한이 없습니다")
        
        df = session['dataframe']
        mapping = request.column_mapping
        
        # 필수 컬럼 확인
        if not mapping.product_code or not mapping.quantity or not mapping.order_date:
            raise HTTPException(
                status_code=400, 
                detail="제품코드, 수량, 주문일은 필수 입력입니다"
            )
        
        # 데이터 변환 및 저장
        success_count = 0
        error_count = 0
        error_messages = []
        
        for idx, row in df.iterrows():
            try:
                # 매핑된 컬럼에서 값 추출
                product_code = str(row[mapping.product_code]).strip()
                quantity = int(float(row[mapping.quantity]))
                
                # 날짜 파싱
                order_date_str = str(row[mapping.order_date])
                try:
                    order_date = pd.to_datetime(order_date_str).date()
                except:
                    order_date = datetime.now().date()
                
                # 선택적 필드
                product_name = str(row[mapping.product_name]).strip() if mapping.product_name and mapping.product_name in df.columns else product_code
                order_number = str(row[mapping.order_number]) if mapping.order_number and mapping.order_number in df.columns else f"ORD-{current_user.id}-{idx}"
                
                # 제품이 존재하는지 확인 (없으면 자동 생성)
                product = db.query(Product).filter(
                    Product.product_code == product_code,
                    Product.user_id == current_user.id
                ).first()
                
                if not product:
                    # 제품 자동 생성
                    product = Product(
                        user_id=current_user.id,
                        product_code=product_code,
                        product_name=product_name
                    )
                    db.add(product)
                    db.flush()  # ID 생성
                
                # 주문 생성
                order = Order(
                    user_id=current_user.id,
                    order_number=order_number,
                    product_code=product_code,
                    product_name=product_name,
                    quantity=quantity,
                    due_date=order_date,
                    status='completed',  # 과거 데이터는 완료 상태
                    created_at=datetime.combine(order_date, datetime.min.time())
                )
                db.add(order)
                success_count += 1
                
            except Exception as e:
                error_count += 1
                error_messages.append(f"행 {idx + 2}: {str(e)}")
                if len(error_messages) > 10:  # 에러 메시지 최대 10개
                    break
        
        # 커밋
        db.commit()
        
        # 세션 삭제
        del upload_sessions[request.session_id]
        
        return {
            "success": True,
            "message": f"주문 {success_count}개 업로드 완료!",
            "data": {
                "success_count": success_count,
                "error_count": error_count,
                "error_messages": error_messages[:10]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")

@router.get("/template")
async def download_template(
    current_user: User = Depends(get_current_user)
):
    """주문 업로드 템플릿 다운로드"""
    
    # 템플릿 데이터
    template_data = {
        '제품코드': ['PROD-001', 'PROD-002', 'PROD-003'],
        '제품명': ['전자부품 A', '나사 세트 B', '절연재 C'],
        '수량': [100, 200, 150],
        '주문일': ['2024-01-01', '2024-01-02', '2024-01-03'],
        '주문번호': ['ORD-001', 'ORD-002', 'ORD-003']
    }
    
    df = pd.DataFrame(template_data)
    
    # Excel 파일 생성
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='주문내역')
    
    output.seek(0)
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=주문내역_템플릿.xlsx'}
    )