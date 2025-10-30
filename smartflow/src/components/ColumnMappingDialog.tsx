import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ColumnMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: {
    columns: string[];
    sample_data: any[];
    total_rows: number;
    suggested_mapping: {
      product_code?: string;
      product_name?: string;
      quantity?: string;
      order_date?: string;
      due_date?: string;
      order_number?: string;
    };
    session_id: string;
  };
  onConfirm: () => void;
}

export const ColumnMappingDialog: React.FC<ColumnMappingDialogProps> = ({
  isOpen,
  onClose,
  previewData,
  onConfirm
}) => {
  const [mapping, setMapping] = useState(previewData.suggested_mapping);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    // 필수 필드 체크
    if (!mapping.product_code || !mapping.quantity || !mapping.order_date) {
      toast.error('제품코드, 수량, 주문일은 필수 입력입니다');
      return;
    }

    setConfirming(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // 특수 값을 null로 변환
      const cleanMapping = {
        product_code: mapping.product_code,
        quantity: mapping.quantity,
        order_date: mapping.order_date,
        product_name: mapping.product_name === '__NONE__' ? null : mapping.product_name,
        order_number: mapping.order_number === '__AUTO__' ? null : mapping.order_number,
        due_date: mapping.due_date === '__NONE__' ? null : mapping.due_date,
      };
      
      const response = await fetch('http://localhost:8000/api/orders/upload-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: previewData.session_id,
          column_mapping: cleanMapping
        })
      });

      if (!response.ok) {
        throw new Error('업로드 확정 실패');
      }

      const result = await response.json();
      toast.success(result.message);
      onConfirm();
      onClose();
    } catch (error) {
      console.error('업로드 확정 실패:', error);
      toast.error('업로드 확정에 실패했습니다');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        {/* 헤더 - 고정 */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>컬럼 매핑 확인</DialogTitle>
          <DialogDescription>
            업로드한 파일의 컬럼을 시스템 필드에 매칭해주세요.
            <br />
            총 <Badge variant="secondary">{previewData.total_rows}</Badge>개의 주문 데이터가 업로드됩니다.
          </DialogDescription>
        </DialogHeader>

        {/* 스크롤 영역 - 중간 컨텐츠 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* 샘플 데이터 미리보기 - 축약 */}
            <div>
              <h3 className="text-sm font-semibold mb-2">📋 샘플 데이터 (3개만 표시)</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-32 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {previewData.columns.slice(0, 5).map((col, idx) => (
                          <th key={idx} className="px-3 py-1.5 text-left font-semibold border-b text-xs">
                            {col}
                          </th>
                        ))}
                        {previewData.columns.length > 5 && (
                          <th className="px-3 py-1.5 text-left text-gray-400">...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.sample_data.slice(0, 2).map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-gray-50">
                          {previewData.columns.slice(0, 5).map((col, colIdx) => (
                            <td key={colIdx} className="px-3 py-1.5 border-b text-xs">
                              {row[col] || '-'}
                            </td>
                          ))}
                          {previewData.columns.length > 5 && (
                            <td className="px-3 py-1.5 text-gray-400">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 컬럼 매핑 - 간소화 */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                🎯 컬럼 매핑 설정
                <span className="text-xs font-normal text-gray-500">
                  (AI 자동 추천)
                </span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* 제품코드 (필수) */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs">
                    제품코드 <Badge variant="destructive" className="text-[10px] px-1">필수</Badge>
                  </Label>
                  <Select
                    value={mapping.product_code || ''}
                    onValueChange={(value) => setMapping({ ...mapping, product_code: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="컬럼 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {previewData.columns.map((col) => (
                        <SelectItem key={col} value={col} className="text-sm">
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 수량 (필수) */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs">
                    수량 <Badge variant="destructive" className="text-[10px] px-1">필수</Badge>
                  </Label>
                  <Select
                    value={mapping.quantity || ''}
                    onValueChange={(value) => setMapping({ ...mapping, quantity: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="컬럼 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {previewData.columns.map((col) => (
                        <SelectItem key={col} value={col} className="text-sm">
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 주문일 (필수) */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs">
                    주문일 <Badge variant="destructive" className="text-[10px] px-1">필수</Badge>
                  </Label>
                  <Select
                    value={mapping.order_date || ''}
                    onValueChange={(value) => setMapping({ ...mapping, order_date: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="컬럼 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {previewData.columns.map((col) => (
                        <SelectItem key={col} value={col} className="text-sm">
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 제품명 (선택) */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs">
                    제품명 <Badge variant="secondary" className="text-[10px] px-1">선택</Badge>
                  </Label>
                  <Select
                    value={mapping.product_name || '__NONE__'}
                    onValueChange={(value) => setMapping({ ...mapping, product_name: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="선택사항" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__" className="text-sm">선택 안함</SelectItem>
                      {previewData.columns.map((col) => (
                        <SelectItem key={col} value={col} className="text-sm">
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 주문번호 (선택) */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs">
                    주문번호 <Badge variant="secondary" className="text-[10px] px-1">선택</Badge>
                  </Label>
                  <Select
                    value={mapping.order_number || '__AUTO__'}
                    onValueChange={(value) => setMapping({ ...mapping, order_number: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="자동 생성" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__AUTO__" className="text-sm">자동 생성</SelectItem>
                      {previewData.columns.map((col) => (
                        <SelectItem key={col} value={col} className="text-sm">
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 납기일 (선택) */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs">
                    납기일 <Badge variant="secondary" className="text-[10px] px-1">선택</Badge>
                  </Label>
                  <Select
                    value={mapping.due_date || '__NONE__'}
                    onValueChange={(value) => setMapping({ ...mapping, due_date: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="선택사항" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__" className="text-sm">선택 안함</SelectItem>
                      {previewData.columns.map((col) => (
                        <SelectItem key={col} value={col} className="text-sm">
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 매핑 상태 - 축약 */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                {mapping.product_code && mapping.quantity && mapping.order_date ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-xs">✅ 매핑 완료</p>
                      <p className="text-xs text-gray-600">필수 항목이 모두 설정되었습니다.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-xs">⚠️ 필수 항목 미설정</p>
                      <p className="text-xs text-gray-600">제품코드, 수량, 주문일을 설정해주세요.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 - 고정 */}
        <DialogFooter className="px-6 py-4 border-t flex-shrink-0 bg-gray-50">
          <Button variant="outline" onClick={onClose} className="text-sm">
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!mapping.product_code || !mapping.quantity || !mapping.order_date || confirming}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
          >
            {confirming ? '업로드 중...' : `✅ 확인 (${previewData.total_rows}개 업로드)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};