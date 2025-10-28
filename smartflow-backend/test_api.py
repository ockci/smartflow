"""
SmartFlow API 간단 테스트
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """헬스 체크"""
    response = requests.get(f"{BASE_URL}/health")
    print("✅ 헬스 체크:", response.json())

def test_equipment():
    """설비 생성 테스트"""
    data = {
        "machine_id": "테스트1호기",
        "tonnage": 100,
        "capacity_per_hour": 50,
        "shift_start": "08:00",
        "shift_end": "18:00"
    }
    response = requests.post(f"{BASE_URL}/api/equipment/create", json=data)
    print("✅ 설비 생성:", response.json())

def test_order():
    """주문 생성 테스트"""
    data = {
        "order_number": "TEST-001",
        "product_code": "Product_c0",
        "quantity": 1000,
        "due_date": "2025-11-20"
    }
    response = requests.post(f"{BASE_URL}/api/orders/create", json=data)
    print("✅ 주문 생성:", response.json())

if __name__ == "__main__":
    print("🧪 SmartFlow API 테스트 시작...\n")
    
    try:
        test_health()
        test_equipment()
        test_order()
        print("\n✅ 모든 테스트 통과!")
    except Exception as e:
        print(f"\n❌ 테스트 실패: {e}")
