from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from contextlib import asynccontextmanager
from io import BytesIO
import uvicorn

from database.database import engine, Base, init_db
from api import equipment, orders, products, forecast, schedule, dashboard, inventory, upload, auth, smart_upload
from core.excel_parser import create_equipment_template, create_product_template, create_order_template


# -------------------------------
# 🚀 앱 수명 주기
# -------------------------------
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

# -------------------------------
# 🌐 CORS 설정 (React 3000 허용)
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# 📦 라우터 등록
# -------------------------------
app.include_router(equipment.router, prefix="/api/equipment", tags=["Equipment"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(smart_upload.router, prefix="/api/orders", tags=["Smart Upload"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["Schedule"])
app.include_router(forecast.router, tags=["Forecast"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])


# -------------------------------
# 📥 엑셀 템플릿 다운로드
# -------------------------------
@app.get("/api/equipment/download/template")
def download_equipment_template_endpoint():
    excel_bytes = create_equipment_template()
    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=equipment_template.xlsx"},
    )


@app.get("/api/products/download/template")
def download_product_template_endpoint():
    excel_bytes = create_product_template()
    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=product_template.xlsx"},
    )


@app.get("/api/orders/download/template")
def download_order_template_endpoint():
    excel_bytes = create_order_template()
    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=order_template.xlsx"},
    )


# -------------------------------
# 기본 라우트
# -------------------------------
@app.get("/")
def root():
    return {"message": "SmartFlow API Server", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# -------------------------------
# 예외 처리
# -------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(status_code=500, content={"error": str(exc)})


# -------------------------------
# 서버 실행
# -------------------------------
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)