import { CheckCircle, Package, Calendar, DollarSign, AlertCircle, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

interface OrderConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderData: {
    itemName: string;
    quantity: number;
    amount: number;
    expectedDeliveryDate: Date;
  };
}

export function OrderConfirmDialog({ isOpen, onClose, onConfirm, orderData }: OrderConfirmDialogProps) {
  const orderNumber = `ORD-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#2563EB] to-[#1E40AF] rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl text-[#1F2937]">발주 확인</DialogTitle>
              <DialogDescription className="text-[#6B7280]">
                발주 정보를 확인하고 진행하세요
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Number */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">발주번호</p>
                <p className="text-lg text-[#1F2937] font-mono">{orderNumber}</p>
              </div>
              <Badge className="bg-[#2563EB] text-white border-0">
                신규 발주
              </Badge>
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-[#2563EB]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#6B7280] mb-1">품목명</p>
                <p className="text-[#1F2937]">{orderData.itemName}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">발주 수량</p>
                  <p className="text-xl text-[#1F2937]">{orderData.quantity}개</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">발주 금액</p>
                  <p className="text-xl text-[#10B981]">
                    {orderData.amount.toLocaleString()}원
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#6B7280] mb-1">예상 입고일</p>
                <p className="text-[#1F2937]">
                  {orderData.expectedDeliveryDate.getFullYear()}년{' '}
                  {orderData.expectedDeliveryDate.getMonth() + 1}월{' '}
                  {orderData.expectedDeliveryDate.getDate()}일
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
                  발주일로부터 약 {Math.ceil((orderData.expectedDeliveryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}일 소요
                </p>
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-gradient-to-br from-[#F0F9FF] to-[#F0FFFE] border border-[#2563EB]/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[#1F2937] mb-2">발주 요약</h3>
                <ul className="text-sm text-[#6B7280] space-y-1">
                  <li>• 발주가 확정되면 공급업체에 자동으로 전송됩니다</li>
                  <li>• 발주 확인 후 취소는 공급업체 정책에 따릅니다</li>
                  <li>• 발주 진행 상황은 발주 이력에서 확인할 수 있습니다</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-[#1F2937] mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
              이 발주의 장점
            </h3>
            <ul className="text-sm text-[#6B7280] space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#10B981] flex-shrink-0">✓</span>
                <span>AI 분석 기반 최적 수량으로 재고 부족 위험 최소화</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10B981] flex-shrink-0">✓</span>
                <span>향후 14일간 안정적인 재고 공급 보장</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10B981] flex-shrink-0">✓</span>
                <span>과다 재고 방지로 비용 효율성 극대화</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-11 border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
          >
            취소
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 h-11 bg-[#10B981] hover:bg-[#059669] text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            발주 확정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
