from sqlalchemy.orm import Session
from models.models import User
from schemas.schemas import UserCreate
from core.security import get_password_hash

# ==================== 사용자(User) CRUD ====================

def get_user_by_email(db: Session, email: str):
    """이메일로 사용자 정보 조회"""
    return db.query(User).filter(User.email == email).first()
    # models.User → User 로 변경

def create_user(db: Session, user: UserCreate):
    """새로운 사용자 생성"""
    hashed_password = get_password_hash(user.password)
    db_user = User(
        # models.User → User 로 변경
        email=user.email,
        hashed_password=hashed_password,
        username=user.username,
        company_name=user.company_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user