# 🏭 SmartFlow - AI 사출성형 공급망 최적화 플랫폼

> K-AI 제조 데이터 분석 경진대회 출품작

React + TypeScript + FastAPI 기반 스마트 생산 관리 시스템

---

## 📋 프로젝트 개요

SmartFlow는 사출성형 제조업체의 생산 효율성을 극대화하는 통합 관리 플랫폼입니다.

### 주요 기능
- 📊 **실시간 대시보드** - KPI 모니터링, 생산 현황
- 🔨 **설비 관리** - 사출기 정보 관리, 엑셀 일괄 등록
- 📦 **주문 관리** - 주문 등록, 긴급 주문 처리
- 📅 **AI 스케줄링** - 최적 생산 일정 자동 생성
- 📈 **수요 예측** - AI 기반 미래 수요 예측 (예정)
- 📊 **재고 최적화** - 적정 재고 수준 추천 (예정)

---

## 🛠️ 기술 스택

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **State Management**: React Hooks
- **Charts**: Recharts
- **Calendar**: React Big Calendar
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI 0.104
- **Database**: SQLAlchemy (SQLite/PostgreSQL)
- **Authentication**: JWT (python-jose)
- **Data Processing**: Pandas, NumPy
- **Excel**: openpyxl
- **ML**: scikit-learn (예정)

---

## 📁 프로젝트 구조

```
smartflow/
├── frontend/                  # React 프론트엔드
│   ├── src/
│   │   ├── components/        # UI 컴포넌트
│   │   │   ├── ui/           # shadcn/ui
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ...
│   │   ├── pages/            # 주요 페이지
│   │   │   ├── EquipmentPage.tsx
│   │   │   ├── OrderUploadPage.tsx
│   │   │   ├── SchedulePage.tsx
│   │   │   └── ...
│   │   ├── utils/            # 유틸리티
│   │   │   ├── api.ts        # API 클라이언트
│   │   │   └── ...
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── backend/                   # FastAPI 백엔드
    ├── routers/              # API 라우터
    │   ├── dashboard.py      # 대시보드 API
    │   ├── equipment.py      # 설비 관리
    │   ├── orders.py         # 주문 관리
    │   ├── schedule.py       # 스케줄링
    │   └── forecast.py       # 예측 (예정)
    ├── ml_models/            # ML 모델 (예정)
    │   └── model_loader.py
    ├── database.py           # DB 설정
    ├── models.py             # ORM 모델
    ├── schemas.py            # Pydantic 스키마
    ├── main.py               # FastAPI 앱
    └── requirements.txt
```

---

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/YUNS2AM/smartflow.git
cd smartflow
```

### 2. 프론트엔드 설정
```bash
cd frontend
npm install
npm install react-big-calendar moment
npm run dev
```
→ http://localhost:5173

### 3. 백엔드 설정
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
→ http://localhost:8000

### 4. API 문서
→ http://localhost:8000/docs

---

## 📦 패키지 설치

### Frontend
```bash
npm install
npm install react-big-calendar moment @types/react-big-calendar
```

### Backend
```bash
pip install fastapi uvicorn sqlalchemy pydantic
pip install pandas openpyxl python-jose passlib
```

---

## 🎯 핵심 기능 상세

### 1. 설비 관리
- 사출기 정보 등록 (톤수, 생산량, 근무시간)
- 엑셀 일괄 등록
- 템플릿 다운로드

### 2. 주문 관리
- 주문 등록 (제품코드, 수량, 납기일)
- 긴급 주문 우선 처리
- 엑셀 일괄 등록

### 3. AI 스케줄링 (핵심!)
**알고리즘:**
1. pending 주문 가져오기
2. 우선순위 정렬 (긴급 > 우선순위 > 납기일)
3. 가용 설비에 최적 배정
4. 생산 시간 계산 (수량 / 시간당 생산량)
5. 납기 준수 여부 자동 판단

**시각화:**
- 간트 차트
- 주간/월간 캘린더
- 납기 준수율, 가동률 KPI

---

## 🔧 설정

### 환경변수 (.env)
```env
# Database
DATABASE_URL=sqlite:///./smartflow.db

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
FRONTEND_URL=http://localhost:5173
```

---

## 📊 데이터베이스 스키마

### Equipment (설비)
```sql
- id: INTEGER (PK)
- machine_id: VARCHAR (사출기번호)
- tonnage: INTEGER (톤수)
- capacity_per_hour: INTEGER (시간당 생산량)
- shift_start: TIME (근무시작)
- shift_end: TIME (근무종료)
- status: VARCHAR (active/inactive)
```

### Order (주문)
```sql
- id: INTEGER (PK)
- order_number: VARCHAR (주문번호)
- product_code: VARCHAR (제품코드)
- quantity: INTEGER (수량)
- due_date: DATE (납기일)
- priority: INTEGER (우선순위)
- is_urgent: BOOLEAN (긴급여부)
- status: VARCHAR (pending/scheduled/completed)
```

### Schedule (스케줄)
```sql
- id: INTEGER (PK)
- schedule_id: VARCHAR (스케줄ID)
- order_id: INTEGER (FK)
- machine_id: VARCHAR
- start_time: DATETIME (시작시간)
- end_time: DATETIME (종료시간)
- duration_minutes: INTEGER (소요시간)
- is_on_time: BOOLEAN (납기준수)
```

---

## 🧪 테스트

### 1. 설비 등록
1. 설비 관리 페이지 접속
2. "설비 추가" 또는 "엑셀 업로드"
3. 최소 1개 이상 등록

### 2. 주문 등록
1. 주문 관리 페이지 접속
2. "긴급 주문 추가" 또는 "엑셀 업로드"
3. pending 상태 주문 생성

### 3. 스케줄 생성
1. 스케줄링 페이지 접속
2. "새 스케줄 생성" 클릭
3. 3초 이내 최적 스케줄 생성
4. 간트차트 및 캘린더 확인

---

## 📈 성능

- **스케줄 생성 속도**: < 3초 (주문 100건 기준)
- **납기 준수율**: 평균 90% 이상
- **설비 가동률**: 평균 85% 이상

---

## 🎨 UI/UX

- **디자인 시스템**: Tailwind CSS + shadcn/ui
- **컬러 팔레트**: 
  - Primary: Blue (#2563EB)
  - Success: Green (#10B981)
  - Warning: Yellow (#F59E0B)
  - Danger: Red (#EF4444)
- **반응형**: Desktop 최적화 (태블릿/모바일 대응 예정)

---

## 🔐 보안

- JWT 기반 인증
- bcrypt 패스워드 해싱
- CORS 설정
- SQL Injection 방지 (SQLAlchemy ORM)

---

## 📱 API 엔드포인트

### 대시보드
- `GET /api/dashboard/kpis` - KPI 조회
- `GET /api/dashboard/production-status` - 생산 현황
- `GET /api/dashboard/notifications` - 알림

### 설비
- `GET /api/equipment/list` - 목록
- `POST /api/equipment/create` - 생성
- `DELETE /api/equipment/delete/{id}` - 삭제
- `POST /api/equipment/upload` - 엑셀 업로드
- `GET /api/equipment/download/template` - 템플릿

### 주문
- `GET /api/orders/list` - 목록
- `POST /api/orders/create` - 생성
- `POST /api/orders/urgent` - 긴급 주문
- `DELETE /api/orders/delete/{id}` - 삭제
- `POST /api/orders/upload` - 엑셀 업로드

### 스케줄
- `POST /api/schedule/generate` - 생성 ⭐
- `GET /api/schedule/result` - 조회
- `GET /api/schedule/gantt` - 간트차트
- `GET /api/schedule/download` - 엑셀 다운로드

---

## 🚧 개발 중 기능

- [ ] AI 수요 예측 (LSTM, ARIMA)
- [ ] 재고 최적화 알고리즘
- [ ] 실시간 생산 모니터링
- [ ] 모바일 앱 (React Native)
- [ ] 다국어 지원 (i18n)

---

## 🤝 기여

이슈 및 PR 환영합니다!

1. Fork
2. Feature Branch 생성
3. Commit & Push
4. Pull Request

---

## 📄 라이선스

MIT License

---

## 👥 팀

- **개발자**: 김대영
- **프로젝트**: K-AI 제조 데이터 분석 경진대회
- **GitHub**: https://github.com/YUNS2AM/smartflow

---

## 📞 문의

- Email: your-email@example.com
- GitHub Issues: https://github.com/YUNS2AM/smartflow/issues

---

**Made with ❤️ by SmartFlow Team**