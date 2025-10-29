import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  AlertCircle,
  Calendar,
  Package,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Lightbulb
} from 'lucide-react';

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
  name: string;
  code: string;
}

interface ForecastPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export const ForecastPage: React.FC<ForecastPageProps> = ({ onNavigate, onLogout }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [forecast, setForecast] = useState<ProductForecast | null>(null);
  const [batchStatus, setBatchStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
    fetchSystemStatus();
    fetchBatchStatus();
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

  const fetchBatchStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8000/api/ai-forecast/batch', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      setBatchStatus(data);
    } catch (error) {
      console.error('일괄 상태 로드 실패:', error);
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
    } catch (error) {
      console.error('예측 실패:', error);
      alert('예측에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'MANUAL': return 'default';
      case 'RULE_BASED': return 'secondary';
      case 'SIMPLE_ML': return 'default';
      case 'TWO_STAGE_AI': return 'default';
      default: return 'default';
    }
  };

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case '높음': return 'default';
      case '중간': return 'secondary';
      case '낮음': return 'secondary';
      case '없음': return 'outline';
      default: return 'outline';
    }
  };

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
                AI 발주 예측 시스템
              </h1>
              <p className="text-gray-600 mt-1">Two-Stage Approach 기반 스마트 발주 예측</p>
            </div>
          </div>

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
                    <p className="text-sm text-gray-600">수동 입력</p>
                    <p className="text-2xl font-bold">{systemStatus.by_method?.MANUAL || 0}</p>
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
                <Alert className="mt-4">
                  <AlertDescription>{systemStatus.message}</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* 제품 선택 및 예측 */}
          <Card>
            <CardHeader>
              <CardTitle>제품 선택 및 예측</CardTitle>
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
                          {product.name} ({product.code})
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
                  {loading ? '예측 중...' : '예측 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 예측 결과 */}
          {forecast && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{forecast.product_name} 예측 결과</span>
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

                {/* Horizon 예측 */}
                <div>
                  <h3 className="font-semibold mb-4">T+1 ~ T+4 예측</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {forecast.forecasts.map((h) => (
                      <Card key={h.horizon}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>{h.horizon}</span>
                            <Badge variant={getConfidenceBadgeColor(h.prediction.confidence)}>
                              {h.prediction.confidence}
                            </Badge>
                          </CardTitle>
                          <CardDescription>{h.date}</CardDescription>
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
                              <span className="font-bold">
                                {h.prediction.quantity !== null ? `${h.prediction.quantity}개` : '-'}
                              </span>
                            </div>
                            {h.prediction.probability !== undefined && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">확률</span>
                                <span className="font-bold">{h.prediction.probability.toFixed(1)}%</span>
                              </div>
                            )}
                            {h.reasoning && (
                              <p className="text-xs text-gray-500 mt-2 pt-2 border-t">{h.reasoning}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* 권장 사항 */}
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>{forecast.recommendation}</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* 전체 제품 상태 */}
          {batchStatus && batchStatus.total_products > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>전체 제품 예측 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {batchStatus.products.map((p: any) => (
                    <div key={p.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{p.product_name}</p>
                        <p className="text-sm text-gray-600">{p.product_code}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={getMethodBadgeColor(p.method)}>{p.method}</Badge>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{p.days_of_data}일 데이터</p>
                        </div>
                        <div>
                          {p.can_predict ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};