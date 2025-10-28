import { useState } from 'react';
import { TrendingUp, ArrowLeft, AlertTriangle, TrendingDown, LogOut, CheckCircle, Settings } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ReferenceLine } from 'recharts';
import { Sidebar } from './Sidebar';

interface SimulationPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

type Scenario = 'normal' | 'shortage' | 'spike' | 'decline';

export function SimulationPage({ onNavigate, onLogout }: SimulationPageProps) {
  const [scenario, setScenario] = useState<Scenario>('normal');
  
  const scenarioConfig = {
    normal: { label: '정상 상황', color: '#10B981', icon: CheckCircle, desc: '현재 수요 패턴 유지' },
    shortage: { label: '공급 차질', color: '#EF4444', icon: AlertTriangle, desc: '공급업체 문제로 입고 지연' },
    spike: { label: '수요 급증', color: '#F59E0B', icon: TrendingUp, desc: '갑작스런 주문 증가 (+50%)' },
    decline: { label: '수요 감소', color: '#2563EB', icon: TrendingDown, desc: '계절적 요인으로 수요 감소 (-30%)' },
  };

  // Generate mock data based on scenario
  const generateData = () => {
    const baseData = [];
    let stock = 200;
    const baseDemand = 40;
    
    for (let day = 0; day <= 14; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      
      let scenarioDemand = baseDemand;
      
      if (scenario === 'spike') {
        scenarioDemand = baseDemand * 1.5;
      } else if (scenario === 'decline') {
        scenarioDemand = baseDemand * 0.7;
      } else if (scenario === 'shortage' && day === 7) {
        // Add delay in supply
        stock -= baseDemand;
      }
      
      if (day > 0) {
        stock -= scenarioDemand;
      }
      
      if (day === 3) {
        stock += 400; // Order arrival
      }
      
      baseData.push({
        day: `${date.getMonth() + 1}/${date.getDate()}`,
        stock: Math.max(0, Math.round(stock)),
        demand: Math.round(scenarioDemand),
      });
    }
    
    return baseData;
  };

  const chartData = generateData();
  const config = scenarioConfig[scenario];
  const ScenarioIcon = config.icon;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      {/* Sidebar */}
      <Sidebar currentPage="simulation" onNavigate={onNavigate} onLogout={onLogout} />


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
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#1F2937] text-2xl">What-if 시뮬레이션</h1>
                <p className="text-sm text-[#6B7280]">발주 시나리오 분석</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 overflow-y-auto">
          {/* Scenario Selection */}
          <Card className="bg-white border border-[#E5E7EB] shadow-md mb-6">
            <div className="border-b border-[#E5E7EB] px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50">
              <h2 className="text-[#1F2937] text-xl">시나리오 선택</h2>
            </div>
            
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(Object.keys(scenarioConfig) as Scenario[]).map((key) => {
                  const item = scenarioConfig[key];
                  const Icon = item.icon;
                  const isActive = scenario === key;
                  
                  return (
                    <button
                      key={key}
                      onClick={() => setScenario(key)}
                      className={`
                        p-6 rounded-lg border-2 transition-all duration-200
                        ${isActive 
                          ? 'border-[#2563EB] bg-blue-50 shadow-md' 
                          : 'border-[#E5E7EB] hover:border-[#2563EB]/50 hover:bg-[#F9FAFB]'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div 
                          className={`
                            w-14 h-14 rounded-lg flex items-center justify-center mb-3
                            ${isActive ? 'bg-gradient-to-br from-[#2563EB] to-[#1E40AF]' : 'bg-[#F9FAFB]'}
                          `}
                        >
                          <Icon 
                            className={`w-7 h-7 ${isActive ? 'text-white' : 'text-[#6B7280]'}`} 
                          />
                        </div>
                        <h3 className={`mb-2 ${isActive ? 'text-[#2563EB]' : 'text-[#1F2937]'}`}>
                          {item.label}
                        </h3>
                        <p className="text-sm text-[#6B7280]">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Current Scenario Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-white border border-[#E5E7EB] shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ScenarioIcon className="w-5 h-5" style={{ color: config.color }} />
                  <h3 className="text-[#1F2937]">선택된 시나리오</h3>
                </div>
                <p className="text-2xl mb-1" style={{ color: config.color }}>{config.label}</p>
                <p className="text-sm text-[#6B7280]">{config.desc}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#E5E7EB] shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                  <h3 className="text-[#1F2937]">예상 위험도</h3>
                </div>
                <p className="text-2xl text-[#F59E0B] mb-1">
                  {scenario === 'spike' ? '높음' : scenario === 'shortage' ? '중간' : '낮음'}
                </p>
                <p className="text-sm text-[#6B7280]">재고 부족 가능성</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#E5E7EB] shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-[#10B981]" />
                  <h3 className="text-[#1F2937]">권장 발주량</h3>
                </div>
                <p className="text-2xl text-[#10B981] mb-1">
                  {scenario === 'spike' ? '600개' : scenario === 'shortage' ? '500개' : scenario === 'decline' ? '300개' : '400개'}
                </p>
                <p className="text-sm text-[#6B7280]">AI 추천 수량</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="bg-white border border-[#E5E7EB] shadow-md mb-6">
            <div className="border-b border-[#E5E7EB] px-6 py-4">
              <h2 className="text-[#1F2937] text-xl">재고 추이 시뮬레이션</h2>
            </div>

            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
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
                  <Legend />
                  <ReferenceLine 
                    y={200} 
                    stroke="#F59E0B" 
                    strokeDasharray="5 5" 
                    label={{ value: '안전선', fill: '#F59E0B', position: 'right' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stock" 
                    stroke={config.color}
                    strokeWidth={3}
                    name="예상 재고"
                    dot={{ fill: config.color, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="flex items-center gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                  <span className="text-[#6B7280]">예상 재고</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-[#F59E0B] border-t-2 border-dashed border-[#F59E0B]" />
                  <span className="text-[#6B7280]">안전 재고선</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          <Card className="bg-white border border-[#E5E7EB] shadow-md">
            <div className="border-b border-[#E5E7EB] px-6 py-4">
              <h2 className="text-[#1F2937] text-xl">분석 결과 및 권장 사항</h2>
            </div>

            <CardContent className="p-6 space-y-4">
              {scenario === 'shortage' && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[#1F2937] mb-1">공급 차질 대응</h3>
                    <p className="text-sm text-[#6B7280]">
                      리드타임이 연장될 경우, 재고가 안전선 아래로 떨어질 가능성이 있습니다. 
                      <span className="text-[#F59E0B]"> 발주량을 150개 추가</span>하거나 
                      <span className="text-[#F59E0B]"> 조기 발주</span>를 권장합니다.
                    </p>
                  </div>
                </div>
              )}

              {scenario === 'spike' && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[#1F2937] mb-1">수요 급증 대응</h3>
                    <p className="text-sm text-[#6B7280]">
                      수요가 50% 증가하면 재고가 조기에 소진됩니다. 
                      <span className="text-[#EF4444]"> 긴급 발주 (600개)</span>와 
                      <span className="text-[#EF4444]"> 대체 공급업체 확보</span>가 필요합니다.
                    </p>
                  </div>
                </div>
              )}

              {scenario === 'decline' && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[#1F2937] mb-1">수요 감소 대응</h3>
                    <p className="text-sm text-[#6B7280]">
                      수요가 감소하는 시기에는 과다 재고를 방지해야 합니다. 
                      <span className="text-[#2563EB]"> 발주량을 300개로 조정</span>하여 
                      재고 비용을 최소화하세요.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-[#1F2937] mb-1">종합 권장 사항</h3>
                  <p className="text-sm text-[#6B7280]">
                    선택한 시나리오를 고려하여 발주량을 조정하고, 
                    위험 시나리오에 대비한 비상 계획을 수립하세요. 
                    AI 시스템이 지속적으로 상황을 모니터링하며 최적의 발주 타이밍을 알려드립니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}