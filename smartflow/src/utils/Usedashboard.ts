/**
 * 대시보드 데이터 관리 커스텀 훅
 */
import { useState, useEffect } from 'react';
import { dashboardAPI } from './api';

export interface DashboardSummary {
  total_orders: number;
  pending_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  urgent_orders: number;
  on_time_rate: number;
  equipment_utilization: number;
  alerts_count: number;
}

export interface ProductionStatus {
  machine_id: string;
  order_number: string;
  product_code: string;
  progress: number;
  estimated_completion: string;
  status: string;
}

export interface Alert {
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  order_number?: string;
}

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [production, setProduction] = useState<ProductionStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // 병렬로 모든 데이터 가져오기
      const [summaryData, productionData, alertsData] = await Promise.all([
        dashboardAPI.getSummary(),
        dashboardAPI.getProduction(),
        dashboardAPI.getAlerts(),
      ]);

      setSummary(summaryData);
      setProduction(productionData.production_status || []);
      setAlerts(alertsData.alerts || []);
    } catch (err: any) {
      console.error('대시보드 데이터 로딩 실패:', err);
      setError(err.message || '데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // 30초마다 자동 새로고침
    const interval = setInterval(fetchDashboard, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    summary,
    production,
    alerts,
    loading,
    error,
    refresh: fetchDashboard,
  };
}