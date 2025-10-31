import { useState, useEffect } from 'react';
import { 
  AlertCircle, Package, CheckCircle, AlertTriangle, TrendingUp, ShoppingCart, 
  BarChart3, Clock, Bell,
  Brain, Factory, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Sidebar } from './Sidebar';
import { useDashboard } from '@/lib/Usedashboard';
import { inventoryAPI } from '@/lib/api';
import { toast } from 'sonner';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface Item {
  id: string; 
  name: string; 
  currentStock: number; 
  weekDemand: number; 
  daysLeft: number; 
  status: 'urgent' | 'warning' | 'normal' | 'excess'; 
  risk: string;
}

const statusConfig = {
  urgent: { icon: AlertCircle, color: 'bg-[#EF4444]', text: '긴급', textColor: 'text-[#EF4444]' },
  warning: { icon: AlertTriangle, color: 'bg-[#F59E0B]', text: '주의', textColor: 'text-[#F59E0B]' },
  normal: { icon: CheckCircle, color: 'bg-[#10B981]', text: '정상', textColor: 'text-[#10B981]' },
  excess: { icon: Package, color: 'bg-[#6B7280]', text: '과다', textColor: 'text-[#6B7280]' },
};

export function DashboardPage({ onNavigate, onLogout }: DashboardPageProps) {
  const { summary, production, alerts, loading, error } = useDashboard();
  
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [inProgressSchedules, setInProgressSchedules] = useState<any[]>([]);

  // 재고 데이터 불러오기
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoadingItems(true);
        const data = await inventoryAPI.list();
        setItems(data);
      } catch (error) {
        console.error('재고 조회 실패:', error);
        toast.error('재고 데이터를 불러오는데 실패했습니다');
      } finally {
        setLoadingItems(false);
      }
    };
    
    fetchInventory();
  }, []);

  // 생산 중인 스케줄 불러오기
  useEffect(() => {
    fetchInProgressSchedules();
    
    // 30초마다 자동 갱신
    const interval = setInterval(() => {
      fetchInProgressSchedules();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchInProgressSchedules = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch('http://localhost:8000/api/schedule/in-progress', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      setInProgressSchedules(data.in_progress || []);  // ⬅️ schedule → in_progress
    }
  } catch (error) {
    console.error('생산 중 스케줄 로드 실패:', error);
  }
};

  const handleCompleteProduction = async (scheduleId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:8000/api/schedule/${scheduleId}/complete`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success('생산이 완료되었습니다!');
        fetchInProgressSchedules();
      } else {
        throw new Error('완료 처리 실패');
      }
    } catch (error) {
      console.error('완료 처리 실패:', error);
      toast.error('완료 처리에 실패했습니다.');
    }
  };

  const topThreeItems = items
    .filter(item => item.status === 'urgent' || item.status === 'warning')
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);
  
  if (loading) return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">에러: {error}</div>;
  

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      <Sidebar currentPage="dashboard" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#1F2937] text-2xl">SmartFlow</h1>
                <p className="text-sm text-[#6B7280]">발주 관리 대시보드</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-[#6B7280]">오늘</p>
                <p className="text-[#1F2937]">{new Date().toLocaleDateString('ko-KR')}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="space-y-6">
            
            {/* Section 1: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 오늘 발주 필요 (AI 예측) */}
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-[#6B7280]">오늘 발주 필요</CardTitle>
                  <Brain className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-[#1F2937] font-bold">
                    {summary?.today_order_needed || 0}개
                  </div>
                  <p className="text-xs text-purple-600 mt-1">
                    내일: {summary?.tomorrow_demand || 0}개
                  </p>
                </CardContent>
              </Card>

              {/* 오늘 생산 예정 */}
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-[#6B7280]">오늘 생산 예정</CardTitle>
                  <Factory className="w-4 h-4 text-[#2563EB]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-[#1F2937] font-bold">
                    {summary?.today_production || 0}개
                  </div>
                  <p className="text-xs text-[#10B981] mt-1">스케줄 기반</p>
                </CardContent>
              </Card>

              {/* 긴급 주문 */}
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-[#6B7280]">긴급 주문</CardTitle>
                  <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-[#EF4444] font-bold">
                    {summary?.urgent_orders || 0}건
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">즉시 처리 필요</p>
                </CardContent>
              </Card>

              {/* 납기 임박 */}
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-[#6B7280]">납기 임박</CardTitle>
                  <Clock className="w-4 h-4 text-[#F59E0B]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-[#F59E0B] font-bold">
                    {summary?.due_soon || 0}건
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">3일 이내</p>
                </CardContent>
              </Card>
            </div>

            {/* Section 2: TOP 3 긴급 재고 */}
            <Card className="bg-white border border-[#E5E7EB] shadow-md">
              <div className="border-b border-[#E5E7EB] px-6 py-4">
                <h2 className="text-[#1F2937] text-xl">🚨 TOP 3 긴급 재고</h2>
              </div>
              <div className="p-6">
                {loadingItems ? (
                  <div className="text-center py-8 text-gray-500">재고 데이터 로딩 중...</div>
                ) : topThreeItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">긴급 재고가 없습니다 ✅</div>
                ) : (
                  topThreeItems.map((item) => {
                    const StatusIcon = statusConfig[item.status].icon;
                    return (
                      <div key={item.id} className="mb-4 last:mb-0 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-[#1F2937] font-medium mb-1">{item.name}</h3>
                            <p className="text-sm text-[#6B7280]">현재 재고: {item.currentStock}개</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-[#6B7280]">남은 재고 기간</p>
                            <p className="text-lg text-[#EF4444]">{item.daysLeft}일</p>
                          </div>
                          <div className={`w-12 h-12 ${statusConfig[item.status].color} rounded-full flex items-center justify-center ml-4`}>
                            <StatusIcon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* 🆕 Section: 현재 생산 중 */}
            {inProgressSchedules.length > 0 && (
              <Card className="col-span-full border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-6 w-6 text-blue-600 animate-pulse" />
                    현재 생산 중 ({inProgressSchedules.length}건)
                  </CardTitle>
                  <CardDescription>
                    실시간으로 진행 중인 생산 작업입니다
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inProgressSchedules.map((schedule) => (
                      <Card key={schedule.id} className="border-2 border-blue-300 bg-white shadow-lg">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">
                                {schedule.product_name}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                제품코드: {schedule.product_code}
                              </CardDescription>
                            </div>
                            <Badge className="bg-blue-500">
                              생산중
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* 설비 정보 */}
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{schedule.machine_name}</span>
                          </div>
                          
                          {/* 수량 정보 */}
                          <div className="flex items-center gap-2 text-sm">
                            <ShoppingCart className="h-4 w-4 text-gray-500" />
                            <span>목표: {schedule.quantity}개</span>
                          </div>
                          
                          {/* 시작 시간 */}
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>
                              시작: {schedule.actual_start ? 
                                new Date(schedule.actual_start).toLocaleString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                            </span>
                          </div>
                          
                          {/* 진행 표시 */}
                          <div className="pt-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-600">진행 상태</span>
                              <span className="text-xs font-bold text-blue-600">진행중</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full animate-pulse"
                                style={{ width: '50%' }}
                              />
                            </div>
                          </div>
                          
                          {/* 완료 버튼 */}
                          <Button
                            onClick={() => handleCompleteProduction(schedule.id)}
                            className="w-full bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            생산 완료
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section 3: 오늘 생산 현황 */}
            <Card className="bg-white border border-[#E5E7EB] shadow-md">
              <div className="border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
                <h2 className="text-[#1F2937] text-xl">🏭 오늘 생산 현황</h2>
                <Button onClick={() => onNavigate('schedule')} variant="outline" className="border-[#10B981] text-[#10B981] hover:bg-green-50">
                  <Clock className="w-4 h-4 mr-2" />스케줄 보기
                </Button>
              </div>
              <div className="p-6 space-y-4">
                {production && production.length > 0 ? (
                  production.map((prod: any) => (
                    <div key={prod.machine_id} className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                      <div className="flex-1">
                        <h3 className="text-[#1F2937] font-medium">{prod.machine_id}</h3>
                        <p className="text-sm text-[#6B7280]">{prod.order_number || '대기중'} - {prod.product_code || '---'}</p>
                      </div>
                      <div className="flex-1 px-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-[#6B7280]">진행률</span>
                          <span className="text-sm text-[#1F2937]">{prod.progress || 0}%</span>
                        </div>
                        <Progress value={prod.progress || 0} className="h-2" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[#6B7280]">완료 예정</p>
                        <p className="text-[#1F2937]">{prod.estimated_completion || '---'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">진행 중인 생산이 없습니다</div>
                )}
              </div>
            </Card>

            {/* Section 4: 납기 임박 주문 */}
            <Card className="bg-white border border-[#E5E7EB] shadow-md">
              <div className="border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
                <h2 className="text-[#1F2937] text-xl">⏰ 납기 임박 주문</h2>
                <Button onClick={() => onNavigate('history')} variant="outline" className="border-[#EF4444] text-[#EF4444] hover:bg-red-50">
                  <Bell className="w-4 h-4 mr-2" />전체 보기
                </Button>
              </div>
              <div className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문번호</TableHead>
                      <TableHead>제품코드</TableHead>
                      <TableHead>수량</TableHead>
                      <TableHead>납기일</TableHead>
                      <TableHead>남은 일수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts && alerts.length > 0 ? (
                      alerts.map((alert: any) => (
                        <TableRow key={alert.order_number}>
                          <TableCell className="font-mono">{alert.order_number}</TableCell>
                          <TableCell>{alert.product_code}</TableCell>
                          <TableCell>{alert.quantity?.toLocaleString() || 0}개</TableCell>
                          <TableCell>{alert.due_date}</TableCell>
                          <TableCell>
                            <Badge variant={alert.days_left <= 2 ? "destructive" : "secondary"}>
                              {alert.days_left}일
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          납기 임박 주문이 없습니다 ✅
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Section 5: 모든 품목 현황 */}
            <Card className="bg-white border border-[#E5E7EB] shadow-md">
              <div className="border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
                <h2 className="text-[#1F2937] text-xl">모든 품목 현황</h2>
                <Button onClick={() => onNavigate('simulation')} variant="outline" className="border-[#2563EB] text-[#2563EB] hover:bg-blue-50">
                  <TrendingUp className="w-4 h-4 mr-2" />시뮬레이션 보기
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm text-[#6B7280]">품목명</th>
                      <th className="px-6 py-3 text-left text-sm text-[#6B7280]">현재 재고</th>
                      <th className="px-6 py-3 text-left text-sm text-[#6B7280]">상태</th>
                      <th className="px-6 py-3 text-left text-sm text-[#6B7280]">7일 수요</th>
                      <th className="px-6 py-3 text-left text-sm text-[#6B7280]">위험도</th>
                      <th className="px-6 py-3 text-left text-sm text-[#6B7280]">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingItems ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          재고 데이터 로딩 중...
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          등록된 재고가 없습니다
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const StatusIcon = statusConfig[item.status].icon;
                        return (
                          <tr key={item.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                            <td className="px-6 py-4 text-[#1F2937]">{item.name}</td>
                            <td className="px-6 py-4 text-[#1F2937]">{item.currentStock}개</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 ${statusConfig[item.status].color} rounded-full flex items-center justify-center`}>
                                  <StatusIcon className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[#1F2937]">{item.weekDemand}개</td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={`${statusConfig[item.status].textColor} border-current`}>
                                {item.risk}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <Button onClick={() => onNavigate('order')} size="sm" variant="outline" className="border-[#2563EB] text-[#2563EB] hover:bg-blue-50">
                                발주 계산
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
}