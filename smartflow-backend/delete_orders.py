import sqlite3
import sys

def delete_orders(db_path, user_email, limit=None):
    """주문 데이터 삭제"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 사용자 확인
        cursor.execute("SELECT id, username FROM users WHERE email=?;", (user_email,))
        user = cursor.fetchone()
        
        if not user:
            print(f"❌ {user_email} 사용자를 찾을 수 없습니다.")
            return
        
        user_id, username = user
        print(f"사용자: {username} ({user_email})")
        
        # 삭제 전 개수 확인
        cursor.execute("SELECT COUNT(*) FROM orders WHERE user_id=?;", (user_id,))
        total_count = cursor.fetchone()[0]
        print(f"\n현재 주문 개수: {total_count}개")
        
        if total_count == 0:
            print("삭제할 주문이 없습니다.")
            return
        
        # 삭제 확인
        if limit:
            print(f"\n⚠️  {limit}개의 주문을 삭제하시겠습니까?")
        else:
            print(f"\n⚠️  전체 {total_count}개의 주문을 삭제하시겠습니까?")
        
        confirm = input("계속하려면 'yes' 입력: ")
        if confirm.lower() != 'yes':
            print("취소되었습니다.")
            return
        
        # 삭제 실행
        if limit:
            cursor.execute("""
                DELETE FROM orders 
                WHERE id IN (
                    SELECT id FROM orders 
                    WHERE user_id=? 
                    LIMIT ?
                )
            """, (user_id, limit))
        else:
            cursor.execute("DELETE FROM orders WHERE user_id=?;", (user_id,))
        
        deleted_count = cursor.rowcount
        conn.commit()
        
        # 삭제 후 확인
        cursor.execute("SELECT COUNT(*) FROM orders WHERE user_id=?;", (user_id,))
        remaining = cursor.fetchone()[0]
        
        print(f"\n✓ {deleted_count}개 주문 삭제 완료!")
        print(f"✓ 남은 주문: {remaining}개")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    # 사용법 안내
    if len(sys.argv) < 2:
        print("사용법:")
        print("  전체 삭제: python delete_orders.py <DB경로>")
        print("  일부 삭제: python delete_orders.py <DB경로> <개수>")
        print("\n예시:")
        print("  python delete_orders.py smartflow.db")
        print("  python delete_orders.py smartflow.db 500")
        sys.exit(1)
    
    db_path = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else None
    
    delete_orders(db_path, "mbc@naver.com", limit)