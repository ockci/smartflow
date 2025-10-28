import { 
  AlertCircle, Package, CheckCircle, AlertTriangle, TrendingUp, ShoppingCart, 
  BarChart3, Clock, Bell 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Sidebar } from './Sidebar'; // Sidebar 컴포넌트 import
import { useDashboard } from '../utils/Usedashboard';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

// --- 데이터 정의 (모든 목업 데이터 통합) ---

// 1. 재고 아이템 데이터
interface Item {
  id: string; name: string; currentStock: number; weekDemand: number; daysLeft: number; status: 'urgent' | 'warning' | 'normal' | 'excess'; risk: string;
}
const mockItems: Item[] = [
    { id: '1', name: '전자부품 A-100', currentStock: 85, weekDemand: 280, daysLeft: 2.5, status: 'urgent', risk: '높음' },
    { id: '2', name: '나사 세트 B-50', currentStock: 320, weekDemand: 650, daysLeft: 4.2, status: 'warning', risk: '중간' },
    { id: '3', name: '절연재 C-30', currentStock: 200, weekDemand: 380, daysLeft: 5.8, status: 'warning', risk: '중간' },
    { id: '4', name: '케이블 D-80', currentStock: 1200, weekDemand: 400, daysLeft: 21.0, status: 'normal', risk: '낮음' },
    { id: '5', name: '커넥터 E-15', currentStock: 450, weekDemand: 200, daysLeft: 15.8, status: 'normal', risk: '낮음' },
    { id: '6', name: '고무링 F-22', currentStock: 890, weekDemand: 180, daysLeft: 34.6, status: 'excess', risk: '매우낮음' },
    { id: '7', name: '플라스틱 G-45', currentStock: 150, weekDemand: 420, daysLeft: 3.1, status: 'urgent', risk: '높음' },
    { id: '8', name: '센서 H-88', currentStock: 280, weekDemand: 520, daysLeft: 3.8, status: 'warning', risk: '중간' },
];

// 2. 오늘 생산 현황 데이터
interface ProductionStatus {
  id: string; machine: string; orderNumber: string; productCode: string; progress: number; estimatedCompletion: string; statusText: string;
}
const mockProductionStatus: ProductionStatus[] = [
  { id: 'p1', machine: '1호기', orderNumber: 'ORD-001', productCode: 'Product_c0', progress: 80, estimatedCompletion: '16:30', statusText: '진행중' },
  { id: 'p2', machine: '2호기', orderNumber: 'ORD-002', productCode: 'Product_c6', progress: 45, estimatedCompletion: '18:00', statusText: '진행중' },
  { id: 'p3', machine: '3호기', orderNumber: '---', productCode: '---', progress: 0, estimatedCompletion: '---', statusText: '대기중' },
];

// 3. 납기 임박 주문 데이터
interface UrgentOrder {
  id: string; orderNumber: string; productCode: string; quantity: number; daysLeft: number; dueDate: string;
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
  const { summary, production, alerts, loading, error } = useDashboard();
  const topThreeItems = mockItems.slice(0, 3);  // 이건 남겨둠
  
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
                <h1 className="text-[#1F2937] text-2xl">OrderAI</h1>
                <p className="text-sm text-[#6B7280]">발주 관리 대시보드</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-[#6B7280]">오늘</p>
                <p className="text-[#1F2937]">2025년 10월 24일</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content (from DashboardPage, with all sections) */}
        <main className="flex-1 px-6 py-8 overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white border border-[#E5E7EB] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
              <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-[#EF4444]" />
                      </div>
                      <div className="w-2 h-2 bg-[#EF4444] rounded-full animate-pulse" />
                  </div>
                  <p className="text-[#6B7280] text-sm mb-1">발주 필요</p>
                  <p className="text-4xl text-[#EF4444] mb-1">{summary?.urgent_orders || 0}개</p>
                  <p className="text-xs text-[#6B7280]">긴급 조치 필요</p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#E5E7EB] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
                        </div>
                        <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-pulse" />
                    </div>
                    <p className="text-[#6B7280] text-sm mb-1">주의 필요</p>
                    <p className="text-4xl text-[#F59E0B] mb-1">{summary?.pending_orders || 0}개</p>

                    <p className="text-xs text-[#6B7280]">모니터링 중</p>
                </CardContent>
            </Card>
            <Card className="bg-white border border-[#E5E7EB] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-[#10B981]" />
                        </div>
                    </div>
                    <p className="text-[#6B7280] text-sm mb-1">정상 상태</p>
                    <p className="text-4xl text-[#10B981] mb-1">{summary?.in_progress_orders || 0}개</p>
                    <p className="text-xs text-[#6B7280]">안정적 공급</p>
                </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[#2563EB] to-[#1E40AF] border-0 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <p className="text-white/90 text-sm mb-1">총 관리품목</p>
                    <p className="text-4xl text-white mb-1">{summary?.total_orders || 0}개</p>
                    <p className="text-xs text-white/80">전체 재고 항목</p>
                </CardContent>
            </Card>
          </div>

          {/* 오늘 생산 현황 (from original DashboardPage) */}
          <Card className="bg-white border border-[#E5E7EB] shadow-md mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> 오늘 생산 현황</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>사출기</TableHead>
                            <TableHead>주문번호</TableHead>
                            <TableHead>제품코드</TableHead>
                            <TableHead>진행률</TableHead>
                            <TableHead>예상 완료</TableHead>
                            <TableHead>상태</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {production.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium py-4">{p.machine_id}</TableCell>
                          <TableCell className="py-4">{p.order_number}</TableCell>
                          <TableCell className="py-4">{p.product_code}</TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <Progress value={p.progress} className="w-24" />
                              <span>{p.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">{p.estimated_completion}</TableCell>
                          <TableCell className="py-4"><Badge variant={p.status === 'in_progress' ? 'default' : 'outline'}>{p.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>

          {/* 납기 임박 주문 알림 (from original DashboardPage) */}
          <Card className="bg-white border border-[#E5E7EB] shadow-md mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-orange-500" /> 납기 임박 주문 알림</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>주문번호</TableHead>
                            <TableHead>제품코드</TableHead>
                            <TableHead>수량</TableHead>
                            <TableHead>남은 시간</TableHead>
                            <TableHead>납기일</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {alerts.slice(0, 3).map((alert, idx) => (
                            <TableRow key={idx} className="bg-orange-50 hover:bg-orange-100">
                              <TableCell className="font-mono py-4">{alert.order_number || '-'}</TableCell>
                              <TableCell className="py-4">{alert.message}</TableCell>
                              <TableCell className="py-4">-</TableCell>
                              <TableCell className="py-4"><Badge variant="destructive">{alert.severity}</Badge></TableCell>
                              <TableCell className="py-4">-</TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>

          {/* Top 3 Urgent Items */}
          <Card className="bg-white border border-[#E5E7EB] shadow-md mb-8">
            <div className="border-b border-[#E5E7EB] px-6 py-4 bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#EF4444]" />
                <h2 className="text-[#1F2937] text-xl">지금 발주해야 할 품목 TOP 3</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {topThreeItems.map((item, index) => (
                <Card key={item.id} className="border border-[#E5E7EB] hover:shadow-md hover:border-[#2563EB] transition-all duration-200">
                    <CardContent className="p-6 flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#2563EB] to-[#1E40AF] rounded-lg flex items-center justify-center text-white text-xl">{index + 1}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-[#1F2937] text-lg">{item.name}</h3>
                          <Badge className={`${statusConfig[item.status].color} text-white border-0 px-3 py-1`}>{statusConfig[item.status].text}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div><p className="text-xs text-gray-500 mb-1">현재 재고</p><p className="text-gray-800">{item.currentStock}개</p></div>
                          <div><p className="text-xs text-gray-500 mb-1">7일 수요</p><p className="text-gray-800">{item.weekDemand}개</p></div>
                          <div><p className="text-xs text-gray-500 mb-1">재고 소진</p><p className={statusConfig[item.status].textColor}>{item.daysLeft}일</p></div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => onNavigate('order')} className="bg-[#2563EB] hover:bg-[#1E40AF] text-white"><ShoppingCart className="w-4 h-4 mr-2" />발주하기 계산</Button>
                          <Button variant="outline" className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"><BarChart3 className="w-4 h-4 mr-2" />분석보기</Button>
                        </div>
                      </div>
                    </CardContent>
                </Card>
              ))}
            </div>
          </Card>

          {/* All Items Table */}
          <Card className="bg-white border border-[#E5E7EB] shadow-md">
            <div className="border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
              <h2 className="text-[#1F2937] text-xl">모든 품목 현황</h2>
              <Button onClick={() => onNavigate('simulation')} variant="outline" className="border-[#2563EB] text-[#2563EB] hover:bg-blue-50"><TrendingUp className="w-4 h-4 mr-2" />시뮬레이션 보기</Button>
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
                  {mockItems.map((item) => {
                    const StatusIcon = statusConfig[item.status].icon;
                    return (
                      <tr key={item.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-6 py-4 text-[#1F2937]">{item.name}</td>
                        <td className="px-6 py-4 text-[#1F2937]">{item.currentStock}개</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2"><div className={`w-8 h-8 ${statusConfig[item.status].color} rounded-full flex items-center justify-center`}><StatusIcon className="w-4 h-4 text-white" /></div></div>
                        </td>
                        <td className="px-6 py-4 text-[#1F2937]">{item.weekDemand}개</td>
                        <td className="px-6 py-4"><Badge variant="outline" className={`${statusConfig[item.status].textColor} border-current`}>{item.risk}</Badge></td>
                        <td className="px-6 py-4">
                          {item.status === 'urgent' || item.status === 'warning' ? (
                            <Button onClick={() => onNavigate('order')} size="sm" className="bg-[#2563EB] hover:bg-[#1E40AF] text-white">발주</Button>
                          ) : item.status === 'excess' ? (
                            <Button size="sm" variant="outline" className="border-[#6B7280] text-[#6B7280]">보류</Button>
                          ) : (
                            <span className="text-[#6B7280] text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}