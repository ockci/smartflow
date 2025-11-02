import { useState, useEffect } from 'react';
import { ShoppingCart, ArrowLeft, Download, Upload, Plus, CheckCircle, Clock, Package, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Sidebar } from './Sidebar';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

interface PurchaseOrderPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface PurchaseOrder {
  id: number;
  purchase_number: string;
  product_code: string;
  product_name: string;
  quantity: number;
  supplier: string | null;
  unit_price: number | null;
  total_price: number | null;
  order_date: string;
  expected_date: string | null;
  status: string;
  is_ai_recommended: boolean;
  priority: number;
  notes: string | null;
  created_at: string;
}

interface AIRecommendation {
  product_code: string;
  product_name: string;
  current_stock: number;
  safety_stock: number;
  shortage: number;
  recommended_quantity: number;
  priority: number;
  reason: string;
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-500', text: '발주 대기' },
  ordered: { icon: CheckCircle, color: 'bg-blue-500', text: '발주 완료' },
  received: { icon: Package, color: 'bg-green-500', text: '입고 완료' },
};

export function PurchaseOrderPage({ onNavigate, onLogout }: PurchaseOrderPageProps) {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    purchase_number: '',
    product_code: '',
    product_name: '',
    quantity: '',
    supplier: '',
    unit_price: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    priority: 3,
    notes: ''
  });

  useEffect(() => {
    fetchPurchaseOrders();
    fetchAIRecommendations();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/api/purchase-orders/list');
      setPurchases(response.data);
    } catch (error) {
      console.error('발주 목록 조회 실패:', error);
      toast.error('발주 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAIRecommendations = async () => {
    try {
      const response = await apiClient.get('/api/purchase-orders/ai-recommendations');
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('AI 추천 조회 실패:', error);
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await apiClient.post('/api/purchase-orders/create', {
        purchase_number: formData.purchase_number,
        product_code: formData.product_code,
        product_name: formData.product_name,
        quantity: parseInt(formData.quantity),
        supplier: formData.supplier || null,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
        order_date: formData.order_date,
        expected_date: formData.expected_date || null,
        priority: formData.priority,
        notes: formData.notes || null,
        is_ai_recommended: false
      });
      
      toast.success('발주가 등록되었습니다');
      setIsDialogOpen(false);
      fetchPurchaseOrders();
      
      // 폼 초기화
      setFormData({
        purchase_number: '',
        product_code: '',
        product_name: '',
        quantity: '',
        supplier: '',
        unit_price: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_date: '',
        priority: 3,
        notes: ''
      });
    } catch (error: any) {
      console.error('발주 등록 실패:', error);
      toast.error(error.response?.data?.detail || '발주 등록에 실패했습니다');
    }
  };

  const handleCreateFromRecommendation = async (rec: AIRecommendation) => {
    try {
      const purchaseNumber = `PO-${Date.now()}`;
      
      await apiClient.post('/api/purchase-orders/create', {
        purchase_number: purchaseNumber,
        product_code: rec.product_code,
        product_name: rec.product_name,
        quantity: rec.recommended_quantity,
        order_date: new Date().toISOString().split('T')[0],
        priority: rec.priority,
        notes: `AI 추천 발주: ${rec.reason}`,
        is_ai_recommended: true
      });
      
      toast.success('AI 추천 발주가 등록되었습니다');
      fetchPurchaseOrders();
      fetchAIRecommendations();
    } catch (error: any) {
      console.error('발주 등록 실패:', error);
      toast.error(error.response?.data?.detail || '발주 등록에 실패했습니다');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('파일을 선택해주세요');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await apiClient.post('/api/purchase-orders/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(response.data.message);
      setSelectedFile(null);
      fetchPurchaseOrders();
    } catch (error: any) {
      console.error('엑셀 업로드 실패:', error);
      toast.error(error.response?.data?.detail || '업로드에 실패했습니다');
    }
  };

  const handleStatusChange = async (purchaseId: number, newStatus: string) => {
    try {
      await apiClient.put(`/api/purchase-orders/update-status/${purchaseId}?status=${newStatus}`);
      toast.success('상태가 변경되었습니다');
      fetchPurchaseOrders();
    } catch (error) {
      console.error('상태 변경 실패:', error);
      toast.error('상태 변경에 실패했습니다');
    }
  };

  const pendingCount = purchases.filter(p => p.status === 'pending').length;
  const orderedCount = purchases.filter(p => p.status === 'ordered').length;
  const receivedCount = purchases.filter(p => p.status === 'received').length;
  const totalAmount = purchases.reduce((sum, p) => sum + (p.total_price || 0), 0);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      <Sidebar currentPage="purchase" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button onClick={() => onNavigate('dashboard')} variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                대시보드로
              </Button>
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#1F2937] text-2xl font-bold">발주 관리</h1>
                <p className="text-sm text-[#6B7280]">AI 추천 발주 및 발주 이력 관리</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`${apiClient.defaults.baseURL}/api/purchase-orders/download/template`}
                download
              >
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  템플릿 다운로드
                </Button>
              </a>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    엑셀 업로드
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>발주 엑셀 업로드</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <Button onClick={handleFileUpload} className="w-full">
                      업로드
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    수동 발주 등록
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>발주 등록</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePurchase} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>발주번호 *</Label>
                        <Input
                          required
                          value={formData.purchase_number}
                          onChange={(e) => setFormData({...formData, purchase_number: e.target.value})}
                          placeholder="PO-2025001"
                        />
                      </div>
                      <div>
                        <Label>제품코드 *</Label>
                        <Input
                          required
                          value={formData.product_code}
                          onChange={(e) => setFormData({...formData, product_code: e.target.value})}
                          placeholder="PROD001"
                        />
                      </div>
                      <div>
                        <Label>제품명 *</Label>
                        <Input
                          required
                          value={formData.product_name}
                          onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                          placeholder="제품A"
                        />
                      </div>
                      <div>
                        <Label>수량 *</Label>
                        <Input
                          required
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                          placeholder="1000"
                        />
                      </div>
                      <div>
                        <Label>공급업체</Label>
                        <Input
                          value={formData.supplier}
                          onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                          placeholder="공급업체명"
                        />
                      </div>
                      <div>
                        <Label>단가</Label>
                        <Input
                          type="number"
                          value={formData.unit_price}
                          onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                          placeholder="1000"
                        />
                      </div>
                      <div>
                        <Label>발주일 *</Label>
                        <Input
                          required
                          type="date"
                          value={formData.order_date}
                          onChange={(e) => setFormData({...formData, order_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>입고예정일</Label>
                        <Input
                          type="date"
                          value={formData.expected_date}
                          onChange={(e) => setFormData({...formData, expected_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>우선순위</Label>
                        <Select
                          value={formData.priority.toString()}
                          onValueChange={(value) => setFormData({...formData, priority: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">높음</SelectItem>
                            <SelectItem value="2">중간</SelectItem>
                            <SelectItem value="3">낮음</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>비고</Label>
                      <Input
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        placeholder="메모사항"
                      />
                    </div>
                    <Button type="submit" className="w-full">등록</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 overflow-y-auto">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white border border-[#E5E7EB]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#6B7280]">전체 발주</p>
                  <ShoppingCart className="w-5 h-5 text-[#2563EB]" />
                </div>
                <p className="text-3xl text-[#2563EB] mb-1">{purchases.length}건</p>
                <p className="text-xs text-[#6B7280]">총 {totalAmount.toLocaleString()}원</p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#E5E7EB]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#6B7280]">발주 대기</p>
                  <Clock className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <p className="text-3xl text-[#F59E0B] mb-1">{pendingCount}건</p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#E5E7EB]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#6B7280]">발주 완료</p>
                  <CheckCircle className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <p className="text-3xl text-[#3B82F6] mb-1">{orderedCount}건</p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#E5E7EB]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#6B7280]">입고 완료</p>
                  <Package className="w-5 h-5 text-[#10B981]" />
                </div>
                <p className="text-3xl text-[#10B981] mb-1">{receivedCount}건</p>
              </CardContent>
            </Card>
          </div>

          {/* AI 추천 발주 */}
          {recommendations.length > 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-800">🤖 AI 추천 발주</h2>
                  <Badge className="bg-blue-500 text-white">
                    {recommendations.length}건
                  </Badge>
                </div>
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-800">{rec.product_name}</span>
                            <span className="text-sm text-gray-500">({rec.product_code})</span>
                            <Badge className={rec.priority === 1 ? 'bg-red-500' : 'bg-yellow-500'}>
                              우선순위: {rec.priority === 1 ? '높음' : '중간'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>현재재고: {rec.current_stock}개</span>
                            <span>안전재고: {rec.safety_stock}개</span>
                            <span className="font-semibold text-blue-600">
                              추천발주량: {rec.recommended_quantity}개
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleCreateFromRecommendation(rec)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          발주 등록
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  💡 자동 발주 기능은 추후 업데이트 예정입니다
                </p>
              </CardContent>
            </Card>
          )}

          {/* 발주 이력 테이블 */}
          <Card className="bg-white border border-[#E5E7EB] shadow-md">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">발주 이력</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B7280]">발주번호</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B7280]">제품명</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B7280]">수량</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B7280]">공급업체</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B7280]">금액</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B7280]">발주일</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B7280]">상태</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#6B7280]">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
                        </td>
                      </tr>
                    ) : purchases.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                          발주 내역이 없습니다
                        </td>
                      </tr>
                    ) : (
                      purchases.map((purchase) => {
                        const status = purchase.status as keyof typeof statusConfig;
                        const StatusIcon = statusConfig[status]?.icon || Clock;
                        return (
                          <tr key={purchase.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {purchase.is_ai_recommended && (
                                  <Badge className="bg-blue-500 text-white text-xs">AI</Badge>
                                )}
                                <span className="font-medium">{purchase.purchase_number}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">{purchase.product_name}</td>
                            <td className="px-4 py-3">{purchase.quantity.toLocaleString()}개</td>
                            <td className="px-4 py-3">{purchase.supplier || '-'}</td>
                            <td className="px-4 py-3">
                              {purchase.total_price ? `${purchase.total_price.toLocaleString()}원` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {new Date(purchase.order_date).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={`${statusConfig[status]?.color} text-white`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig[status]?.text}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {purchase.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(purchase.id, 'ordered')}
                                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
                                >
                                  발주 완료
                                </Button>
                              )}
                              {purchase.status === 'ordered' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(purchase.id, 'received')}
                                  className="bg-green-500 hover:bg-green-600 text-white text-xs"
                                >
                                  입고 완료
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}