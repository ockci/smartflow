from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from contextlib import asynccontextmanager
from io import BytesIO
import uvicorn
from api.simulation import router as simulation_router

from database.database import engine, Base, init_db
from api import equipment, orders, products, forecast, schedule, dashboard, inventory, upload, auth, smart_upload, purchase_orders
from core.excel_parser import create_equipment_template, create_product_template, create_order_template
from core.sample_data import create_sample_orders, create_sample_products, create_sample_equipment


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
app.include_router(simulation_router, prefix="/api/simulation", tags=["Simulation"])
app.include_router(purchase_orders.router)


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
# 📥 샘플 데이터 다운로드 (신규 추가)
# -------------------------------
@app.get("/api/samples/orders")
def download_sample_orders():
    """샘플 주문 데이터 다운로드 (100개)"""
    excel_bytes = create_sample_orders(100)
    return StreamingResponse(
        excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=sample_orders.xlsx"},
    )


@app.get("/api/samples/products")
def download_sample_products():
    """샘플 제품 데이터 다운로드 (20개)"""
    excel_bytes = create_sample_products(20)
    return StreamingResponse(
        excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=sample_products.xlsx"},
    )


@app.get("/api/samples/equipment")
def download_sample_equipment():
    """샘플 설비 데이터 다운로드 (5개)"""
    excel_bytes = create_sample_equipment(5)
    return StreamingResponse(
        excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=sample_equipment.xlsx"},
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