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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
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

interface PredictionResult {
  will_order: boolean | null;
  quantity: number | null;
  confidence: string;
  probability?: number;
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

export const ForecastPage: React.FC<ForecastPageProps> = ({ onNavigate, onLogout }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
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

  // 파일 업로드 핸들러 (Step 1: 미리보기)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 형식 체크
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
      
      // 파일 입력 초기화
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

  // 업로드 확정 후 처리
  const handleUploadConfirm = () => {
    setShowMappingDialog(false);
    setPreviewData(null);
    fetchSystemStatus(); // 시스템 상태 새로고침
    toast.success('이제 AI 예측을 실행해보세요!');
  };

  // 템플릿 다운로드
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
                AI 발주 시스템
              </h1>
              <p className="text-gray-600 mt-1">AI 예측 기반 스마트 발주 계산</p>
            </div>
          </div>

          {/* 과거 데이터 업로드 카드 */}
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                📤 과거 주문 데이터 업로드
              </CardTitle>
              <CardDescription>
                과거 주문 내역을 업로드하면 즉시 AI 예측이 가능합니다 (CSV/Excel 모두 지원)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    템플릿 다운로드
                  </Button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="history-upload"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? '파일 분석 중...' : '과거 주문 내역 업로드'}
                  </Button>
                </div>
                
                <div className="bg-white/80 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-gray-900">✨ 어떤 형식이든 OK!</p>
                      <ul className="space-y-1 text-gray-600">
                        <li>• Excel 또는 CSV 파일 업로드</li>
                        <li>• AI가 컬럼을 자동으로 인식</li>
                        <li>• 회사별 맞춤 포맷 자동 매핑</li>
                        <li>• 제품이 없으면 자동 생성!</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          

          {/* 시스템 상태 카드 */}
          {systemStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  시스템 상태
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">총 제품</p>
                    <p className="text-2xl font-bold">{systemStatus.total_products}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">데이터 부족</p>
                    <p className="text-2xl font-bold text-orange-600">{systemStatus.by_method?.MANUAL || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">규칙 기반</p>
                    <p className="text-2xl font-bold">{systemStatus.by_method?.RULE_BASED || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">AI 모델</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {systemStatus.by_method?.TWO_STAGE_AI || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          
          {systemStatus?.status === 'AI_READY' && (
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  AI 모델 성능
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">평균 정확도</p>
                    <p className="text-2xl font-bold text-purple-600">88.5%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">평균 오차</p>
                    <p className="text-2xl font-bold text-blue-600">15.96</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">모델 버전</p>
                    <p className="text-2xl font-bold text-green-600">v2.0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          {/* 제품 선택 및 예측 */}
          <Card>
            <CardHeader>
              <CardTitle>제품 선택 및 AI 예측</CardTitle>
              <CardDescription>제품을 선택하고 AI 예측을 실행하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Select
                    value={selectedProductId?.toString()}
                    onValueChange={(value) => setSelectedProductId(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="제품 선택" />
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
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? '예측 중...' : '🤖 AI 예측 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI 예측 결과 */}
          {forecast && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{forecast.product_name} - AI 예측 결과</span>
                    <Badge variant={getMethodBadgeColor(forecast.method)}>
                      {forecast.method}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{forecast.message}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 데이터 가용성 */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">데이터 현황</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">데이터 일수</p>
                        <p className="font-bold">{forecast.data_availability.days_of_data}일</p>
                      </div>
                      <div>
                        <p className="text-gray-600">총 주문 건수</p>
                        <p className="font-bold">{forecast.data_availability.total_orders}건</p>
                      </div>
                      <div>
                        <p className="text-gray-600">예측 방법</p>
                        <p className="font-bold">{forecast.data_availability.forecast_method}</p>
                      </div>
                    </div>
                  </div>

                  {/* T+1 ~ T+4 예측 */}
                  <div>
                    <h3 className="font-semibold mb-4">T+1 ~ T+4 일별 수요 예측</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {forecast.forecasts.map((h) => (
                        <Card key={h.horizon} className="border-2">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <span>{h.horizon}</span>
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant={getConfidenceVariant(h.prediction.confidence)}>
                                  {h.prediction.confidence}
                                </Badge>
                                  {h.prediction.probability !== undefined && h.prediction.probability !== null && (
                                    <span className="text-xs text-gray-500">
                                      {h.prediction.probability.toFixed(0)}%
                                    </span>
                                   )}
                                </div>
                            </CardTitle>
                            <CardDescription className="text-xs">{h.date}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">발주 여부</span>
                                {h.prediction.will_order === null ? (
                                  <span className="text-gray-400">-</span>
                                ) : h.prediction.will_order ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">예측 수량</span>
                                <span className="font-bold text-lg">
                                  {h.prediction.quantity !== null ? `${h.prediction.quantity}개` : '-'}
                                </span>
                              </div>
                              {h.prediction.probability !== undefined && h.prediction.probability !== null && (
                                <div className="pt-2 border-t">
                                  <Progress value={h.prediction.probability} className="h-2" />
                                  <p className="text-xs text-gray-500 mt-1 text-right">
                                    {h.prediction.probability.toFixed(0)}%
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
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