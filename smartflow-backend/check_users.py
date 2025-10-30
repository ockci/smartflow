import sqlite3
import sys

def check_users_and_orders(db_path):
    """모든 사용자와 주문 개수 확인"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 모든 사용자 조회
        cursor.execute("SELECT id, username, email, company_name FROM users;")
        users = cursor.fetchall()
        
        print("=== 등록된 사용자 목록 ===\n")
        for user in users:
            user_id, username, email, company = user
            
            # 각 사용자의 주문 개수
            cursor.execute("SELECT COUNT(*) FROM orders WHERE user_id=?;", (user_id,))
            order_count = cursor.fetchone()[0]
            
            print(f"ID: {user_id}")
            print(f"이름: {username}")
            print(f"이메일: {email}")
            print(f"회사: {company}")
            print(f"주문 개수: {order_count}개")
            print("-" * 50)
        
        # 전체 통계
        cursor.execute("SELECT COUNT(*) FROM users;")
        total_users = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM orders;")
        total_orders = cursor.fetchone()[0]
        
        print(f"\n전체 사용자: {total_users}명")
        print(f"전체 주문: {total_orders}개")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python check_users.py <DB경로>")
        print("예시: python check_users.py smartflow.db")
        sys.exit(1)
    
    db_path = sys.argv[1]
    check_users_and_orders(db_path)