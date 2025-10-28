from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt

# --- 비밀번호 해싱 설정 ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """일반 비밀번호와 해시된 비밀번호를 비교합니다."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """비밀번호를 해시값으로 변환합니다."""
    return pwd_context.hash(password)

# --- JWT 토큰 설정 ---
# !!! 중요: 실제 서비스에서는 이 값을 .env 파일 등으로 안전하게 관리해야 합니다.
SECRET_KEY = "your-super-secret-key-for-smartflow-project"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 토큰 만료 시간 (24시간)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """액세스 토큰을 생성합니다."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt