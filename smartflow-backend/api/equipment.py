"""
설비 관리 API (최종 수정 완전판)
- 삭제 경로 수정
- 엑셀 업로드 한글 컬럼 매핑
- shift_start / shift_end 기본값 처리
- user_id 자동 주입
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Equipment, User
from schemas import EquipmentCreate, Equipment as EquipmentSchema
from api.auth import get_current_user
from datetime import datetime
import pandas as pd
from io import BytesIO

router = APIRouter()

# -------------------------------
# ✅ 설비 목록 조회
# -------------------------------
@router.get("/list", response_model=List[EquipmentSchema])
def get_equipment_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """현재 로그인 사용자의 설비 목록 조회"""
    return db.query(Equipment).filter(
        Equipment.user_id == current_user.id
    ).order_by(Equipment.id.desc()).all()


# -------------------------------
# ✅ 설비 등록
# -------------------------------
@router.post("/create", response_model=EquipmentSchema)
def create_equipment(
    equipment: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """신규 설비 등록"""
    existing = db.query(Equipment).filter(
        Equipment.machine_id == equipment.machine_id,
        Equipment.user_id == current_user.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail=f"이미 존재하는 설비번호입니다: {equipment.machine_id}")

    db_equipment = Equipment(
        **equipment.dict(),
        user_id=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment


# -------------------------------
# ✅ 설비 삭제 (RESTful 경로)
# -------------------------------
@router.delete("/{equipment_id}")
def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """설비 삭제"""
    db_equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.user_id == current_user.id
    ).first()

    if not db_equipment:
        raise HTTPException(status_code=404, detail="설비를 찾을 수 없습니다")

    db.delete(db_equipment)
    db.commit()
    return {"message": "설비가 삭제되었습니다"}


# -------------------------------
# ✅ 설비 엑셀 업로드 (한글 컬럼 매핑 + 기본값 처리)
# -------------------------------
@router.post("/upload")
async def upload_equipment(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """설비 정보 엑셀 업로드"""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="엑셀 파일만 업로드 가능합니다")

    contents = await file.read()
    df = pd.read_excel(BytesIO(contents))

    header_map = {
        '사출기번호': 'machine_id',
        '설비명': 'machine_name',
        '톤수': 'tonnage',
        '시간당생산능력': 'capacity_per_hour',  # ✅ 추가
        '생산능력 (개/시간)': 'capacity_per_hour',
        '가동시작시간': 'shift_start',  # ✅ 추가
        '가동시작': 'shift_start',
        '가동종료시간': 'shift_end',  # ✅ 추가
        '가동종료': 'shift_end',
        '상태': 'status',
    }
    df.columns = [header_map.get(c.strip(), c.strip()) for c in df.columns]

    success_count = 0
    error_count = 0

    for _, row in df.iterrows():
        try:
            machine_id = str(row.get('machine_id', '')).strip()
            if not machine_id:
                continue

            existing = db.query(Equipment).filter(
                Equipment.machine_id == machine_id,
                Equipment.user_id == current_user.id
            ).first()

            equipment_data = {
                'machine_id': machine_id,
                'machine_name': str(row.get('machine_name', '')).strip(),
                'tonnage': int(row.get('tonnage', 0)) if pd.notna(row.get('tonnage')) else None,
                'capacity_per_hour': int(row.get('capacity_per_hour', 0)) if pd.notna(row.get('capacity_per_hour')) else 0,
                'shift_start': str(row.get('shift_start', '08:00')).strip() or '08:00',
                'shift_end': str(row.get('shift_end', '18:00')).strip() or '18:00',
                'status': str(row.get('status', 'active')).strip() or 'active',
            }

            if existing:
                for k, v in equipment_data.items():
                    setattr(existing, k, v)
                existing.updated_at = datetime.utcnow()
            else:
                db_equipment = Equipment(**equipment_data, user_id=current_user.id)
                db.add(db_equipment)

            success_count += 1
        except Exception as e:
            print(f"❌ 설비 저장 실패: {e}")
            error_count += 1

    db.commit()
    return {
        "success": True,
        "message": f"설비 {success_count}개 업로드 완료",
        "data": {"success_count": success_count, "error_count": error_count},
    }


