"""
엑셀 업로드/다운로드 API (수정 버전 - user_id 추가)
"""
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database.database import get_db  # ✅ DB 세션만 여기서 가져오기
from models.models import Equipment, Order, Schedule  # ✅ 모델은 models.py에서 가져오기
from datetime import datetime
from fastapi import UploadFile
import pandas as pd
from io import BytesIO
from api.auth import get_current_user  # ✅ api 폴더 안의 auth
from models.models import User

router = APIRouter()

# ============================================================
# 엑셀 파싱 함수
# ============================================================

async def parse_equipment_excel(file: UploadFile) -> list[dict]:
    """설비 정보 엑셀 파싱"""
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # 필수 컬럼 체크
        required_cols = ['사출기번호', '톤수', '가동시간_시작', '가동시간_종료', '생산능력_개_시간']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise ValueError(f"필수 컬럼 누락: {', '.join(missing)}")
        
        equipment_list = []
        for idx, row in df.iterrows():
            if not isinstance(row['톤수'], (int, float)):
                raise ValueError(f"{idx+2}번째 줄: 톤수는 숫자여야 합니다")
            
            equipment_list.append({
                'machine_id': str(row['사출기번호']),
                'machine_name': str(row.get('설비명', '')),
                'tonnage': int(row['톤수']),
                'shift_start': str(row['가동시간_시작']),
                'shift_end': str(row['가동시간_종료']),
                'capacity_per_hour': int(row['생산능력_개_시간'])
            })
        
        return equipment_list
        
    except Exception as e:
        raise ValueError(f"엑셀 파싱 실패: {str(e)}")

async def parse_order_excel(file: UploadFile) -> list[dict]:
    """주문 정보 엑셀 파싱"""
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # 🔍 디버그: 엑셀 컬럼명 출력
        print(f"📊 엑셀 컬럼명: {df.columns.tolist()}")
        print(f"📊 첫 행 데이터: {df.head(1).to_dict('records')}")
        
        col_mapping = {
            'order_number': 'order_number', '주문번호': 'order_number',
            'product_code': 'product_code', '제품코드': 'product_code',
            'product_name': 'product_name', '제품명': 'product_name',
            'quantity': 'quantity', '수량': 'quantity',
            'due_date': 'due_date', '납기일': 'due_date',
            'priority': 'priority', '우선순위': 'priority',
            'status': 'status', '상태': 'status',
            'is_urgent': 'is_urgent', '긴급여부': 'is_urgent',
            'notes': 'notes', '비고': 'notes'
        }
        df.columns = [col_mapping.get(col, col) for col in df.columns]

# 필수 컬럼 체크 (영어명으로)
        required_cols = ['order_number', 'product_code', 'quantity', 'due_date']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise ValueError(f"필수 컬럼 누락: {', '.join(missing)}")
        
        # 날짜 파싱 (영어 컬럼명으로)
        df['due_date'] = pd.to_datetime(df['due_date'])
        
        orders = []
        for idx, row in df.iterrows():
            if row['quantity'] <= 0:
                raise ValueError(f"{idx+2}번째 줄: 수량은 양수여야 합니다")
            
            order_data = {
                'order_number': str(row['order_number']),
                'product_code': str(row['product_code']),
                'product_name': str(row.get('product_name', '')),
                'quantity': int(row['quantity']),
                'due_date': row['due_date'].date(),
                'priority': int(row.get('priority', 1))
            }
            
            # 선택적 필드 추가
            if 'status' in df.columns and pd.notna(row.get('status')):
                order_data['status'] = str(row['status'])
            if 'is_urgent' in df.columns and pd.notna(row.get('is_urgent')):
                order_data['is_urgent'] = bool(row['is_urgent'])
            if 'notes' in df.columns and pd.notna(row.get('notes')):
                order_data['notes'] = str(row['notes'])
            
            orders.append(order_data)
        
        return orders
        
    except Exception as e:
        raise ValueError(f"엑셀 파싱 실패: {str(e)}")
    

# ---------------------------
# 설비 엑셀 파서 (✅ 새로 추가됨)
# ---------------------------
async def parse_equipment_excel(file: UploadFile):
    contents = await file.read()
    df = pd.read_excel(BytesIO(contents))

    header_map = {
        '설비번호': 'machine_id',
        '설비명': 'machine_name',
        '톤수': 'tonnage',
        '시간당생산량': 'capacity_per_hour',
        '가동시작': 'shift_start',
        '가동종료': 'shift_end',
        '상태': 'status',
    }
    df.columns = [header_map.get(c.strip(), c.strip()) for c in df.columns]

    equipment = df.to_dict(orient="records")
    return equipment

# ============================================================
# 업로드 API
# ============================================================

@router.post("/upload/equipment")
async def upload_equipment(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ⭐ 인증 추가
):
    """설비 정보 엑셀 업로드"""
    try:
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="엑셀 파일만 업로드 가능합니다")
        
        equipment_list = await parse_equipment_excel(file)
        
        success_count = 0
        error_count = 0
        
        for eq in equipment_list:
            try:
                # 같은 사용자의 중복 체크
                existing = db.query(Equipment).filter(
                    Equipment.machine_id == eq['machine_id'],
                    Equipment.user_id == current_user.id  # ⭐ 필터링
                ).first()
                
                if existing:
                    # 업데이트
                    for key, value in eq.items():
                        setattr(existing, key, value)
                    existing.updated_at = datetime.now()
                else:
                    # 새로 생성 (⭐ user_id 추가)
                    db_equipment = Equipment(**eq, user_id=current_user.id)
                    db.add(db_equipment)
                
                success_count += 1
            except Exception as e:
                error_count += 1
                print(f"설비 저장 실패: {e}")
        
        db.commit()
        
        return {
            "success": True,
            "message": f"설비 {success_count}개 업로드 완료",
            "data": {
                "success_count": success_count,
                "error_count": error_count
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")

@router.post("/upload/orders")
async def upload_orders(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ⭐ 인증 추가
):
    """주문 정보 엑셀 업로드"""
    try:
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="엑셀 파일만 업로드 가능합니다")
        
        orders = await parse_order_excel(file)
        
        success_count = 0
        error_count = 0
        
        for order in orders:
            try:
                existing = db.query(Order).filter(
                    Order.order_number == order['order_number'],
                    Order.user_id == current_user.id  # ⭐ 필터링
                ).first()
                
                if existing:
                    for key, value in order.items():
                        setattr(existing, key, value)
                    existing.updated_at = datetime.now()
                else:
                    # ⭐ user_id 추가
                    db_order = Order(**order, user_id=current_user.id)
                    db.add(db_order)
                
                success_count += 1
            except Exception as e:
                error_count += 1
                print(f"주문 저장 실패: {e}")
        
        db.commit()
        
        return {
            "success": True,
            "message": f"주문 {success_count}개 업로드 완료",
            "data": {
                "success_count": success_count,
                "error_count": error_count
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")

# ============================================================
# 다운로드 API
# ============================================================

@router.get("/download/equipment-template")
def download_equipment_template():
    """설비 정보 템플릿 다운로드"""
    df = pd.DataFrame({
        '사출기번호': ['1호기', '2호기', '3호기'],
        '설비명': ['소형 사출기', '중형 사출기', '대형 사출기'],
        '톤수': [100, 150, 200],
        '가동시간_시작': ['08:00', '08:00', '08:00'],
        '가동시간_종료': ['18:00', '18:00', '20:00'],
        '생산능력_개_시간': [50, 80, 100]
    })
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='설비정보')
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={
            'Content-Disposition': 'attachment; filename=equipment_template.xlsx',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
    )


@router.get("/download/order-template")
def download_order_template():
    """주문 정보 템플릿 다운로드"""
    df = pd.DataFrame({
        '주문번호': ['ORD-001', 'ORD-002', 'ORD-003'],
        '제품코드': ['Product_c0', 'Product_c6', 'Product_c12'],
        '제품명': ['전자부품 A-100', '자동차부품 B-200', '산업용 C-300'],
        '수량': [1000, 800, 1500],
        '납기일': ['2025-11-15', '2025-11-20', '2025-11-25'],
        '우선순위': [1, 2, 1]
    })


@router.get("/download/schedule")
def download_schedule(
    schedule_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ⭐ 인증 추가
):
    """스케줄 엑셀 다운로드"""
    try:
        query = db.query(Schedule).filter(
            Schedule.user_id == current_user.id  # ⭐ 필터링
        )
        
        if schedule_id:
            query = query.filter(Schedule.schedule_id == schedule_id)
        else:
            # 최신 스케줄
            latest = db.query(Schedule.schedule_id).filter(
                Schedule.user_id == current_user.id
            ).order_by(Schedule.created_at.desc()).first()
            if latest:
                query = query.filter(Schedule.schedule_id == latest.schedule_id)
        
        schedules = query.all()
        
        if not schedules:
            raise HTTPException(status_code=404, detail="스케줄이 없습니다")
        
        # DataFrame 생성
        data = []
        for schedule in schedules:
            order = db.query(Order).filter(Order.id == schedule.order_id).first()
            data.append({
                '사출기': schedule.machine_id,
                '주문번호': order.order_number if order else 'N/A',
                '제품코드': order.product_code if order else 'N/A',
                '시작시간': schedule.start_time.strftime('%Y-%m-%d %H:%M'),
                '종료시간': schedule.end_time.strftime('%Y-%m-%d %H:%M'),
                '작업시간(분)': schedule.duration_minutes,
                '납기준수': '예' if schedule.is_on_time else '아니오',
                '상태': schedule.status
            })
        
        df = pd.DataFrame(data)
        
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='생산스케줄')
        
        output.seek(0)
        
        filename = f'생산스케줄_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': f'attachment; filename={filename}',
                'Access-Control-Expose-Headers': 'Content-Disposition'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"다운로드 실패: {str(e)}")