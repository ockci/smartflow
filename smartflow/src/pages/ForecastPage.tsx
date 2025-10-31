import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ColumnMappingDialog } from '../components/ColumnMappingDialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Line, ComposedChart, Bar } from 'recharts';
import {
  Brain,
  TrendingUp,
  AlertCircle,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Lightbulb,
  Calculator,
  ShoppingCart,
  Shield,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// 타입 정의 (수정됨 - probability 필수)
// ============================================

interface PredictionResult {
  will_order: boolean | null;
  quantity: number | null;
  confidence: string;
  probability: number;  // ⬅️ 필수로 변경 (? 제거)
}

interface HorizonForecast {
  horizon: string;
  date: string;
  prediction: PredictionResult;
  reasoning?: string;
}

interface DataAvailability {
  days_of_data: number;
  total_orders: number;
  can_use_ml: boolean;
  forecast_method: string;
}

interface ProductForecast {
  product_id: number;
  product_name: string;
  product_code: string;
  product_type?: string;  // ⬅️ 새로 추가
  method: string;
  data_availability: DataAvailability;
  forecasts: HorizonForecast[];
  message: string;
  action_required: boolean;
  recommendation: string;
}

interface Product {
  id: number;
  product_name: string;
  product_code: string;
  unit_price?: number;
}

interface ForecastPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

// ============================================
// 새 컴포넌트: 확률 게이지
// ============================================

const ProbabilityGauge = ({ probability }: { probability: number }) => {
  const percentage = Math.round(probability);
  const color = percentage >= 70 ? 'bg-green-500' : 
                percentage >= 40 ? 'bg-yellow-500' : 'bg-gray-400';
  
  return (
    <div className="w-full mt-3">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">주문 확률</span>
        <span className="text-sm font-bold text-gray-900">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`${color} h-2.5 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// ============================================
// 새 컴포넌트: 제품 타입 뱃지
// ============================================

const ProductTypeBadge = ({ type }: { type?: string }) => {
  if (!type) return null;
  
  const colorMap: Record<string, string> = {
    'Type A': 'bg-purple-100 text-purple-800 border-purple-300',
    'Stable': 'bg-blue-100 text-blue-800 border-blue-300',
    'Emergency': 'bg-red-100 text-red-800 border-red-300',
    'Sparse': 'bg-gray-100 text-gray-800 border-gray-300'
  };
  
  const color = colorMap[type] || colorMap['Sparse'];
  
  return (
    <Badge className={`${color} border font-medium`}>
      {type}
    </Badge>
  );
};

// ============================================
// 메인 컴포넌트
// ============================================

export const ForecastPage: React.FC<ForecastPageProps> = ({ onNavigate, onLogout }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);  // ✅
  const [forecast, setForecast] = useState<ProductForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  
  const getConfidenceVariant = (confidence: string) => {
    if (confidence === "높음") return "default";
    if (confidence === "중간") return "secondary";
    if (confidence === "낮음") return "outline";
    return "outline";
  };
  
  // 업로드 관련 state
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 발주 계산 관련 상태
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [leadTime, setLeadTime] = useState<number>(7);
  const [safetyStock, setSafetyStock] = useState<number>(200);
  const [showCalculation, setShowCalculation] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchSystemStatus();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8000/api/products/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        console.error('제품 로드 실패:', response.status);
        setProducts([]);
        return;
      }
      
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
      
      if (data.length > 0 && !selectedProductId) {
        setSelectedProductId(data[0].id);
      }
    } catch (error) {
      console.error('제품 로드 실패:', error);
      setProducts([]);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8000/api/ai-forecast/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      console.error('시스템 상태 로드 실패:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error('Excel(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/orders/upload-preview', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('파일 미리보기 실패');
      }

      const result = await response.json();
      setPreviewData(result.data);
      setShowMappingDialog(true);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('업로드 실패:', error);
      toast.error('파일 업로드에 실패했습니다. 파일 형식을 확인해주세요.');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadConfirm = () => {
    setShowMappingDialog(false);
    setPreviewData(null);
    fetchSystemStatus();
    toast.success('이제 AI 예측을 실행해보세요!');
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8000/api/orders/download/template', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('템플릿 다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '주문내역_템플릿.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('템플릿 다운로드 완료!');
    } catch (error) {
      console.error('템플릿 다운로드 실패:', error);
      toast.error('템플릿 다운로드에 실패했습니다.');
    }
  };

  const predictProduct = async (productId: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8000/api/ai-forecast/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: productId })
      });
      
      if (!response.ok) {
        throw new Error('예측 실패');
      }
      
      const data = await response.json();
      setForecast(data);
      setShowCalculation(true);
    } catch (error) {
      console.error('예측 실패:', error);
      toast.error('예측에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const calculateOrderQuantity = () => {
    if (!forecast) return 0;
    
    const totalPredictedDemand = forecast.forecasts.reduce((sum, h) => {
      return sum + (h.prediction.quantity || 0);
    }, 0);
    
    const avgDailyDemand = totalPredictedDemand / 4;
    const recommendedOrder = Math.max(0, 
      (avgDailyDemand * (leadTime + 7)) + safetyStock - currentStock
    );
    
    return Math.round(recommendedOrder);
  };

  const generateStockSimulation = () => {
    if (!forecast) return [];
    
    const data = [];
    let stock = currentStock;
    const orderQuantity = calculateOrderQuantity();
    const orderDay = 2;
    
    for (let day = 0; day <= 14; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      
      if (day === orderDay + leadTime && showCalculation) {
        stock += orderQuantity;
      }
      
      if (day > 0 && day <= 4 && forecast.forecasts[day - 1]) {
        const predictedDemand = forecast.forecasts[day - 1].prediction.quantity || 0;
        stock -= predictedDemand;
      } else if (day > 4) {
        const avgDemand = forecast.forecasts.reduce((sum, h) => 
          sum + (h.prediction.quantity || 0), 0) / 4;
        stock -= avgDemand;
      }
      
      data.push({
        day: `${date.getMonth() + 1}/${date.getDate()}`,
        stock: Math.max(0, Math.round(stock)),
        safetyLine: safetyStock,
        orderArrival: (day === orderDay + leadTime) ? stock : null
      });
    }
    
    return data;
  };

  const handleOrderConfirm = () => {
    const orderQuantity = calculateOrderQuantity();
    const selectedProduct = products.find(p => p.id === selectedProductId);
    
    if (!selectedProduct) return;
    
    toast.success(`발주 확정: ${selectedProduct.product_name} ${orderQuantity}개`);
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'MANUAL': return 'secondary';
      case 'RULE_BASED': return 'outline';
      case 'SIMPLE_ML': return 'default';
      case 'TWO_STAGE_AI': return 'default';
      default: return 'outline';
    }
  };

  // ============================================
  // 차트 데이터 생성 (확률 추가)
  // ============================================
  
  const chartData = forecast?.forecasts.map((h, idx) => ({
    name: h.horizon,
    date: h.date,
    quantity: h.prediction.quantity || 0,
    probability: h.prediction.probability || 0,  // ⬅️ 추가
  })) || [];

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const orderQuantity = calculateOrderQuantity();
  const totalCost = orderQuantity * (selectedProduct?.unit_price || 0);
  const stockSimulation = generateStockSimulation();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      <Sidebar currentPage="forecast" onNavigate={onNavigate} onLogout={onLogout} />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 헤더 */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Brain className="h-8 w-8 text-purple-600" />
                AI 수요 예측
              </h1>
              <p className="text-gray-600 mt-1">하이브리드 AI 시스템으로 정확한 발주량을 예측합니다</p>
            </div>
            
            {systemStatus && (
              <div className="text-right">
                <p className="text-sm text-gray-600">시스템 상태</p>
                <p className="text-lg font-semibold text-purple-600">{systemStatus.message}</p>
              </div>
            )}
          </div>

          {/* 주문 데이터 업로드 섹션 */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-6 w-6 text-blue-600" />
                주문 데이터 업로드
              </CardTitle>
              <CardDescription>
                과거 주문 내역을 업로드하면 AI 예측 정확도가 향상됩니다
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button 
                      variant="outline" 
                      className="w-full cursor-pointer"
                      disabled={uploading}
                      asChild
                    >
                      <span>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        {uploading ? '업로드 중...' : 'Excel/CSV 파일 선택'}
                      </span>
                    </Button>
                  </label>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  템플릿 다운로드
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 템플릿을 다운로드하여 양식에 맞게 작성 후 업로드하세요
              </p>
            </CardContent>
          </Card>

          {/* 제품 선택 및 예측 실행 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-600" />
                제품 선택
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Select
                    value={selectedProductId ? selectedProductId.toString() : ""}  // ✅
                    onValueChange={(value) => setSelectedProductId(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="제품을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.product_name} ({product.product_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={() => selectedProductId && predictProduct(selectedProductId)}
                  disabled={!selectedProductId || loading}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {loading ? '예측 중...' : 'AI 예측 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 예측 결과 */}
          {forecast && (
            <>
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        <TrendingUp className="h-6 w-6 text-purple-600" />
                        <span>{forecast.product_name}</span>
                        <ProductTypeBadge type={forecast.product_type} />
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {forecast.message}
                      </CardDescription>
                    </div>
                    <Badge variant={getMethodBadgeColor(forecast.method) as any}>
                      {forecast.method}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* 데이터 가용성 */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">보유 데이터</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {forecast.data_availability.days_of_data}일
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">총 주문 수</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {forecast.data_availability.total_orders}건
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">ML 사용 가능</p>
                        <p className="text-2xl font-bold">
                          {forecast.data_availability.can_use_ml ? (
                            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-8 w-8 text-gray-400 mx-auto" />
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* T+1 ~ T+4 예측 */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      향후 4일간 예측 (T+1 ~ T+4)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {forecast.forecasts.map((h, idx) => (
                        <Card key={idx} className={`
                          ${h.prediction.will_order ? 'border-2 border-green-400 bg-green-50' : 'border-gray-200'}
                        `}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{h.horizon}</CardTitle>
                                <CardDescription className="text-xs">{h.date}</CardDescription>
                              </div>
                              <Badge variant={getConfidenceVariant(h.prediction.confidence) as any}>
                                {h.prediction.confidence}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* 주문 여부 */}
                            <div className="flex items-center gap-2">
                              {h.prediction.will_order ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                              )}
                              <span className="text-sm font-medium">
                                {h.prediction.will_order ? '발주 예상' : '발주 없음'}
                              </span>
                            </div>

                            {/* 예측 수량 */}
                            <div className="p-3 bg-white rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">예측 수량</span>
                                <span className="font-bold text-lg">
                                  {h.prediction.quantity !== null ? `${h.prediction.quantity}개` : '-'}
                                </span>
                              </div>
                            </div>

                            {/* ⬇️ 확률 게이지 추가 */}
                            <ProbabilityGauge probability={h.prediction.probability} />

                            {/* 권장 사항 */}
                            {h.prediction.will_order && (
                              <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-center">
                                <p className="text-xs font-medium text-green-800">
                                  ✅ 발주 권장
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* ⬇️ 차트 개선: 확률 라인 추가 */}
                  <div className="mt-6">
                    <h3 className="font-semibold mb-4">예측 트렌드</h3>
                    <div className="bg-white p-4 rounded-lg border">
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis yAxisId="left" label={{ value: '수량 (개)', angle: -90, position: 'insideLeft' }} />
                          <YAxis yAxisId="right" orientation="right" label={{ value: '확률 (%)', angle: 90, position: 'insideRight' }} />
                          <Tooltip />
                          <Legend />
                          
                          {/* 수량 막대 */}
                          <Bar 
                            yAxisId="left"
                            dataKey="quantity" 
                            fill="#3b82f6" 
                            name="예측 수량"
                          />
                          
                          {/* 확률 라인 */}
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="probability" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            name="주문 확률 (%)"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 발주 계산 섹션 */}
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-6 w-6 text-purple-600" />
                    발주량 자동 계산
                  </CardTitle>
                  <CardDescription>AI 예측을 기반으로 최적 발주량을 계산합니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* 입력 파라미터 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="currentStock" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        현재 재고
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="currentStock"
                          type="number"
                          value={currentStock}
                          onChange={(e) => setCurrentStock(Number(e.target.value))}
                          className="text-lg"
                        />
                        <span className="flex items-center text-gray-600">개</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leadTime" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        평균 리드타임
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="leadTime"
                          type="number"
                          value={leadTime}
                          onChange={(e) => setLeadTime(Number(e.target.value))}
                          className="text-lg"
                        />
                        <span className="flex items-center text-gray-600">일</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="safetyStock" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        안전 재고
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="safetyStock"
                          type="number"
                          value={safetyStock}
                          onChange={(e) => setSafetyStock(Number(e.target.value))}
                          className="text-lg"
                        />
                        <span className="flex items-center text-gray-600">개</span>
                      </div>
                    </div>
                  </div>

                  {/* 계산 결과 */}
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">권장 발주량</p>
                        <p className="text-3xl font-bold text-purple-600">{orderQuantity.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">개</p>
                      </div>
                      
                      {selectedProduct?.unit_price && (
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <p className="text-sm text-gray-600 mb-1">예상 비용</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {totalCost.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">원</p>
                        </div>
                      )}
                      
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600 mb-1">예상 도착일</p>
                        <p className="text-xl font-bold text-green-600">
                          {new Date(Date.now() + leadTime * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{leadTime}일 후</p>
                      </div>
                    </div>
                  </div>

                  {/* 재고 추이 시뮬레이션 */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      14일 재고 추이 시뮬레이션
                    </h3>
                    <div className="bg-white p-4 rounded-lg border">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={stockSimulation}>
                          <defs>
                            <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <ReferenceLine 
                            y={safetyStock} 
                            label="안전재고" 
                            stroke="#ef4444" 
                            strokeDasharray="3 3" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="stock" 
                            stroke="#8b5cf6" 
                            fillOpacity={1} 
                            fill="url(#colorStock)" 
                            name="예상 재고"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 발주 확정 버튼 */}
                  <div className="flex gap-4">
                    <Button 
                      onClick={handleOrderConfirm}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      발주 확정 ({orderQuantity.toLocaleString()}개)
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setCurrentStock(0);
                        setLeadTime(7);
                        setSafetyStock(200);
                      }}
                    >
                      초기화
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 권장 사항 */}
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>{forecast.recommendation}</AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </div>

      {/* 컬럼 매핑 모달 */}
      {previewData && (
        <ColumnMappingDialog
          isOpen={showMappingDialog}
          onClose={() => {
            setShowMappingDialog(false);
            setPreviewData(null);
          }}
          previewData={previewData}
          onConfirm={handleUploadConfirm}
        />
      )}
    </div>
  );
};