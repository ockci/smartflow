import { useState, useEffect } from 'react';
import { ArrowLeft, Box, Download, Upload, AlarmClock, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { orderAPI, convertOrder, type BackendOrder } from '../utils/api';
import { Sidebar } from '../components/Sidebar';

interface Order {
  id: string;
  orderNumber: string;
  productCode: string;
  productName?: string | null;
  quantity: number;
  dueDate: string;
  isUrgent?: boolean;
}

interface OrderUploadPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function OrderUploadPage({ onNavigate, onLogout }: OrderUploadPageProps) {
  const [uploadedOrders, setUploadedOrders] = useState<Order[]>([]);
  const [isUrgentDialogOpen, setIsUrgentDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 긴급 주문 폼
  const [urgentOrder, setUrgentOrder] = useState({
    order_number: '',
    product_code: '',
    quantity: 0,
    due_date: new Date().toISOString().split('T')[0],
  });

  // 주문 목록 불러오기
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await orderAPI.list();
      // pending 또는 scheduled 상태만 표시
      const filtered = data
        .filter((order: BackendOrder) => order.status === 'pending' || order.status === 'scheduled')
        .map(convertOrder);
      setUploadedOrders(filtered);
      
      if (filtered.length > 0) {
        toast.success(`${filtered.length}개의 주문이 대기 중입니다`);
      }
    } catch (error) {
      console.error('주문 목록 조회 실패:', error);
      toast.error('주문 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // 엑셀 업로드
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      toast.info('주문 엑셀 업로드 중...');
      
      const result = await orderAPI.uploadExcel(file);
      
      toast.success(`${result.count}개 주문이 등록되었습니다!`);
      
      // 목록 새로고침
      await fetchOrders();
    } catch (error: any) {
      console.error('엑셀 업로드 실패:', error);
      toast.error(error.response?.data?.detail || '엑셀 업로드에 실패했습니다');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  // 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const url = orderAPI.downloadTemplate();
    window.open(url, '_blank');
    toast.info('주문 템플릿 다운로드를 시작합니다');
  };

  // 긴급 주문 추가
  const handleAddUrgentOrder = async () => {
    if (!urgentOrder.order_number || !urgentOrder.product_code || urgentOrder.quantity <= 0) {
      toast.error('모든 필드를 입력해주세요');
      return;
    }

    try {
      await orderAPI.urgent(urgentOrder);
      toast.success('긴급 주문이 추가되었습니다!');
      
      // 폼 초기화
      setUrgentOrder({
        order_number: '',
        product_code: '',
        quantity: 0,
        due_date: new Date().toISOString().split('T')[0],
      });
      setIsUrgentDialogOpen(false);
      
      // 목록 새로고침
      await fetchOrders();
    } catch (error: any) {
      console.error('긴급 주문 추가 실패:', error);
      toast.error(error.response?.data?.detail || '긴급 주문 추가에 실패했습니다');
    }
  };

  // 스케줄 생성 페이지로 이동
  const handleGenerateSchedule = () => {
    if (uploadedOrders.length === 0) {
      toast.error('스케줄링할 주문이 없습니다');
      return;
    }
    
    toast.info('스케줄 생성 페이지로 이동합니다');
    onNavigate('schedule');
  };

  return (
  <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
    <Sidebar currentPage="orders" onNavigate={onNavigate} onLogout={onLogout} />
    
    <div className="flex-1 flex flex-col">
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[#1F2937] text-2xl">주문 등록</h1>
              <p className="text-sm text-[#6B7280]">엑셀 파일을 업로드하여 생산 계획을 시작합니다.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <Card className="bg-white border border-[#E5E7EB] shadow-md">
          <CardHeader>
            <CardTitle>주문 일괄 업로드</CardTitle>
            <CardDescription>
              템플릿을 다운로드하여 주문 정보를 입력한 후 업로드해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* 업로드 버튼 영역 */}
            <div className="flex justify-center gap-4 p-6 bg-gray-50 rounded-lg">
              <Button 
                variant="outline" 
                onClick={handleDownloadTemplate}
                className="h-11 border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
              >
                <Download className="w-4 h-4 mr-2" />
                주문 템플릿 다운로드
              </Button>
              
              <label htmlFor="order-excel-upload">
                <Button 
                  className="h-11 bg-[#10B981] hover:bg-[#059669] text-white"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? '업로드 중...' : '엑셀 업로드'}
                  </span>
                </Button>
              </label>
              <input
                id="order-excel-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </div>

            {/* 업로드된 주문 미리보기 */}
            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
                <p className="mt-2 text-gray-500">주문 불러오는 중...</p>
              </div>
            ) : uploadedOrders.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium text-[#1F2937] mb-4">
                  대기 중인 주문 ({uploadedOrders.length}건)
                </h3>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>주문번호</TableHead>
                        <TableHead>제품코드</TableHead>
                        <TableHead>수량</TableHead>
                        <TableHead>납기일</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.orderNumber}</TableCell>
                          <TableCell>{order.productCode}</TableCell>
                          <TableCell>{order.quantity.toLocaleString()} 개</TableCell>
                          <TableCell>{order.dueDate}</TableCell>
                          <TableCell>
                            {order.isUrgent && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                긴급
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <Box className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>등록된 주문이 없습니다</p>
                <p className="text-sm mt-2">엑셀 파일을 업로드하거나 긴급 주문을 추가하세요</p>
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Dialog open={isUrgentDialogOpen} onOpenChange={setIsUrgentDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50">
                    <AlarmClock className="w-4 h-4 mr-2" />
                    긴급 주문 추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>긴급 주문 추가</DialogTitle>
                    <DialogDescription>
                      긴급 생산이 필요한 주문 정보를 입력하세요.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="urgent-order" className="text-right">주문번호</Label>
                      <Input
                        id="urgent-order"
                        value={urgentOrder.order_number}
                        onChange={(e) => setUrgentOrder({ ...urgentOrder, order_number: e.target.value })}
                        placeholder="URG-001"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="urgent-product" className="text-right">제품코드</Label>
                      <Input
                        id="urgent-product"
                        value={urgentOrder.product_code}
                        onChange={(e) => setUrgentOrder({ ...urgentOrder, product_code: e.target.value })}
                        placeholder="Product_urgent"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="urgent-quantity" className="text-right">수량</Label>
                      <Input
                        id="urgent-quantity"
                        type="number"
                        value={urgentOrder.quantity || ''}
                        onChange={(e) => setUrgentOrder({ ...urgentOrder, quantity: parseInt(e.target.value) || 0 })}
                        placeholder="1000"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="urgent-due" className="text-right">납기일</Label>
                      <Input
                        id="urgent-due"
                        type="date"
                        value={urgentOrder.due_date}
                        onChange={(e) => setUrgentOrder({ ...urgentOrder, due_date: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddUrgentOrder}>추가</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleGenerateSchedule}
                disabled={uploadedOrders.length === 0}
                className="bg-[#2563EB] hover:bg-[#1E40AF] text-white disabled:bg-gray-400"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                스케줄 생성하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  </div>
  );
}