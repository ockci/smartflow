"""
SmartFlow 데이터베이스 연결 설정 및 초기화 (절대경로 버전)
SQLAlchemy ORM 기반 - models.py에 정의된 테이블을 사용
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# -------------------------------
# ⚙️ 데이터베이스 설정
# -------------------------------

# ✅ 현재 파일(database.py) 기준 절대 경로 계산
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "smartflow.db"

# ✅ 항상 backend 폴더 안 smartflow.db에 저장됨
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=True  # SQL 실행 로그 출력 (개발용)
)

# ✅ 세션 팩토리 설정
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ✅ Base 정의 (모델들이 import해서 사용)
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
    """
    테이블 생성 및 초기 데이터 삽입
    - 테이블이 없을 때만 생성
    - 기존 데이터는 보존
    """
    from models.models import Base, Equipment  # ✅ 순환 import 방지

    # 테이블 생성 (존재하지 않으면 자동 생성)
    Base.metadata.create_all(bind=engine)
    print(f"✅ 데이터베이스 연결 성공: {DB_PATH}")
    print("✅ 테이블 구조 확인 및 생성 완료")

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
            print("✅ 기본 설비 데이터 3건 추가 완료")
        else:
            print(f"ℹ️ 기존 설비 데이터 유지 (총 {db.query(Equipment).count()}건)")
    except Exception as e:
        print(f"⚠️ 더미 데이터 추가 실패: {e}")
        db.rollback()
    finally:
        db.close()


# -------------------------------
# 🧠 실행 예시 (단독 실행 시)
# -------------------------------
if __name__ == "__main__":
    init_db()
    print("✅ SmartFlow DB 초기화 완료 (단독 실행 모드)")
