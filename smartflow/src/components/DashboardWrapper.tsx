import { useEffect, useState } from 'react';
import { DashboardPage } from './DashboardPage';
import { EmptyState } from './EmptyState';
import { Sidebar } from './Sidebar';
import { BarChart3 } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface DashboardWrapperProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function DashboardWrapper({ onNavigate, onLogout }: DashboardWrapperProps) {
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    try {
      const [ordersRes, productsRes, equipmentRes] = await Promise.all([
        apiClient.get('/api/orders/list').catch(() => ({ data: [] })),
        apiClient.get('/api/products/list').catch(() => ({ data: [] })),
        apiClient.get('/api/equipment/list').catch(() => ({ data: [] })),
      ]);

      const hasAnyData = 
        ordersRes.data?.length > 0 || 
        productsRes.data?.length > 0 || 
        equipmentRes.data?.length > 0;

      setHasData(hasAnyData);
    } catch (error) {
      console.error('데이터 확인 실패:', error);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar currentPage="dashboard" onNavigate={onNavigate} onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">데이터 확인 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex h-screen">
        <Sidebar currentPage="dashboard" onNavigate={onNavigate} onLogout={onLogout} />
        <div className="flex-1 p-8 overflow-auto">
          <EmptyState
            icon={<BarChart3 className="w-16 h-16" />}
            title="아직 데이터가 없습니다"
            description="SmartFlow를 시작하려면 먼저 설비, 제품, 주문 데이터를 등록해주세요. 빠른 시작 가이드를 따라하시면 5분 안에 준비할 수 있습니다."
            actionLabel="빠른 시작 가이드"
            onAction={() => onNavigate('onboarding')}
            secondaryActionLabel="직접 데이터 업로드"
            onSecondaryAction={() => onNavigate('orders')}
          />

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="p-6 bg-white rounded-lg border text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-500">1</span>
              </div>
              <h3 className="font-semibold mb-2">설비 등록</h3>
              <p className="text-sm text-gray-600">보유 사출기 정보 입력</p>
            </div>

            <div className="p-6 bg-white rounded-lg border text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-500">2</span>
              </div>
              <h3 className="font-semibold mb-2">제품 등록</h3>
              <p className="text-sm text-gray-600">생산 제품 목록 입력</p>
            </div>

            <div className="p-6 bg-white rounded-lg border text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-500">3</span>
              </div>
              <h3 className="font-semibold mb-2">주문 데이터</h3>
              <p className="text-sm text-gray-600">과거 주문 이력 업로드</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardPage onNavigate={onNavigate} onLogout={onLogout} />;
}