import { useState, useEffect } from 'react';  // 👈 추가!
import { 
  AlertCircle, Package, CheckCircle, AlertTriangle, TrendingUp, ShoppingCart, 
  BarChart3, Clock, Bell 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Sidebar } from './Sidebar';
import { useDashboard } from '../utils/Usedashboard';
import { inventoryAPI } from '../utils/api';
import { toast } from 'sonner';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

// --- 데이터 정의 (모든 목업 데이터 통합) ---

// 1. 재고 아이템 데이터
interface Item {
  id: string; 
  name: string; 
  currentStock: number; 
  weekDemand: number; 
  daysLeft: number; 
  status: 'urgent' | 'warning' | 'normal' | 'excess'; 
  risk: string;
}

// 2. 오늘 생산 현황 데이터
interface ProductionStatus {
  id: string; 
  machine: string; 
  orderNumber: string; 
  productCode: string; 
  progress: number; 
  estimatedCompletion: string; 
  statusText: string;
}
const mockProductionStatus: ProductionStatus[] = [
  { id: 'p1', machine: '1호기', orderNumber: 'ORD-001', productCode: 'Product_c0', progress: 80, estimatedCompletion: '16:30', statusText: '진행중' },
  { id: 'p2', machine: '2호기', orderNumber: 'ORD-002', productCode: 'Product_c6', progress: 45, estimatedCompletion: '18:00', statusText: '진행중' },
  { id: 'p3', machine: '3호기', orderNumber: '---', productCode: '---', progress: 0, estimatedCompletion: '---', statusText: '대기중' },
];

// 3. 납기 임박 주문 데이터
interface UrgentOrder {
  id: string; 
  orderNumber: string; 
  productCode: string; 
  quantity: number; 
  daysLeft: number; 
  dueDate: string;
}
const mockUrgentOrders: UrgentOrder[] = [
  { id: 'u1', orderNumber: 'ORD-005', productCode: 'Product_e5', quantity: 3000, daysLeft: 2, dueDate: '2025-11-17' },
  { id: 'u2', orderNumber: 'ORD-008', productCode: 'Product_h2', quantity: 1200, daysLeft: 3, dueDate: '2025-11-18' },
  { id: 'u3', orderNumber: 'ORD-007', productCode: 'Product_g1', quantity: 2500, daysLeft: 5, dueDate: '2025-11-20' },
];

const statusConfig = {
  urgent: { icon: AlertCircle, color: 'bg-[#EF4444]', text: '긴급', textColor: 'text-[#EF4444]' },
  warning: { icon: AlertTriangle, color: 'bg-[#F59E0B]', text: '주의', textColor: 'text-[#F59E0B]' },
  normal: { icon: CheckCircle, color: 'bg-[#10B981]', text: '정상', textColor: 'text-[#10B981]' },
  excess: { icon: Package, color: 'bg-[#6B7280]', text: '과다', textColor: 'text-[#6B7280]' },
};


export function DashboardPage({ onNavigate, onLogout }: DashboardPageProps) {
  // ⭐ Hook들은 여기 안에!
  const { summary, production, alerts, loading, error } = useDashboard();
  
  // ⭐ 재고 데이터 state
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // ⭐ 재고 데이터 불러오기
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

  // ⭐ TOP 3 필터링
  const topThreeItems = items
    .filter(item => item.status === 'urgent' || item.status === 'warning')
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);
  
  if (loading) return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">에러: {error}</div>;
  

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      {/* Sidebar (from DashboardPage2) */}
      <Sidebar currentPage="dashboard" onNavigate={onNavigate} onLogout={onLogout} />


      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header (from DashboardPage2) */}
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
                <p className="text-[#1F2937]">2025년 10월 29일</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content (from DashboardPage, with all sections) */}
        <main className="flex-1 p-6">
          <div className="space-y-6">
            
            {/* Section 1: KPI Cards (summary from backend) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-[#6B7280]">총 주문</CardTitle><ShoppingCart className="w-4 h-4 text-[#6B7280]" /></CardHeader>
                <CardContent><div className="text-2xl text-[#1F2937]">{summary?.total_orders || 0}건</div><p className="text-xs text-[#10B981] mt-1">+{summary?.pending_orders || 0} 대기중</p></CardContent>
              </Card>

              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-[#6B7280]">완료 주문</CardTitle><CheckCircle className="w-4 h-4 text-[#6B7280]" /></CardHeader>
                <CardContent><div className="text-2xl text-[#1F2937]">{summary?.completed_orders || 0}건</div><p className="text-xs text-[#6B7280] mt-1">전체의 {summary?.completion_rate || 0}%</p></CardContent>
              </Card>

              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-[#6B7280]">긴급 주문</CardTitle><AlertCircle className="w-4 h-4 text-[#EF4444]" /></CardHeader>
                <CardContent><div className="text-2xl text-[#EF4444]">{summary?.urgent_orders || 0}건</div><p className="text-xs text-[#6B7280] mt-1">즉시 처리 필요</p></CardContent>
              </Card>

              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-[#6B7280]">재고 부족</CardTitle><Package className="w-4 h-4 text-[#F59E0B]" /></CardHeader>
                <CardContent><div className="text-2xl text-[#F59E0B]">{summary?.low_stock_items || 0}개</div><p className="text-xs text-[#6B7280] mt-1">발주 검토 필요</p></CardContent>
              </Card>
            </div>

            {/* Section 2: 지금 발주해야 할 품목 TOP 3 */}
            <Card className="bg-white border border-[#E5E7EB] shadow-md">
              <div className="border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
                <h2 className="text-[#1F2937] text-xl">🚨 지금 발주해야 할 품목 TOP 3</h2>
                <Button onClick={() => onNavigate('order')} variant="outline" className="border-[#2563EB] text-[#2563EB] hover:bg-blue-50">
                  <BarChart3 className="w-4 h-4 mr-2" />발주 계산하기
                </Button>
              </div>
              <div className="p-6 space-y-4">
                {loadingItems ? (
                  <div className="text-center py-8 text-gray-500">재고 데이터 로딩 중...</div>
                ) : topThreeItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">긴급 재고가 없습니다 ✅</div>
                ) : (
                  topThreeItems.map((item, index) => {
                    const StatusIcon = statusConfig[item.status].icon;
                    return (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full border-2 border-[#E5E7EB]">
                            <span className="text-[#1F2937]">{index + 1}</span>
                          </div>
                          <div>
                            <h3 className="text-[#1F2937] font-medium">{item.name}</h3>
                            <p className="text-sm text-[#6B7280]">현재 재고: {item.currentStock}개 | 7일 수요: {item.weekDemand}개</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-[#6B7280]">남은 재고 기간</p>
                            <p className="text-lg text-[#EF4444]">{item.daysLeft}일</p>
                          </div>
                          <div className={`w-12 h-12 ${statusConfig[item.status].color} rounded-full flex items-center justify-center`}>
                            <StatusIcon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Section 3: 오늘 생산 현황 (production from backend) */}
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

            {/* Section 4: 납기 임박 주문 (alerts from backend) */}
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