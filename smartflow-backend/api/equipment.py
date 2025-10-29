"""
설비 관리 API (수정 버전 - user_id 필터링 추가)
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Equipment
from schemas import EquipmentCreate, Equipment as EquipmentSchema
from api.auth import get_current_user
from models import User
from datetime import datetime

router = APIRouter()

@router.get("/list", response_model=List[EquipmentSchema])
def get_equipment_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    설비 목록 조회 (현재 사용자의 설비만)
    """
    equipment = db.query(Equipment).filter(
        Equipment.user_id == current_user.id
    ).all()
    return equipment

@router.get("/{equipment_id}", response_model=EquipmentSchema)
def get_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    특정 설비 조회
    """
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.user_id == current_user.id
    ).first()
    
    if not equipment:
        raise HTTPException(status_code=404, detail="설비를 찾을 수 없습니다")
    return equipment

@router.post("/create", response_model=EquipmentSchema)
def create_equipment(
    equipment: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    설비 생성
    """
    # 같은 사용자의 같은 machine_id 중복 체크
    existing = db.query(Equipment).filter(
        Equipment.machine_id == equipment.machine_id,
        Equipment.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"이미 존재하는 설비 번호입니다: {equipment.machine_id}"
        )
    
    # ⭐ 변경: user_id 제외하고 서버에서 강제 주입
    db_equipment = Equipment(
        **equipment.dict(exclude={'user_id'}),
        user_id=current_user.id,
        status="active",
        created_at=datetime.utcnow()
    )
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

@router.put("/update/{equipment_id}", response_model=EquipmentSchema)
def update_equipment(
    equipment_id: int,
    equipment: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    설비 수정
    """
    db_equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.user_id == current_user.id
    ).first()
    
    if not db_equipment:
        raise HTTPException(status_code=404, detail="설비를 찾을 수 없습니다")
    
    # ⭐ 변경: user_id 수정 방지
    for key, value in equipment.dict(exclude={'user_id'}).items():
        setattr(db_equipment, key, value)
    
    db_equipment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

@router.delete("/delete/{equipment_id}")
def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    설비 삭제
    """
    db_equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.user_id == current_user.id
    ).first()
    
    if not db_equipment:
        raise HTTPException(status_code=404, detail="설비를 찾을 수 없습니다")
    
    db.delete(db_equipment)
    db.commit()
    return {"message": "설비가 삭제되었습니다"}

@router.post("/upload")
async def upload_equipment(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """설비 정보 엑셀 업로드"""
    from api.upload import parse_equipment_excel
    
    try:
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="엑셀 파일만 업로드 가능합니다")
        
        equipment_list = await parse_equipment_excel(file)
        
        success_count = 0
        error_count = 0
        
        for equip in equipment_list:
            try:
                existing = db.query(Equipment).filter(
                    Equipment.machine_id == equip['machine_id'],
                    Equipment.user_id == current_user.id
                ).first()
                
                if existing:
                    for key, value in equip.items():
                        if key != 'user_id':  # ⭐ user_id 수정 방지
                            setattr(existing, key, value)
                    existing.updated_at = datetime.now()
                else:
                    # ⭐ user_id 제외하고 생성
                    equip_data = {k: v for k, v in equip.items() if k != 'user_id'}
                    db_equipment = Equipment(**equip_data, user_id=current_user.id)
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