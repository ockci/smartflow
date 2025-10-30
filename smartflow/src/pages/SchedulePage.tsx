import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Download,
  Play,
  TrendingUp,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';
import { scheduleAPI } from '../lib/api';
import { Sidebar } from '../components/Sidebar';

interface SchedulePageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface ScheduleItem {
  id: number;
  order_number: string;
  product_code: string;
  machine_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_on_time: boolean;
}

interface ScheduleMetrics {
  on_time_rate: number;
  utilization: number;
  total_orders: number;
  on_time_orders: number;
}

interface ScheduleData {
  schedules: ScheduleItem[];
  metrics: ScheduleMetrics;
}

export const SchedulePage: React.FC<SchedulePageProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const schedules = scheduleData?.schedules || [];
  const metrics = scheduleData?.metrics || {
    on_time_rate: 0,
    utilization: 0,
    total_orders: 0,
    on_time_orders: 0,
  };

  // 📦 스케줄 조회
  const fetchSchedule = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await scheduleAPI.getResult();
      const data = response?.data || response;

      if (!data?.schedule || data.schedule.length === 0) {
        toast.info('스케줄 데이터가 없습니다');
        setScheduleData(null);
        return;
      }

      const formattedData = {
        schedules: data.schedule,
        metrics: data.metrics,
      };

      setScheduleData(formattedData);
      toast.success('스케줄을 불러왔습니다');
    } catch (error: any) {
      console.error('스케줄 조회 실패:', error);
      if (error?.response?.status !== 404) {
        toast.error('스케줄을 불러오는데 실패했습니다');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ⚙️ 스케줄 생성
  const handleGenerateSchedule = async (): Promise<void> => {
    if (!window.confirm('새로운 스케줄을 생성하시겠습니까?')) return;
    try {
      setIsGenerating(true);
      toast.info('스케줄 생성 중... (최대 3초 소요)');

      const startTime = Date.now();
      const response = await scheduleAPI.generate();
      const data = response?.data || response;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      if (!data?.schedule || data.schedule.length === 0) {
        toast.error('스케줄 생성 실패: 유효한 데이터가 없습니다');
        return;
      }

      const formattedData = {
        schedules: data.schedule,
        metrics: data.metrics,
      };

      setScheduleData(formattedData);

      toast.success(`스케줄 생성 완료 (${elapsed}초)`, {
        description: `납기 준수율 ${formattedData.metrics.on_time_rate ?? 0}% | 가동률 ${formattedData.metrics.utilization ?? 0}%`,
      });
    } catch (error: any) {
      console.error('스케줄 생성 실패:', error);
      toast.error(error.response?.data?.detail || '스케줄 생성에 실패했습니다');
    } finally {
      setIsGenerating(false);
    }
  };

  // 📥 다운로드
  const handleDownloadSchedule = (): void => {
    if (!schedules.length) {
      toast.error('다운로드할 스케줄이 없습니다');
      return;
    }
    const url = scheduleAPI.downloadExcel();
    window.open(url, '_blank');
    toast.info('스케줄 다운로드를 시작합니다');
  };

  // 기계별로 스케줄 그룹화
  const groupByMachine = () => {
    const grouped: { [key: string]: ScheduleItem[] } = {};
    schedules.forEach((schedule) => {
      if (!grouped[schedule.machine_id]) {
        grouped[schedule.machine_id] = [];
      }
      grouped[schedule.machine_id].push(schedule);
    });
    return grouped;
  };

  const machineGroups = groupByMachine();

  useEffect(() => {
    fetchSchedule();
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      <Sidebar
        currentPage="schedule"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#1F2937] text-2xl font-semibold">
                  생산 스케줄 결과
                </h1>
                <p className="text-sm text-[#6B7280]">
                  {schedules.length
                    ? `총 ${schedules.length}개 작업이 스케줄링되었습니다`
                    : '스케줄을 생성해주세요'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="bg-[#10B981] hover:bg-[#059669]"
            >
              <Play className="w-4 h-4 mr-2" />
              {isGenerating ? '생성 중...' : '새 스케줄 생성'}
            </Button>
          </div>
        </header>

        {/* 본문 */}
        <main className="flex-1 p-6">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin border-4 border-blue-300 border-t-transparent rounded-full w-10 h-10 mx-auto"></div>
              <p className="mt-4 text-gray-500">스케줄 불러오는 중...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-20">
              <CalendarDays className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                스케줄이 없습니다
              </h3>
              <p className="text-gray-500 mb-6">
                주문을 등록한 후 스케줄을 생성하세요.
              </p>
              <Button onClick={handleGenerateSchedule}>
                <Play className="w-4 h-4 mr-2" />
                스케줄 생성하기
              </Button>
            </div>
          ) : (
            <>
              {/* 📊 KPI 요약 카드 - 4개로 확장 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">총 작업</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {metrics.total_orders}
                        </p>
                      </div>
                      <Package className="w-10 h-10 text-blue-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">납기 준수율</p>
                        <p className="text-3xl font-bold text-green-600">
                          {metrics.on_time_rate.toFixed(0)}%
                        </p>
                      </div>
                      <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {metrics.on_time_orders}/{metrics.total_orders} 준수
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">설비 가동률</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {metrics.utilization.toFixed(0)}%
                        </p>
                      </div>
                      <TrendingUp className="w-10 h-10 text-purple-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">납기 지연</p>
                        <p className="text-3xl font-bold text-orange-600">
                          {metrics.total_orders - metrics.on_time_orders}
                        </p>
                      </div>
                      <AlertCircle className="w-10 h-10 text-orange-500 opacity-20" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {((metrics.total_orders - metrics.on_time_orders) / metrics.total_orders * 100).toFixed(0)}% 비율
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* 🏭 기계별 타임라인 & 📋 전체 스케줄 - 2컬럼 레이아웃 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 왼쪽: 기계별 타임라인 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      기계별 작업 타임라인
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {Object.keys(machineGroups).sort().map((machineId) => {
                        const machineSchedules = machineGroups[machineId];
                        return (
                          <div key={machineId} className="border-l-4 border-blue-300 pl-4">
                            <h3 className="font-semibold text-lg mb-3 text-gray-800">
                              {machineId}
                              <span className="text-sm text-gray-500 ml-2">
                                ({machineSchedules.length}개 작업)
                              </span>
                            </h3>
                            <div className="space-y-2">
                              {machineSchedules.map((schedule, idx) => {
                                const start = new Date(schedule.start_time);
                                const end = new Date(schedule.end_time);
                                const hours = Math.round(schedule.duration_minutes / 60);
                                
                                return (
                                  <div
                                    key={idx}
                                    className={`p-4 rounded-lg border-2 ${
                                      schedule.is_on_time
                                        ? 'bg-green-50 border-green-300'
                                        : 'bg-red-50 border-red-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                          schedule.is_on_time
                                            ? 'bg-green-500 text-white'
                                            : 'bg-red-500 text-white'
                                        }`}>
                                          {schedule.order_number}
                                        </span>
                                        <span className="text-gray-700 font-medium">
                                          {schedule.product_code}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-4 h-4" />
                                          <span>
                                            {start.toLocaleTimeString('ko-KR', { 
                                              hour: '2-digit', 
                                              minute: '2-digit' 
                                            })}
                                            {' → '}
                                            {end.toLocaleTimeString('ko-KR', { 
                                              hour: '2-digit', 
                                              minute: '2-digit' 
                                            })}
                                          </span>
                                        </div>
                                        <span className="bg-gray-200 px-2 py-1 rounded">
                                          {hours}시간
                                        </span>
                                        {schedule.is_on_time ? (
                                          <CheckCircle className="w-5 h-5 text-green-600" />
                                        ) : (
                                          <AlertCircle className="w-5 h-5 text-red-600" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* 오른쪽: 전체 스케줄 테이블 */}
                <Card>
                  <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>전체 스케줄 목록</CardTitle>
                    <Button variant="outline" onClick={handleDownloadSchedule} size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      다운로드
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>주문번호</TableHead>
                          <TableHead>기계</TableHead>
                          <TableHead>제품</TableHead>
                          <TableHead>시작</TableHead>
                          <TableHead>종료</TableHead>
                          <TableHead>시간</TableHead>
                          <TableHead className="text-center">상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules.map((item, index) => {
                          const start = new Date(item.start_time);
                          const end = new Date(item.end_time);
                          const hours = Math.round(item.duration_minutes / 60);
                          
                          return (
                            <TableRow key={`${item.order_number}-${index}`}>
                              <TableCell className="font-medium">
                                {item.order_number}
                              </TableCell>
                              <TableCell>{item.machine_id}</TableCell>
                              <TableCell>{item.product_code}</TableCell>
                              <TableCell className="text-sm">
                                {start.toLocaleString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </TableCell>
                              <TableCell className="text-sm">
                                {end.toLocaleString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {hours}시간
                              </TableCell>
                              <TableCell className="text-center">
                                {item.is_on_time ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ 준수
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    ✗ 지연
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};