#!/usr/bin/env python3
"""
스케줄 전체 삭제 스크립트
실제 백엔드 프로젝트 폴더(smartflow-backend)에서 실행하세요

실행 방법:
cd /path/to/smartflow-backend
python delete_all_schedules.py
"""
import sqlite3
import os

# 현재 디렉토리의 smartflow.db 사용
DB_PATH = "database\smartflow.db"

if not os.path.exists(DB_PATH):
    print(f"❌ {DB_PATH} 파일을 찾을 수 없습니다!")
    print("   smartflow-backend 폴더에서 실행하세요.")
    exit(1)

print("=" * 60)
print("📋 SmartFlow 스케줄 전체 삭제")
print("=" * 60)

try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 현재 개수 확인
    cursor.execute("SELECT COUNT(*) FROM schedules")
    count = cursor.fetchone()[0]
    print(f"\n📊 현재 스케줄 개수: {count}개")
    
    if count == 0:
        print("✅ 삭제할 스케줄이 없습니다!")
        conn.close()
        exit(0)
    
    # 확인 요청
    print(f"\n⚠️  정말로 {count}개의 스케줄을 모두 삭제하시겠습니까?")
    response = input("   계속하려면 'yes' 입력: ")
    
    if response.lower() != 'yes':
        print("❌ 취소되었습니다.")
        conn.close()
        exit(0)
    
    # 삭제 실행
    print("\n🗑️  삭제 중...")
    cursor.execute("DELETE FROM schedules")
    
    # 주문 상태도 pending으로 변경 (선택사항)
    cursor.execute("UPDATE orders SET status = 'pending' WHERE status = 'scheduled'")
    
    conn.commit()
    
    # 확인
    cursor.execute("SELECT COUNT(*) FROM schedules")
    after = cursor.fetchone()[0]
    
    print(f"✅ 완료! {count}개의 스케줄이 삭제되었습니다.")
    print(f"   남은 스케줄: {after}개")
    print(f"   주문 상태가 'pending'으로 변경되었습니다.")
    
    conn.close()
    
except sqlite3.Error as e:
    print(f"❌ DB 오류: {e}")
except Exception as e:
    print(f"❌ 오류 발생: {e}")
finally:
    print("\n" + "=" * 60)