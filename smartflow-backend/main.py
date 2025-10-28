from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from contextlib import asynccontextmanager
from io import BytesIO
import uvicorn
from core.excel_parser import create_order_template, create_equipment_template

# ✅ api 폴더 안의 라우터들
from api import equipment, orders, schedule, forecast, inventory, dashboard, upload, auth

from database import engine, Base, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 SmartFlow 백엔드 시작...")
    init_db()
    print("✅ 데이터베이스 초기화 완료!")
    yield
    print("👋 SmartFlow 백엔드 종료")


app = FastAPI(
    title="SmartFlow API",
    description="사출성형 공급망 최적화 AI 플랫폼",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(equipment.router, prefix="/api/equipment", tags=["Equipment"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["Schedule"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["Forecast"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])


# ✅ ⬇️ 여기에 위치해야 함 (라우터 등록 이후, if문 밖)

@app.get("/api/equipment/download/template")
def download_equipment_template_endpoint():
    """설비 템플릿 다운로드"""
    excel_bytes = create_equipment_template()
    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=equipment_template.xlsx"},
    )

@app.get("/api/orders/download/template")
def download_order_template_endpoint():
    """주문 템플릿 다운로드"""
    import pandas as pd
    
    df = pd.DataFrame({
        '주문번호': ['ORD-001', 'ORD-002', 'ORD-003'],
        '제품코드': ['Product_c0', 'Product_c6', 'Product_c15'],
        '제품명': ['전자부품 A-100', '자동차 부품 B-200', '가전 부품 C-300'],
        '수량': [1000, 800, 1200],
        '납기일': ['2025-11-15', '2025-11-20', '2025-11-25'],
        '우선순위': [1, 2, 1],
        '긴급여부': [False, False, True],
        '비고': ['', '', '긴급 주문']
    })
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='주문정보')
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=order_template.xlsx"},
    )

@app.get("/")
def root():
    return {"message": "SmartFlow API Server", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# 에러 핸들러
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(status_code=500, content={"error": str(exc)})


# ✅ 여기서는 FastAPI 실행만 담당
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)