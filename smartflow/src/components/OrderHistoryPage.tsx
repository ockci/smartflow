import { useState } from 'react';
import { FileText, ArrowLeft, Download, Search, Filter, Calendar, Package, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sidebar } from './Sidebar'; // Sidebar 컴포넌트 import

interface OrderHistoryPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface Order {
  id: string;
  orderNumber: string;
  itemName: string;
  quantity: number;
  amount: number;
  orderDate: string;
  expectedDate: string;
  actualDate?: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  supplier: string;
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2025-0215-001',
    itemName: '전자부품 A-100',
    quantity: 480,
    amount: 2400000,
    orderDate: '2025-02-15',
    expectedDate: '2025-02-22',
    actualDate: '2025-02-22',
    status: 'delivered',
    supplier: '㈜ 전자부품공급',
  },
  {
    id: '2',
    orderNumber: 'ORD-2025-0214-003',
    itemName: '나사 세트 B-50',
    quantity: 650,
    amount: 1950000,
    orderDate: '2025-02-14',
    expectedDate: '2025-02-19',
    status: 'confirmed',
    supplier: '㈜ 하드웨어코리아',
  },
  {
    id: '3',
    orderNumber: 'ORD-2025-0213-002',
    itemName: '절연재 C-30',
    quantity: 380,
    amount: 1710000,
    orderDate: '2025-02-13',
    expectedDate: '2025-02-19',
    status: 'pending',
    supplier: '㈜ 산업자재',
  },
  {
    id: '4',
    orderNumber: 'ORD-2025-02-12-005',
    itemName: '케이블 D-80',
    quantity: 400,
    amount: 3200000,
    orderDate: '2025-02-12',
    expectedDate: '2025-02-22',
    actualDate: '2025-02-21',
    status: 'delivered',
    supplier: '㈜ 케이블테크',
  },
  {
    id: '5',
    orderNumber: 'ORD-2025-02-11-001',
    itemName: '커넥터 E-15',
    quantity: 200,
    amount: 1000000,
    orderDate: '2025-02-11',
    expectedDate: '2025-02-16',
    status: 'cancelled',
    supplier: '㈜ 전자부품공급',
  },
  {
    id: '6',
    orderNumber: 'ORD-2025-02-10-007',
    itemName: '플라스틱 G-45',
    quantity: 420,
    amount: 1890000,
    orderDate: '2025-02-10',
    expectedDate: '2025-02-17',
    actualDate: '2025-02-17',
    status: 'delivered',
    supplier: '㈜ 폴리머산업',
  },
  {
    id: '7',
    orderNumber: 'ORD-2025-02-09-004',
    itemName: '센서 H-88',
    quantity: 520,
    amount: 2600000,
    orderDate: '2025-02-09',
    expectedDate: '2025-02-16',
    status: 'confirmed',
    supplier: '㈜ 센서테크',
  },
  {
    id: '8',
    orderNumber: 'ORD-2025-02-08-002',
    itemName: '고무링 F-22',
    quantity: 180,
    amount: 540000,
    orderDate: '2025-02-08',
    expectedDate: '2025-02-13',
    actualDate: '2025-02-13',
    status: 'delivered',
    supplier: '㈜ 고무공업',
  },
];

const statusConfig = {
  pending: { icon: Clock, color: 'bg-[#F59E0B]', text: '대기중' },
  confirmed: { icon: CheckCircle, color: 'bg-[#2563EB]', text: '확인됨' },
  delivered: { icon: CheckCircle, color: 'bg-[#10B981]', text: '완료' },
  cancelled: { icon: XCircle, color: 'bg-[#6B7280]', text: '취소됨' },
};

export function OrderHistoryPage({ onNavigate, onLogout }: OrderHistoryPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = mockOrders.reduce((sum, order) => order.status !== 'cancelled' ? sum + order.amount : sum, 0);
  const deliveredCount = mockOrders.filter(o => o.status === 'delivered').length;
  const pendingCount = mockOrders.filter(o => o.status === 'pending').length;
  const confirmedCount = mockOrders.filter(o => o.status === 'confirmed').length;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      {/* Sidebar */}
      <Sidebar currentPage="history" onNavigate={onNavigate} onLogout={onLogout} />


      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => onNavigate('dashboard')}
                variant="ghost"
                size="sm"
                className="mr-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                대시보드로
              </Button>
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#1F2937] text-2xl">발주 이력</h1>
                <p className="text-sm text-[#6B7280]">전체 발주 내역 조회</p>
              </div>
            </div>
            
            <Button className="bg-[#10B981] hover:bg-[#059669] text-white">
              <Download className="w-4 h-4 mr-2" />
              엑셀 다운로드
            </Button>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white border border-[#E5E7EB] hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#6B7280]">총 발주 금액</p>
                  <Package className="w-5 h-5 text-[#2563EB]" />
                </div>
                <p className="text-3xl text-[#2563EB] mb-1">
                  {(totalAmount / 10000).toFixed(0)}만원
                </p>
                <p className="text-xs text-[#6B7280]">이번 달 기준</p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#E5E7EB] hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#6B7280]">완료</p>
                  <CheckCircle className="w-5 h-5 text-[#10B981]" />
                </div>
                <p className="text-3xl text-[#10B981] mb-1">{deliveredCount}건</p>
                <p className="text-xs text-[#6B7280]">배송 완료</p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#E5E7EB] hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#6B7280]">진행중</p>
                  <CheckCircle className="w-5 h-5 text-[#2563EB]" />
                </div>
                <p className="text-3xl text-[#2563EB] mb-1">{confirmedCount}건</p>
                <p className="text-xs text-[#6B7280]">발주 확인됨</p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#E5E7EB] hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#6B7280]">대기중</p>
                  <Clock className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <p className="text-3xl text-[#F59E0B] mb-1">{pendingCount}건</p>
                <p className="text-xs text-[#6B7280]">확인 대기</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-white border border-[#E5E7EB] shadow-md mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                    <Input
                      placeholder="품목명 또는 발주번호로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 h-11 border-[#D1D5DB]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="delivered">완료</SelectItem>
                      <SelectItem value="confirmed">확인됨</SelectItem>
                      <SelectItem value="pending">대기중</SelectItem>
                      <SelectItem value="cancelled">취소됨</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    기간 선택
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card className="bg-white border border-[#E5E7EB] shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm text-[#6B7280]">발주번호</th>
                    <th className="px-6 py-4 text-left text-sm text-[#6B7280]">품목명</th>
                    <th className="px-6 py-4 text-left text-sm text-[#6B7280]">수량</th>
                    <th className="px-6 py-4 text-left text-sm text-[#6B7280]">금액</th>
                    <th className="px-6 py-4 text-left text-sm text-[#6B7280]">발주일</th>
                    <th className="px-6 py-4 text-left text-sm text-[#6B7280]">예상입고일</th>
                    <th className="px-6 py-4 text-left text-sm text-[#6B7280]">공급업체</th>
                    <th className="px-6 py-4 text-left text-sm text-[#6B7280]">상태</th>
                    <th className="px-6 py-4 text-left text-sm text-[#6B7280]">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const StatusIcon = statusConfig[order.status].icon;
                    return (
                      <tr 
                        key={order.id}
                        className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-[#1F2937]">{order.orderNumber}</td>
                        <td className="px-6 py-4 text-[#1F2937]">{order.itemName}</td>
                        <td className="px-6 py-4 text-[#1F2937]">{order.quantity}개</td>
                        <td className="px-6 py-4 text-[#1F2937]">{order.amount.toLocaleString()}원</td>
                        <td className="px-6 py-4 text-sm text-[#6B7280]">{order.orderDate}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="text-[#6B7280]">{order.expectedDate}</span>
                          {order.actualDate && (
                            <span className="text-xs text-[#10B981] block">실제: {order.actualDate}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#6B7280]">{order.supplier}</td>
                        <td className="px-6 py-4">
                          <Badge className={`${statusConfig[order.status].color} text-white border-0`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[order.status].text}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Button variant="ghost" size="sm" className="text-[#2563EB] hover:bg-blue-50">
                            상세보기
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-[#6B7280] mx-auto mb-4" />
                <p className="text-[#6B7280]">검색 결과가 없습니다</p>
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}