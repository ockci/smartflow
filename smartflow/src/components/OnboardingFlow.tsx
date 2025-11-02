/**
 * 온보딩 플로우
 * 신규 사용자를 위한 3단계 설정 가이드
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Download, 
  Upload, 
  Rocket,
  FileSpreadsheet,
  Package,
  Cpu
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface OnboardingFlowProps {
  onNavigate: (page: string) => void;
}

export default function OnboardingFlow({ onNavigate }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      id: 1,
      title: '설비 정보 등록',
      description: '보유하신 사출기 정보를 등록해주세요',
      icon: <Cpu className="w-8 h-8" />,
      templateUrl: '/api/equipment/download/template',
      sampleUrl: '/api/samples/equipment',
      uploadUrl: 'equipment',
    },
    {
      id: 2,
      title: '제품 정보 등록',
      description: '생산하는 제품 정보를 등록해주세요',
      icon: <Package className="w-8 h-8" />,
      templateUrl: '/api/products/download/template',
      sampleUrl: '/api/samples/products',
      uploadUrl: 'products',
    },
    {
      id: 3,
      title: '과거 주문 데이터',
      description: 'AI 학습을 위해 최근 3개월 주문 데이터를 업로드해주세요 (최소 100개 권장)',
      icon: <FileSpreadsheet className="w-8 h-8" />,
      templateUrl: '/api/orders/download/template',
      sampleUrl: '/api/samples/orders',
      uploadUrl: 'orders',
    },
  ];

  const currentStepData = steps.find(s => s.id === currentStep);
  const progress = (completedSteps.length / steps.length) * 100;

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}${url}`, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    } catch (error) {
      console.error('다운로드 실패:', error);
      alert('다운로드에 실패했습니다.');
    }
  };

  const handleComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const handleSkip = () => {
    onNavigate('dashboard');
  };

  const handleFinish = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onNavigate('dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl p-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">SmartFlow 시작하기</h1>
          <p className="text-gray-600">3단계만 완료하면 바로 사용할 수 있습니다</p>
        </div>

        {/* 진행률 */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">진행률</span>
            <span className="text-sm text-gray-600">{completedSteps.length} / {steps.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 단계 표시 */}
        <div className="flex justify-between mb-8">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                  completedSteps.includes(step.id)
                    ? 'bg-green-500 text-white'
                    : currentStep === step.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {completedSteps.includes(step.id) ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <span className="font-bold">{step.id}</span>
                )}
              </div>
              <span className="text-xs text-center">{step.title.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        {/* 현재 단계 내용 */}
        {currentStepData && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-blue-500">{currentStepData.icon}</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">{currentStepData.title}</h2>
                <p className="text-gray-600">{currentStepData.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* 템플릿 다운로드 */}
              <Button
                onClick={() => handleDownload(currentStepData.templateUrl, `template_step${currentStep}.xlsx`)}
                variant="outline"
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                빈 템플릿 다운로드
              </Button>

              {/* 샘플 다운로드 */}
              <Button
                onClick={() => handleDownload(currentStepData.sampleUrl, `sample_step${currentStep}.xlsx`)}
                variant="outline"
                className="w-full justify-start"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                샘플 데이터 다운로드 (작성 예시)
              </Button>

              {/* 업로드 버튼 */}
              <Button
                onClick={() => {
                  handleComplete(currentStep);
                  onNavigate(currentStepData.uploadUrl);
                }}
                className="w-full justify-start"
              >
                <Upload className="w-4 h-4 mr-2" />
                데이터 업로드하러 가기
              </Button>
            </div>
          </div>
        )}

        {/* 네비게이션 버튼 */}
        <div className="flex justify-between items-center">
          <Button
            onClick={handleSkip}
            variant="ghost"
          >
            나중에 하기
          </Button>

          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                onClick={() => setCurrentStep(currentStep - 1)}
                variant="outline"
              >
                이전
              </Button>
            )}

            {currentStep < steps.length ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                다음
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                className="bg-green-500 hover:bg-green-600"
              >
                <Rocket className="w-4 h-4 mr-2" />
                시작하기
              </Button>
            )}
          </div>
        </div>

        {/* 도움말 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 팁:</strong> 각 단계를 건너뛰어도 나중에 설정할 수 있습니다. 
            하지만 AI 예측을 사용하려면 최소 100개 이상의 주문 데이터가 필요합니다.
          </p>
        </div>
      </Card>
    </div>
  );
}