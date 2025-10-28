"""
SmartFlow 데이터베이스 마이그레이션 스크립트
user_id 컬럼 추가 및 기존 데이터 처리

실행 방법:
1. 백업: cp smartflow.db smartflow_backup.db
2. python migrate_add_user_id.py
"""
import sqlite3
from datetime import datetime

def migrate_database(db_path="smartflow.db"):
    """데이터베이스 마이그레이션 실행"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("=" * 50)
    print("SmartFlow 데이터베이스 마이그레이션 시작")
    print("=" * 50)
    
    try:
        # 1. 백업 테이블 생성
        print("\n[1/5] 백업 테이블 생성 중...")
        backup_tables = ['equipment', 'orders', 'schedules', 'forecasts', 'inventory_policies']
        for table in backup_tables:
            try:
                cursor.execute(f"CREATE TABLE {table}_backup AS SELECT * FROM {table}")
                print(f"  ✓ {table} 백업 완료")
            except sqlite3.Error as e:
                print(f"  ⚠ {table} 백업 건너뜀: {e}")
        
        # 2. user_id 컬럼 추가
        print("\n[2/5] user_id 컬럼 추가 중...")
        tables_to_update = [
            ('equipment', 'equipment'),
            ('orders', 'orders'),
            ('schedules', 'schedules'),
            ('forecasts', 'forecasts'),
            ('inventory_policies', 'inventory_policies')
        ]
        
        for table, _ in tables_to_update:
            try:
                # 컬럼 존재 여부 확인
                cursor.execute(f"PRAGMA table_info({table})")
                columns = [col[1] for col in cursor.fetchall()]
                
                if 'user_id' not in columns:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER")
                    print(f"  ✓ {table}에 user_id 추가")
                else:
                    print(f"  ⚠ {table}에 user_id 이미 존재")
            except sqlite3.Error as e:
                print(f"  ✗ {table} 오류: {e}")
        
        # 3. 기존 데이터에 user_id 설정
        print("\n[3/5] 기존 데이터에 user_id 설정 중...")
        
        # 첫 번째 사용자 ID 가져오기 (없으면 테스트 사용자 생성)
        cursor.execute("SELECT id FROM users LIMIT 1")
        user_row = cursor.fetchone()
        
        if not user_row:
            print("  ⚠ 사용자가 없습니다. 테스트 사용자 생성 중...")
            cursor.execute("""
                INSERT INTO users (username, email, hashed_password, company_name, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                "admin",
                "admin@smartflow.com",
                "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Zr9U.5V1/w.L1vGJVJGba",  # "admin123"
                "SmartFlow Corp",
                True,
                datetime.now().isoformat()
            ))
            default_user_id = cursor.lastrowid
            print(f"  ✓ 테스트 사용자 생성됨 (ID: {default_user_id})")
            print(f"     이메일: admin@smartflow.com")
            print(f"     비밀번호: admin123")
        else:
            default_user_id = user_row[0]
            print(f"  ✓ 기존 사용자 발견 (ID: {default_user_id})")
        
        # 모든 기존 데이터를 첫 번째 사용자에게 할당
        for table, _ in tables_to_update:
            try:
                cursor.execute(f"UPDATE {table} SET user_id = ? WHERE user_id IS NULL", (default_user_id,))
                affected = cursor.rowcount
                print(f"  ✓ {table}: {affected}개 행 업데이트")
            except sqlite3.Error as e:
                print(f"  ✗ {table} 업데이트 오류: {e}")
        
        # 4. 인덱스 생성
        print("\n[4/5] 인덱스 생성 중...")
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON equipment(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_forecasts_user_id ON forecasts(user_id)",
        ]
        
        for idx_sql in indexes:
            try:
                cursor.execute(idx_sql)
                print(f"  ✓ 인덱스 생성 완료")
            except sqlite3.Error as e:
                print(f"  ⚠ 인덱스 생성 건너뜀: {e}")
        
        # 5. 커밋
        print("\n[5/5] 변경사항 저장 중...")
        conn.commit()
        print("  ✓ 모든 변경사항 저장 완료")
        
        # 결과 확인
        print("\n" + "=" * 50)
        print("마이그레이션 완료! 📊")
        print("=" * 50)
        
        # 테이블별 데이터 확인
        print("\n현재 데이터 현황:")
        for table, _ in tables_to_update:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE user_id IS NOT NULL")
            with_user = cursor.fetchone()[0]
            print(f"  • {table}: 총 {count}개, user_id 설정된 것 {with_user}개")
        
        print("\n✅ 마이그레이션 성공!")
        print("⚠️ 문제가 있을 경우 백업 복원: mv smartflow_backup.db smartflow.db")
        
    except Exception as e:
        print(f"\n❌ 마이그레이션 실패: {e}")
        conn.rollback()
        print("⚠️ 변경사항이 롤백되었습니다.")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    import sys
    
    print("""
╔══════════════════════════════════════════════════════════╗
║   SmartFlow 데이터베이스 마이그레이션 도구              ║
║   user_id 컬럼 추가 및 데이터 격리 설정                 ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    # 확인 메시지
    print("⚠️  이 작업은 데이터베이스 구조를 변경합니다.")
    print("⚠️  계속하기 전에 반드시 백업을 만드세요!")
    print()
    
    response = input("계속하시겠습니까? (yes/no): ").strip().lower()
    
    if response == 'yes':
        db_path = input("데이터베이스 경로 (기본: smartflow.db): ").strip() or "smartflow.db"
        migrate_database(db_path)
    else:
        print("마이그레이션이 취소되었습니다.")
        sys.exit(0)