# 🚀 SmartFlow - AI 기반 발주 관리 시스템

## 📁 프로젝트 구조
```
Deathtiny/
├── smartflow/              # React 프론트엔드
├── smartflow-backend/      # FastAPI 백엔드
└── smartflow-backend_ai/   # AI 분석 서버
```

## 🛠️ 설치 방법

### 1. 프론트엔드 설치
```bash
cd smartflow
npm install
npm run dev
```

### 2. 백엔드 설치
```bash
cd smartflow-backend
pip install -r requirements.txt
python main.py
```

### 3. AI 서버 설치 (선택)
```bash
cd smartflow-backend_ai
pip install -r requirements.txt
python ai_server.py
```

## 🌐 접속 주소

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8000
- API 문서: http://localhost:8000/docs

## 📦 주요 기능

- ✅ 사용자 인증 (JWT)
- 📊 대시보드
- 📦 주문 관리
- 🤖 AI 수요 예측
- 🏭 설비 관리
- 📅 생산 일정 관리

## 🔧 기술 스택

**Frontend:** React, TypeScript, Vite, TailwindCSS, shadcn/ui
**Backend:** FastAPI, SQLAlchemy, SQLite
**AI:** Python, scikit-learn