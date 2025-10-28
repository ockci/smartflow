"""
SmartFlow 데이터베이스 연결 설정 및 초기화 (수정 완료 버전)
SQLAlchemy ORM 기반 - models.py에 정의된 테이블을 사용
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# -------------------------------
# ⚙️ 데이터베이스 설정
# -------------------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///./smartflow.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=True  # SQL 실행 로그 출력 (개발용)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ✅ Base는 여기서 한 번만 정의 (models.py에서 import해서 사용)
Base = declarative_base()


# -------------------------------
# 🧩 DB 세션 의존성
# -------------------------------
def get_db():
    """FastAPI 의존성 주입용 DB 세션"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -------------------------------
# 🚀 데이터베이스 초기화 함수
# -------------------------------
def init_db():
    """테이블 생성 및 초기 데이터 삽입"""
    from models import Base, Equipment  # ✅ 모델은 여기서만 import (중복 방지)

    # 테이블 생성
    Base.metadata.create_all(bind=engine)
    print("✅ 데이터베이스 테이블 생성 완료")

    # 테스트용 더미 데이터 추가
    db = SessionLocal()
    try:
        if db.query(Equipment).count() == 0:
            dummy_equipment = [
                Equipment(
                    user_id=1,
                    machine_id="1호기",
                    machine_name="소형 사출기",
                    tonnage=100,
                    capacity_per_hour=50,
                    shift_start="08:00",
                    shift_end="18:00",
                    status="active",
                ),
                Equipment(
                    user_id=1,
                    machine_id="2호기",
                    machine_name="중형 사출기",
                    tonnage=150,
                    capacity_per_hour=80,
                    shift_start="08:00",
                    shift_end="18:00",
                    status="active",
                ),
                Equipment(
                    user_id=1,
                    machine_id="3호기",
                    machine_name="대형 사출기",
                    tonnage=200,
                    capacity_per_hour=100,
                    shift_start="08:00",
                    shift_end="20:00",
                    status="active",
                ),
            ]
            db.add_all(dummy_equipment)
            db.commit()
            print("✅ 더미 설비 데이터 추가 완료")
    except Exception as e:
        print(f"⚠️ 더미 데이터 추가 실패: {e}")
        db.rollback()
    finally:
        db.close()
