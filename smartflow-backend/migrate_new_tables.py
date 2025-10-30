"""
DB 마이그레이션: Product, BOM, InventoryTransaction 테이블 추가
"""
from database.database import engine, Base
from models.models import Product, BOM, InventoryTransaction

def migrate():
    """새로운 테이블들을 데이터베이스에 추가"""
    print("🔄 마이그레이션 시작...")
    
    try:
        # 새 테이블만 생성 (기존 테이블은 건드리지 않음)
        Product.__table__.create(engine, checkfirst=True)
        print("✅ Product 테이블 생성 완료")
        
        BOM.__table__.create(engine, checkfirst=True)
        print("✅ BOM 테이블 생성 완료")
        
        InventoryTransaction.__table__.create(engine, checkfirst=True)
        print("✅ InventoryTransaction 테이블 생성 완료")
        
        print("🎉 마이그레이션 완료!")
        
    except Exception as e:
        print(f"❌ 마이그레이션 실패: {e}")
        raise

if __name__ == "__main__":
    migrate()
