"""
SmartFlow 생산 스케줄링 엔진
납기 준수율 최대화 & 설비 가동률 최적화
"""
from datetime import datetime, timedelta, time
from typing import List, Dict, Optional
import random

class ProductionScheduler:
    """
    생산 스케줄링 엔진
    
    목표:
    1. 납기 준수율 최대화
    2. 설비 가동률 최대화
    3. 금형 교체 최소화 (제품 그룹핑)
    
    알고리즘: Greedy + Priority-based
    """
    
    def __init__(self, equipment_list: List[Dict], orders: List[Dict]):
        """
        Args:
            equipment_list: 설비 정보 리스트
            orders: 주문 정보 리스트
        """
        self.equipment = {eq['machine_id']: eq for eq in equipment_list}
        
        # 주문 정렬: 우선순위 → 납기일 → 긴급 여부
        self.orders = sorted(
            orders,
            key=lambda x: (
                x.get('priority', 1),  # 우선순위 낮을수록 먼저
                x.get('due_date', '9999-12-31'),  # 납기일 빠를수록 먼저
                not x.get('is_urgent', False)  # 긴급 주문 먼저
            )
        )
        
        # 각 설비의 현재 작업 종료 시간 추적
        self.machine_timelines = {}
        self._init_timelines()
    
    def _init_timelines(self):
        """각 설비의 시작 시간 초기화"""
        now = datetime.now()
        for machine_id, eq in self.equipment.items():
            # 가동 시작 시간으로 초기화
            start_time = eq.get('shift_start', '08:00')
            hour, minute = map(int, start_time.split(':'))
            
            start_dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            # 만약 현재 시간이 가동 시간을 지났으면 다음 날로
            if now > start_dt:
                start_dt += timedelta(days=1)
            
            self.machine_timelines[machine_id] = start_dt
    
    def generate_schedule(self) -> Dict:
        """
        스케줄 생성 (Greedy 알고리즘)
        
        Returns:
            {
                'schedule_id': str,
                'schedules': List[Dict],
                'metrics': Dict,
                'generated_at': datetime
            }
        """
        schedule = []
        schedule_id = f"SCHEDULE-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        for order in self.orders:
            # 1. 적합한 설비 찾기
            suitable_machine = self._find_best_machine(order)
            
            if not suitable_machine:
                # 적합한 설비가 없으면 스킵 (실제로는 대기열에 추가)
                continue
            
            # 2. 작업 시간 계산
            machine_id = suitable_machine['machine_id']
            start_time = self.machine_timelines[machine_id]
            
            # 작업 시간 = (수량 / 시간당 생산능력) * 60분
            capacity = suitable_machine['capacity_per_hour']
            work_hours = order['quantity'] / capacity
            duration_minutes = int(work_hours * 60)
            
            # 금형 교체 시간 추가 (10분)
            duration_minutes += 10
            
            end_time = start_time + timedelta(minutes=duration_minutes)
            
            # 가동 시간 체크 (예: 08:00-18:00)
            end_time = self._adjust_for_shift_hours(
                start_time, 
                end_time, 
                suitable_machine
            )
            
            # 3. 납기 준수 여부 체크
            due_date = datetime.strptime(order['due_date'], '%Y-%m-%d')
            is_on_time = end_time <= due_date
            
            # 4. 스케줄에 추가
            schedule.append({
                'order_number': order['order_number'],
                'product_code': order['product_code'],
                'machine_id': machine_id,
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'duration_minutes': duration_minutes,
                'is_on_time': is_on_time,
                'due_date': order['due_date'],
                'quantity': order['quantity']
            })
            
            # 5. 설비 타임라인 업데이트
            self.machine_timelines[machine_id] = end_time
        
        # 6. 성능 지표 계산
        metrics = self.calculate_metrics(schedule)
        
        return {
            'schedule_id': schedule_id,
            'schedules': schedule,
            'metrics': metrics,
            'generated_at': datetime.now().isoformat()
        }
    
    def _find_best_machine(self, order: Dict) -> Optional[Dict]:
        """
        주문에 가장 적합한 설비 찾기
        
        선택 기준:
        1. 가장 빨리 시작 가능한 설비
        2. 생산능력이 적절한 설비
        
        Args:
            order: 주문 정보
        
        Returns:
            선택된 설비 정보
        """
        available_machines = []
        
        for machine_id, machine in self.equipment.items():
            if machine.get('status') != 'active':
                continue
            
            # 간단 버전: 모든 설비 사용 가능
            # 실제로는 제품별 필요 톤수 체크 필요
            available_machines.append({
                'machine_id': machine_id,
                'start_time': self.machine_timelines[machine_id],
                'capacity_per_hour': machine['capacity_per_hour'],
                'tonnage': machine.get('tonnage', 100)
            })
        
        if not available_machines:
            return None
        
        # 가장 빨리 시작 가능한 설비 선택
        best_machine = min(available_machines, key=lambda m: m['start_time'])
        
        return {
            'machine_id': best_machine['machine_id'],
            **self.equipment[best_machine['machine_id']]
        }
    
    def _adjust_for_shift_hours(
        self, 
        start_time: datetime, 
        end_time: datetime, 
        machine: Dict
    ) -> datetime:
        """
        가동 시간을 고려하여 종료 시간 조정
        
        예: 가동 시간이 08:00-18:00인데 18:00 이후로 작업이 걸치면
        다음 날 08:00부터 이어서 작업
        
        Args:
            start_time: 시작 시간
            end_time: 예상 종료 시간
            machine: 설비 정보
        
        Returns:
            조정된 종료 시간
        """
        shift_start = machine.get('shift_start', '08:00')
        shift_end = machine.get('shift_end', '18:00')
        
        shift_start_time = time(*map(int, shift_start.split(':')))
        shift_end_time = time(*map(int, shift_end.split(':')))
        
        # 종료 시간이 가동 종료 시간을 넘으면 다음 날로 이동
        if end_time.time() > shift_end_time:
            # 오늘 작업 가능 시간
            today_end = start_time.replace(
                hour=shift_end_time.hour,
                minute=shift_end_time.minute
            )
            remaining_minutes = int((end_time - today_end).total_seconds() / 60)
            
            # 다음 날 시작
            next_day_start = (start_time + timedelta(days=1)).replace(
                hour=shift_start_time.hour,
                minute=shift_start_time.minute
            )
            
            end_time = next_day_start + timedelta(minutes=remaining_minutes)
        
        return end_time
    
    def calculate_metrics(self, schedule: List[Dict]) -> Dict:
        """
        스케줄 성능 지표 계산
        
        Returns:
            {
                'on_time_rate': float,  # 납기 준수율 (%)
                'utilization': float,  # 평균 가동률 (%)
                'total_orders': int,  # 총 주문 수
                'on_time_orders': int,  # 납기 준수 주문 수
                'late_orders': int  # 지연 주문 수
            }
        """
        if not schedule:
            return {
                'on_time_rate': 0,
                'utilization': 0,
                'total_orders': 0,
                'on_time_orders': 0,
                'late_orders': 0
            }
        
        # 납기 준수율
        on_time_count = sum(1 for s in schedule if s['is_on_time'])
        on_time_rate = (on_time_count / len(schedule)) * 100
        
        # 가동률 계산
        total_work_minutes = sum(s['duration_minutes'] for s in schedule)
        
        # 전체 가용 시간 (설비 수 * 10시간 * 60분)
        num_machines = len(self.equipment)
        total_available_minutes = num_machines * 10 * 60  # 10시간 가동 가정
        
        utilization = min(100, (total_work_minutes / total_available_minutes) * 100)
        
        return {
            'on_time_rate': round(on_time_rate, 2),
            'utilization': round(utilization, 2),
            'total_orders': len(schedule),
            'on_time_orders': on_time_count,
            'late_orders': len(schedule) - on_time_count
        }
    
    def generate_gantt_data(self, schedule: List[Dict]) -> List[Dict]:
        """
        간트차트용 데이터 생성
        
        Returns:
            [
                {
                    'machine_id': str,
                    'tasks': [
                        {
                            'order_number': str,
                            'start': datetime,
                            'end': datetime,
                            'status': str
                        }
                    ]
                }
            ]
        """
        gantt_data = {}
        
        for item in schedule:
            machine_id = item['machine_id']
            
            if machine_id not in gantt_data:
                gantt_data[machine_id] = {
                    'machine_id': machine_id,
                    'tasks': []
                }
            
            gantt_data[machine_id]['tasks'].append({
                'order_number': item['order_number'],
                'product_code': item['product_code'],
                'start': item['start_time'],
                'end': item['end_time'],
                'duration_minutes': item['duration_minutes'],
                'is_on_time': item['is_on_time']
            })
        
        return list(gantt_data.values())
