import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Play, TrendingUp, TrendingDown, Minus, AlertTriangle, Brain, Calendar, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Sidebar } from './Sidebar';

interface SimulationPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface Product {
  id: number;
  product_code: string;
  product_name: string;
  current_stock?: number;
  safety_stock?: number;
  min_stock?: number;
  daily_usage?: number;
}

interface PredictionPoint {
  date: string;
  predicted_usage: number;
  confidence_lower: number;
  confidence_upper: number;
}

interface ScenarioResult {
  date: string;
  stock_level: number;
  daily_usage: number;
  scenario_factor: number;
}

interface SimulationResponse {
  product_id: number;
  product_name: string;
  current_stock: number;
  safety_stock: number;
  ai_predictions: PredictionPoint[];
  scenario_results: ScenarioResult[];
  alerts: string[];
  summary: {
    min_stock: number;
    min_stock_date: string;
    days_until_safety_stock: number | null;
    total_usage: number;
    avg_daily_usage: number;
  };
}

export function SimulationPage({ onNavigate, onLogout }: SimulationPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [scenario, setScenario] = useState<string>('normal');
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/api/products/list');
      console.log('📦 제품 데이터:', response.data);
      setProducts(response.data);
      
      // 첫 번째 제품 자동 선택
      if (response.data.length > 0) {
        setSelectedProduct(response.data[0].id);
      }
    } catch (error) {
      console.error('제품 목록을 불러오는데 실패했습니다:', error);
      setError('제품 목록을 불러올 수 없습니다.');
    }
  };

  const runSimulation = async () => {
    if (!selectedProduct) return;

    setIsLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/api/simulation/run/${selectedProduct}`, {
        params: { scenario }
      });

      console.log('🎯 시뮬레이션 결과:', response.data);
      setSimulationData(response.data);
    } catch (error: any) {
      console.error('시뮬레이션 실행 중 오류:', error);
      setError(error.response?.data?.detail || '시뮬레이션 실행에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProductData = products.find(p => p.id === selectedProduct);

  const getScenarioIcon = (scenarioType: string) => {
    switch (scenarioType) {
      case 'surge': return <TrendingUp className="w-5 h-5" />;
      case 'decline': return <TrendingDown className="w-5 h-5" />;
      case 'disruption': return <AlertTriangle className="w-5 h-5" />;
      default: return <Minus className="w-5 h-5" />;
    }
  };

  const getScenarioColor = (scenarioType: string) => {
    switch (scenarioType) {
      case 'surge': return 'border-orange-300 bg-orange-50';
      case 'decline': return 'border-blue-300 bg-blue-50';
      case 'disruption': return 'border-red-300 bg-red-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  // 그래프용 데이터 포맷팅
  const chartData = simulationData ? simulationData.scenario_results.map((result, index) => ({
    date: result.date,
    stock: result.stock_level,
    usage: result.daily_usage,
    predicted: simulationData.ai_predictions[index]?.predicted_usage || null,
  })) : [];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      <Sidebar currentPage="simulation" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                대시보드로
              </button>
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#1F2937] text-2xl font-bold">AI 기반 재고 시뮬레이션</h1>
                <p className="text-sm text-[#6B7280]">AI 예측 모델과 시나리오를 활용한 4일간의 재고 변화 분석</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 제품 선택 */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                제품 선택
              </h2>
              <select
                value={selectedProduct || ''}
                onChange={(e) => setSelectedProduct(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">제품을 선택하세요</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.product_name}
                  </option>
                ))}
              </select>
              
              {selectedProductData && (
                <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">현재 재고</span>
                    <span className="font-semibold text-lg text-gray-900">
                      {selectedProductData.current_stock || 0}개
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">안전 재고</span>
                    <span className="font-semibold text-orange-600">
                      {selectedProductData.safety_stock || selectedProductData.min_stock || 0}개
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">평균 일일 사용량</span>
                    <span className="font-semibold text-gray-900">
                      {selectedProductData.daily_usage || 0}개
                    </span>
                  </div>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-medium mb-1">📊 AI 예측 조건</p>
                <p>• 과거 14일 데이터 학습</p>
                <p>• 향후 4일 예측</p>
              </div>
            </div>

            {/* 시나리오 선택 */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">시나리오 선택</h2>
              <div className="space-y-3">
                {[
                  { value: 'normal', label: '정상 운영', desc: 'AI 예측값 그대로 적용', factor: '×1.0' },
                  { value: 'surge', label: '수요 급증', desc: '예측값 대비 50% 증가', factor: '×1.5' },
                  { value: 'decline', label: '수요 감소', desc: '예측값 대비 30% 감소', factor: '×0.7' },
                  { value: 'disruption', label: '공급 차질', desc: '3일차 공급 중단 시뮬레이션', factor: '특수' }
                ].map(s => (
                  <label 
                    key={s.value} 
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      scenario === s.value 
                        ? getScenarioColor(s.value) + ' border-2' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scenario"
                      value={s.value}
                      checked={scenario === s.value}
                      onChange={(e) => setScenario(e.target.value)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getScenarioIcon(s.value)}
                        <span className="font-semibold text-gray-900">{s.label}</span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">{s.factor}</span>
                      </div>
                      <p className="text-sm text-gray-600">{s.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 시뮬레이션 실행 */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">시뮬레이션 실행</h2>
              <button
                onClick={runSimulation}
                disabled={!selectedProduct || isLoading}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    시뮬레이션 시작
                  </>
                )}
              </button>
              
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-800 font-medium mb-2">🤖 AI 시뮬레이션 프로세스</p>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>과거 14일 데이터 학습</li>
                  <li>AI 모델로 4일 예측</li>
                  <li>선택한 시나리오 적용</li>
                  <li>재고 변화 시뮬레이션</li>
                </ol>
              </div>

              {simulationData && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800 mb-2">✅ 시뮬레이션 완료</p>
                  <div className="text-xs text-green-700 space-y-1">
                    <p>• 최저 재고: {simulationData.summary.min_stock}개</p>
                    <p>• 발생일: {simulationData.summary.min_stock_date}</p>
                    {simulationData.summary.days_until_safety_stock !== null && (
                      <p className="text-red-600 font-semibold">
                        ⚠️ {simulationData.summary.days_until_safety_stock}일 후 안전재고 도달
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 결과 영역 */}
          {simulationData && (
            <>
              {simulationData.alerts.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-yellow-800 mb-2">⚠️ 재고 경고</h3>
                      <ul className="space-y-1">
                        {simulationData.alerts.map((alert, index) => (
                          <li key={index} className="text-sm text-yellow-700">• {alert}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 그래프 */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">📈 AI 예측 vs 시나리오 결과</h2>
                <ResponsiveContainer width="100%" height={450}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" label={{ value: '재고량 (개)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    
                    <ReferenceLine y={simulationData.safety_stock} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} label={{ value: '안전재고선', position: 'right', fill: '#ef4444', fontSize: 12 }} />
                    <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#8b5cf6', r: 4 }} name="AI 예측 사용량" />
                    <Line type="monotone" dataKey="stock" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} name="시나리오 적용 재고" />
                    <Line type="monotone" dataKey="usage" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} name="시나리오 적용 사용량" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 상세 결과 테이블 */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">📊 상세 시뮬레이션 결과</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">날짜</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">AI 예측 사용량</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">시나리오 사용량</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">시나리오 계수</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">예상 재고</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationData.scenario_results.map((result, index) => {
                        const prediction = simulationData.ai_predictions[index];
                        const isLow = result.stock_level < simulationData.safety_stock;
                        
                        return (
                          <tr key={index} className={`border-b ${isLow ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 text-gray-900">{result.date}</td>
                            <td className="px-4 py-3 text-right text-purple-600 font-medium">
                              {prediction?.predicted_usage.toFixed(1)}개
                            </td>
                            <td className="px-4 py-3 text-right text-green-600 font-medium">
                              {result.daily_usage.toFixed(1)}개
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              ×{result.scenario_factor.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-lg text-gray-900">
                              {result.stock_level.toFixed(0)}개
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isLow ? (
                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                  ⚠️ 부족
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                  ✓ 안전
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 요약 통계 */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600 mb-1">총 예상 사용량</p>
                    <p className="text-2xl font-bold text-blue-900">{simulationData.summary.total_usage.toFixed(0)}개</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-600 mb-1">평균 일일 사용량</p>
                    <p className="text-2xl font-bold text-purple-900">{simulationData.summary.avg_daily_usage.toFixed(1)}개</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-600 mb-1">최저 재고</p>
                    <p className="text-2xl font-bold text-orange-900">{simulationData.summary.min_stock}개</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600 mb-1">최종 재고</p>
                    <p className="text-2xl font-bold text-green-900">
                      {simulationData.scenario_results[simulationData.scenario_results.length - 1].stock_level.toFixed(0)}개
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}