import { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Download, Search, Filter, Package, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sidebar } from './Sidebar';
import { orderAPI } from '@/lib/api';
import { toast } from 'sonner';

interface OrderHistoryPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface Order {
  id: number;
  order_number: string;
  product_code: string;
  product_name: string | null;
  quantity: number;
  due_date: string;
  priority: number;
  status: string;
  is_urgent: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-[#F59E0B]', text: '대기중' },
  confirmed: { icon: CheckCircle, color: 'bg-[#2563EB]', text: '확인됨' },
  in_production: { icon: Clock, color: 'bg-[#3B82F6]', text: '생산중' },
  completed: { icon: CheckCircle, color: 'bg-[#10B981]', text: '완료' },
  cancelled: { icon: XCircle, color: 'bg-[#6B7280]', text: '취소됨' },
};

export function OrderHistoryPage({ onNavigate, onLogout }: OrderHistoryPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await orderAPI.list();
      console.log('📦 주문 데이터:', data);
      setOrders(data);
    } catch (error) {
      console.error('주문 목록 조회 실패:', error);
      toast.error('주문 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // const handleStatusChange = async (orderId: number, newStatus: string) => {
  //   try {
  //     await orderAPI.updateStatus(orderId, newStatus);
  //     toast.success(`주문 상태가 '${newStatus}'로 변경되었습니다`);
  //     fetchOrders(); // 목록 새로고침
  //   } catch (error) {
  //     console.error('상태 업데이트 실패:', error);
  //     toast.error('상태 업데이트에 실패했습니다');
  //   }
  // };

  const handleCompleteOrder = async (orderId: number) => {
    try {
      await orderAPI.updateStatus(orderId, 'completed');
      toast.success('주문이 완료 처리되었습니다');
      fetchOrders();
    } catch (error) {
      console.error('완료 처리 실패:', error);
      toast.error('완료 처리에 실패했습니다');
    }
  };

  const handleStartProduction = async (orderId: number) => {
    try {
      await orderAPI.startProduction(orderId);
      toast.success('생산이 시작되었습니다');
      fetchOrders();
    } catch (error) {
      console.error('생산 시작 실패:', error);
      toast.error('생산 시작에 실패했습니다');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.product_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const confirmedCount = orders.filter(o => o.status === 'confirmed').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const inProductionCount = orders.filter(o => o.status === 'in_production').length;
  const totalQuantity = orders.reduce((sum, order) => sum + order.quantity, 0);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      <Sidebar currentPage="history" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button onClick={() => onNavigate('dashboard')} variant="ghost" size="sm" className="mr-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                대시보드로
              </Button>
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#1F2937] text-2xl">주문 관리</h1>
                <p className="text-sm text-[#6B7280]">전체 주문 내역 조회</p>
              </div>
            </div>
            <Button className="bg-[#10B981] hover:bg-[#059669] text-white">
              <Download className="w-4 h-4 mr-2" />
              엑셀 다운로드
            </Button>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white border border-[#E5E7EB] hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#6B7280]">전체 주문</p>
                  <Package className="w-5 h-5 text-[#2563EB]" />
                </div>
                <p className="text-3xl text-[#2563EB] mb-1">{orders.length}건</p>
                <p className="text-xs text-[#6B7280]">총 {totalQuantity.toLocaleString()}개</p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#E5E7EB] hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#6B7280]">완료</p>
                  <CheckCircle className="w-5 h-5 text-[#10B981]" />
                </div>
                <p className="text-3xl text-[#10B981] mb-1">{completedCount}건</p>
                <p className="text-xs text-[#6B7280]">생산 완료</p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#E5E7EB] hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#6B7280]">생산중</p>
                  <Clock className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <p className="text-3xl text-[#3B82F6] mb-1">{inProductionCount}건</p>
                <p className="text-xs text-[#6B7280]">생산 진행중</p>
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

          <Card className="bg-white border border-[#E5E7EB] shadow-md mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                    <Input
                      placeholder="제품명, 주문번호, 제품코드로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 h-11 border-[#D1D5DB]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="confirmed">확인됨</SelectItem>
                    <SelectItem value="in_production">생산중</SelectItem>
                    <SelectItem value="pending">대기중</SelectItem>
                    <SelectItem value="cancelled">취소됨</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E5E7EB] shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#6B7280]">주문번호</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#6B7280]">제품명</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#6B7280]">제품코드</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#6B7280]">수량</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#6B7280]">납기일</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#6B7280]">우선순위</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#6B7280]">상태</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#6B7280]">생성일</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#6B7280]">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-[#6B7280]">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
                          <span className="ml-3">주문 목록을 불러오는 중...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <FileText className="w-16 h-16 text-[#6B7280] mx-auto mb-4" />
                        <p className="text-[#6B7280]">
                          {searchTerm || statusFilter !== 'all' ? '검색 결과가 없습니다' : '주문 내역이 없습니다'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const status = order.status as keyof typeof statusConfig;
                      const StatusIcon = statusConfig[status]?.icon || Clock;
                      const statusInfo = statusConfig[status] || statusConfig.pending;
                      
                      return (
                        <tr key={order.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              {order.is_urgent && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-semibold">긴급</span>
                              )}
                              <span className="text-[#1F2937] font-medium">{order.order_number}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[#1F2937]">{order.product_name || '-'}</td>
                          <td className="px-6 py-4 text-[#6B7280] font-mono text-sm">{order.product_code}</td>
                          <td className="px-6 py-4 text-[#1F2937] font-semibold">{order.quantity.toLocaleString()}개</td>
                          <td className="px-6 py-4 text-sm text-[#6B7280]">
                            {new Date(order.due_date).toLocaleDateString('ko-KR')}
                          </td>
                          
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              order.priority === 1 ? 'bg-red-100 text-red-700' :
                              order.priority === 2 ? 'bg-orange-100 text-orange-700' :
                              order.priority === 3 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {order.priority === 1 ? '높음' : order.priority === 2 ? '중간' : order.priority === 3 ? '낮음' : '보통'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`${statusInfo.color} text-white border-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.text}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#6B7280]">
                            {new Date(order.created_at).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {order.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStartProduction(order.id)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
                                >
                                  생산 시작
                                </Button>
                              )}
                              {order.status === 'in_production' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteOrder(order.id)}
                                  className="bg-green-500 hover:bg-green-600 text-white text-xs"
                                >
                                  완료 처리
                                </Button>
                              )}
                              {order.status === 'completed' && (
                                <Badge className="bg-gray-200 text-gray-600 text-xs">
                                  완료됨
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}