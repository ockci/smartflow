import { useState } from 'react';
import { Package, Clock, Shield, Calculator, RefreshCw, CheckCircle, FileText, TrendingUp, Lightbulb, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { OrderConfirmDialog } from './OrderConfirmDialog';
import { toast } from 'sonner';
import { Sidebar } from './Sidebar'; // Sidebar 컴포넌트 import

interface OrderCalculationPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const items = [
  { id: '1', name: '전자부품 A-100', defaultStock: 85, defaultLeadTime: 7, defaultSafety: 200, unitPrice: 5000 },
  { id: '2', name: '나사 세트 B-50', defaultStock: 320, defaultLeadTime: 5, defaultSafety: 150, unitPrice: 3000 },
  { id: '3', name: '절연재 C-30', defaultStock: 200, defaultLeadTime: 6, defaultSafety: 180, unitPrice: 4500 },
  { id: '4', name: '케이블 D-80', defaultStock: 1200, defaultLeadTime: 10, defaultSafety: 300, unitPrice: 8000 },
];

export function OrderCalculationPage({ onNavigate, onLogout }: OrderCalculationPageProps) {
  const [selectedItem, setSelectedItem] = useState(items[0]);
  const [currentStock, setCurrentStock] = useState(selectedItem.defaultStock);
  const [leadTime, setLeadTime] = useState(selectedItem.defaultLeadTime);
  const [safetyStock, setSafetyStock] = useState(selectedItem.defaultSafety);
  const [calculated, setCalculated] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Calculation results
  const dailyDemand = 40; // 일일 평균 수요
  const recommendedOrder = Math.max(0, (dailyDemand * (leadTime + 7)) + safetyStock - currentStock);
  const totalCost = recommendedOrder * selectedItem.unitPrice;
  const expectedDeliveryDate = new Date();
  expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + leadTime);
  
  // Generate forecast data
  const generateForecastData = () => {
    const data = [];
    let stock = currentStock;
    const orderDay = 2;
    
    for (let day = 0; day <= 14; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      
      if (day === orderDay + leadTime && calculated) {
        stock += recommendedOrder;
      }
      
      if (day > 0) {
        stock -= dailyDemand;
      }
      
      data.push({
        day: `${date.getMonth() + 1}/${date.getDate()}`,
        stock: Math.max(0, Math.round(stock)),
        safetyLine: safetyStock,
      });
    }
    
    return data;
  };

  const forecastData = generateForecastData();
  
  const handleItemChange = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setSelectedItem(item);
      setCurrentStock(item.defaultStock);
      setLeadTime(item.defaultLeadTime);
      setSafetyStock(item.defaultSafety);
      setCalculated(false);
    }
  };

  const handleCalculate = () => {
    setCalculated(true);
  };

  const handleReset = () => {
    setCurrentStock(selectedItem.defaultStock);
    setLeadTime(selectedItem.defaultLeadTime);
    setSafetyStock(selectedItem.defaultSafety);
    setCalculated(false);
  };

  const stockAfterOrder = currentStock + recommendedOrder;
  const stockAfter14Days = Math.max(0, stockAfterOrder - (dailyDemand * 14));
  const shortageRisk = stockAfter14Days < safetyStock ? '중간' : '매우 낮음';
  const shortagePercent = stockAfter14Days < safetyStock ? 15 : 2;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      {/* Sidebar */}
      <Sidebar currentPage="order" onNavigate={onNavigate} onLogout={onLogout} />

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
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#1F2937] text-2xl">발주량 계산</h1>
                <p className="text-sm text-[#6B7280]">최적 발주 계획 수립</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Side - Input Form */}
            <div className="lg:col-span-2">
              <Card className="bg-white border border-[#E5E7EB] shadow-md sticky top-24">
                <div className="border-b border-[#E5E7EB] px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50">
                  <h2 className="text-[#1F2937] text-xl">발주량 계산</h2>
                </div>
                
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-[#374151]">
                      <Package className="w-4 h-4" />
                      품목 선택
                    </Label>
                    <Select value={selectedItem.id} onValueChange={handleItemChange}>
                      <SelectTrigger className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-[#374151]">
                      <Package className="w-4 h-4" />
                      현재 재고
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={currentStock}
                        onChange={(e) => setCurrentStock(Number(e.target.value))}
                        className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                      />
                      <span className="text-[#6B7280] whitespace-nowrap">개</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-[#374151]">
                      <Clock className="w-4 h-4" />
                      평균 리드타임
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={leadTime}
                        onChange={(e) => setLeadTime(Number(e.target.value))}
                        className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                      />
                      <span className="text-[#6B7280] whitespace-nowrap">일</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-[#374151]">
                      <Shield className="w-4 h-4" />
                      안전 재고
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={safetyStock}
                        onChange={(e) => setSafetyStock(Number(e.target.value))}
                        className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                      />
                      <span className="text-[#6B7280] whitespace-nowrap">개 (권장)</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="flex-1 h-11 border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      초기화
                    </Button>
                    <Button
                      onClick={handleCalculate}
                      className="flex-1 h-11 bg-[#2563EB] hover:bg-[#1E40AF] text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      계산
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Results */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <div className="border-b border-[#E5E7EB] px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#10B981]" />
                    <h2 className="text-[#1F2937] text-xl">최적 발주 계획</h2>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {!calculated ? (
                    <div className="text-center py-12">
                      <Calculator className="w-16 h-16 text-[#6B7280] mx-auto mb-4" />
                      <p className="text-[#6B7280]">좌측 폼을 입력하고 '계산' 버튼을 클릭하세요</p>
                    </div>
                  ) : (
                    <>
                      {/* Recommended Order Quantity */}
                      <div>
                        <p className="text-[#6B7280] mb-2">추천 발주량</p>
                        <Card className="bg-gradient-to-br from-[#2563EB] to-[#1E40AF] border-0">
                          <CardContent className="p-6 text-center">
                            <p className="text-5xl text-white mb-2">{recommendedOrder}개</p>
                            <p className="text-white/90">
                              (금액: {totalCost.toLocaleString()}원)
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Recommended Order Date */}
                      <div>
                        <p className="text-[#6B7280] mb-2">추천 발주 시점</p>
                        <Card className="bg-green-50 border border-green-200">
                          <CardContent className="p-6">
                            <p className="text-[#1F2937] mb-1">
                              <span className="text-[#10B981]">● </span>
                              금일 ({new Date().getMonth() + 1}월 {new Date().getDate()}일)
                            </p>
                            <p className="text-[#6B7280] text-sm">
                              예상 입고: {expectedDeliveryDate.getMonth() + 1}월 {expectedDeliveryDate.getDate()}일 (리드타임 {leadTime}일)
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Effect Simulation */}
                      <div>
                        <p className="text-[#6B7280] mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          효과 시뮬레이션
                        </p>
                        <Card className="border border-[#E5E7EB]">
                          <CardContent className="p-6 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="w-1 h-6 bg-[#10B981] rounded-full" />
                              <div>
                                <p className="text-[#1F2937]">발주 후 재고: <span className="text-[#10B981]">{stockAfterOrder}개</span> (최적 수준)</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-1 h-6 bg-[#F59E0B] rounded-full" />
                              <div>
                                <p className="text-[#1F2937]">14일 후 재고: <span className="text-[#F59E0B]">{stockAfter14Days}개</span> (안전선 근처)</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-1 h-6 bg-[#2563EB] rounded-full" />
                              <div>
                                <p className="text-[#1F2937]">재고 부족 위험: <span className="text-[#2563EB]">{shortageRisk}</span> ({shortagePercent}%)</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-1 h-6 bg-[#6B7280] rounded-full" />
                              <div>
                                <p className="text-[#1F2937]">과다 재고 비용: <span className="text-[#6B7280]">예상 없음</span></p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Insight */}
                      <div>
                        <Card className="bg-amber-50 border border-amber-200">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Lightbulb className="w-5 h-5 text-[#F59E0B]" />
                              </div>
                              <div>
                                <p className="text-sm text-[#1F2937] mb-1">💡 인사이트</p>
                                <p className="text-[#6B7280]">
                                  "이 수량으로 발주하면 향후 14일간 안정적인 공급이 보장됩니다. 
                                  현재 수요 패턴이 유지될 경우, 재고 부족 위험은 {shortagePercent}%로 매우 낮습니다."
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setIsDialogOpen(true)}
                          className="flex-1 h-11 bg-[#10B981] hover:bg-[#059669] text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          이 금액으로 발주
                        </Button>
                        <Button 
                          onClick={handleReset}
                          variant="outline" 
                          className="flex-1 h-11 border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          재계산
                        </Button>
                        <Button 
                          onClick={() => onNavigate('history')}
                          variant="outline" 
                          className="flex-1 h-11 border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          발주 이력
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Forecast Chart */}
              {calculated && (
                <Card className="bg-white border border-[#E5E7EB] shadow-md">
                  <div className="border-b border-[#E5E7EB] px-6 py-4">
                    <h2 className="text-[#1F2937] text-xl">향후 14일 재고 추이</h2>
                  </div>
                  
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={forecastData}>
                        <defs>
                          <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="day" 
                          stroke="#6B7280"
                          tick={{ fill: '#6B7280' }}
                        />
                        <YAxis 
                          stroke="#6B7280"
                          tick={{ fill: '#6B7280' }}
                          label={{ value: '재고 (개)', angle: -90, position: 'insideLeft', fill: '#6B7280' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        />
                        <ReferenceLine 
                          y={safetyStock} 
                          stroke="#F59E0B" 
                          strokeDasharray="5 5" 
                          label={{ value: '안전선', fill: '#F59E0B', position: 'right' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="stock" 
                          stroke="#2563EB" 
                          strokeWidth={3}
                          fill="url(#stockGradient)"
                          dot={{ fill: '#2563EB', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    
                    <div className="flex items-center gap-6 mt-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#2563EB] rounded-full" />
                        <span className="text-[#6B7280]">예상 재고</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-0.5 bg-[#F59E0B] border-t-2 border-dashed border-[#F59E0B]" />
                        <span className="text-[#6B7280]">안전 재고선</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>

        {/* Order Confirm Dialog */}
        <OrderConfirmDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onConfirm={() => {
            toast.success('발주가 성공적으로 완료되었습니다!');
            setIsDialogOpen(false);
            setTimeout(() => {
              onNavigate('history');
            }, 1000);
          }}
          orderData={{
            itemName: selectedItem.name,
            quantity: recommendedOrder,
            amount: totalCost,
            expectedDeliveryDate: expectedDeliveryDate,
          }}
        />
      </div>
    </div>
  );
}