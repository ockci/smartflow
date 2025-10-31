import React, { useState, useEffect } from 'react';
import { scheduleAPI, apiClient } from '../lib/api';
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Download,
  Play,
  TrendingUp,
  AlertCircle,
  Package,
  StopCircle,
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
  status?: string;  // ⬅️ 추가
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

interface WeeklySummary {
  date: string;
  day_of_week: string;
  scheduled_quantity: number;
  equipment_count: number;
  utilization: number;
}

export const SchedulePage: React.FC<SchedulePageProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary[]>([]);
  const [loadingWeekly, setLoadingWeekly] = useState(false);

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

      console.log('📦 받은 데이터:', data);

      if (!data?.schedule || data.schedule.length === 0) {
        toast.info('스케줄 데이터가 없습니다');
        setScheduleData(null);
        return;
      }

      const formattedData = {
        schedules: data.schedule,
        metrics: data.metrics || {
          on_time_rate: 0,
          utilization: 0,
          total_orders: 0,
          on_time_orders: 0
        },
      };

      setScheduleData(formattedData);
      toast.success('스케줄을 불러왔습니다');
    } catch (error: any) {
      console.error('스케줄 조회 실패:', error);
      if (error?.response?.status !== 404) {
        toast.error('스케줄을 불러오는데 실패했습니다');
      }
      setScheduleData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 📅 주간 요약 조회
  const fetchWeeklySummary = async (): Promise<void> => {
    try {
      setLoadingWeekly(true);
      const response = await apiClient.get('/api/schedule/weekly-summary');
      setWeeklySummary(response.data.weekly_summary || []);
    } catch (error) {
      console.error('주간 요약 로딩 실패:', error);
    } finally {
      setLoadingWeekly(false);
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

      console.log('📦 생성된 데이터:', data);

      if (!data?.schedule || data.schedule.length === 0) {
        toast.error('스케줄 생성 실패: 유효한 데이터가 없습니다');
        return;
      }

      const formattedData = {
        schedules: data.schedule,
        metrics: data.metrics || {
          on_time_rate: 0,
          utilization: 0,
          total_orders: 0,
          on_time_orders: 0
        },
      };

      setScheduleData(formattedData);
      
      // 주간 요약도 새로고침
      fetchWeeklySummary();

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

  // 🔥 다운로드
  const handleDownloadSchedule = (): void => {
    if (!schedules.length) {
      toast.error('다운로드할 스케줄이 없습니다');
      return;
    }
    const url = scheduleAPI.downloadExcel();
    window.open(url, '_blank');
    toast.info('스케줄 다운로드를 시작합니다');
  };

  // ⭐ 작업 시작/종료 처리 (추가)
  const handleStatusChange = async (scheduleId: number, currentStatus: string | undefined) => {
    try {
      const newStatus = currentStatus === 'in_progress' ? 'completed' : 'in_progress';
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(
        `http://localhost:8000/api/schedule/${scheduleId}/status?status=${newStatus}`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        toast.success(
          newStatus === 'in_progress' ? '작업이 시작되었습니다!' : '작업이 완료되었습니다!'
        );
        
        // 상태 변경 후 데이터 새로고침
        await fetchSchedule();
        
        // in_progress로 변경되면 대시보드로 이동
        if (newStatus === 'in_progress') {
          setTimeout(() => {
            onNavigate('dashboard');
          }, 500);
        }
      } else {
        throw new Error('상태 변경 실패');
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  // 기계별로 스케줄 그룹화
  const groupedSchedules = schedules.reduce((acc, schedule) => {
    const machineId = schedule.machine_id;
    if (!acc[machineId]) {
      acc[machineId] = [];
    }
    acc[machineId].push(schedule);
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  useEffect(() => {
    fetchSchedule();
    fetchWeeklySummary();
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      <Sidebar currentPage="schedule" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#1F2937] text-2xl">생산 스케줄링</h1>
                <p className="text-sm text-[#6B7280]">AI 기반 최적화 스케줄</p>
              </div>
            </div>
            <Button
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="bg-[#2563EB] hover:bg-[#1D4ED8]"
            >
              {isGenerating ? (
                <>⏳ 생성 중...</>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  스케줄 생성
                </>
              )}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : !scheduleData ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-xl text-gray-700 mb-2">스케줄이 없습니다</h3>
              <p className="text-gray-500 mb-6">새 스케줄을 생성해주세요</p>
              <Button onClick={handleGenerateSchedule} className="bg-[#2563EB] hover:bg-[#1D4ED8]">
                <TrendingUp className="w-4 h-4 mr-2" />
                스케줄 생성
              </Button>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-white border border-[#E5E7EB] shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm text-[#6B7280]">전체 주문</CardTitle>
                    <Package className="w-4 h-4 text-[#2563EB]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl text-[#1F2937] font-bold">
                      {metrics.total_orders}건
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-[#E5E7EB] shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm text-[#6B7280]">납기 준수율</CardTitle>
                    <CheckCircle className="w-4 h-4 text-[#10B981]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl text-[#10B981] font-bold">
                      {metrics.on_time_rate}%
                    </div>
                    <p className="text-xs text-[#6B7280] mt-1">
                      {metrics.on_time_orders}건 준수
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-[#E5E7EB] shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm text-[#6B7280]">설비 가동률</CardTitle>
                    <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl text-[#F59E0B] font-bold">
                      {metrics.utilization}%
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-[#E5E7EB] shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm text-[#6B7280]">작업 시간</CardTitle>
                    <Clock className="w-4 h-4 text-[#6B7280]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl text-[#1F2937] font-bold">
                      {Math.round(schedules.reduce((sum, s) => sum + s.duration_minutes, 0) / 60)}시간
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 스케줄 그리드 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* 왼쪽: 기계별 스케줄 */}
                <Card>
  <CardHeader>
    <CardTitle>기계별 스케줄</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {Object.keys(groupedSchedules).length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        스케줄 데이터가 없습니다
      </div>
    ) : (
      Object.entries(groupedSchedules).map(([machineId, scheduleItems]) => {
        return (
          <div key={machineId}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              {machineId}
              <span className="text-xs text-gray-500">({scheduleItems.length}건)</span>
            </h3>
            <div className="space-y-2">
              {scheduleItems.map((schedule, idx) => {
                const start = new Date(schedule.start_time);
                const end = new Date(schedule.end_time);
                const hours = Math.round(schedule.duration_minutes / 60);
                
                return (
                  <div 
                    key={`${schedule.order_number}-${idx}`}
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    {/* 상단: 주문번호 + 제품코드 + 납기 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">주문번호</p>
                          <p className="text-gray-800 font-semibold text-sm">
                            {schedule.order_number}
                          </p>
                        </div>
                        <div className="h-6 w-px bg-gray-300"></div>
                        <div>
                          <p className="text-gray-800 font-semibold text-base">
                            {schedule.product_code}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            제품 코드
                          </p>
                        </div>
                      </div>
                      
                      {schedule.is_on_time ? (
                        <div className="flex items-center gap-1 text-green-700 bg-green-100 px-3 py-1 rounded-full">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-semibold">납기 준수</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-700 bg-red-100 px-3 py-1 rounded-full">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-semibold">납기 지연</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 하단: 시간 정보 */}
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">작업 시간</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {start.toLocaleTimeString('ko-KR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                            {' → '}
                            {end.toLocaleTimeString('ko-KR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 justify-end">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">소요 시간</p>
                          <span className="inline-block bg-gray-700 text-white px-3 py-1 rounded-lg text-sm font-bold">
                            {hours}시간
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })
    )}

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
                          <TableHead className="text-center">작업상태</TableHead>
                          <TableHead className="text-center">액션</TableHead>
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
                                {item.status === 'in_progress' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    ⚙️ 진행중
                                  </span>
                                ) : item.status === 'completed' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✅ 완료
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    ⏸️ 대기중
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.status === 'in_progress' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusChange(item.id, item.status)}
                                    className="border-green-600 text-green-600 hover:bg-green-50"
                                  >
                                    <StopCircle className="w-3 h-3 mr-1" />
                                    종료
                                  </Button>
                                ) : item.status === 'completed' ? (
                                  <span className="text-xs text-gray-400">완료됨</span>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(item.id, item.status)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    시작
                                  </Button>
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

              {/* 📅 주간 스케줄 요약 */}
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-[#2563EB]" />
                      주간 생산 계획
                    </CardTitle>
                    <span className="text-sm text-[#6B7280]">향후 7일</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingWeekly ? (
                    <div className="text-center py-8 text-gray-500">로딩 중...</div>
                  ) : weeklySummary.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      주간 데이터가 없습니다. 스케줄을 생성해주세요.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[#6B7280]">날짜</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[#6B7280]">요일</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-[#6B7280]">생산 예정</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-[#6B7280]">가동 설비</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-[#6B7280]">가동률</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-[#6B7280]">상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklySummary.map((day, index) => (
                            <tr 
                              key={day.date} 
                              className={`border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors ${
                                index === 0 ? 'bg-blue-50' : ''
                              }`}
                            >
                              <td className="px-4 py-3 text-sm text-[#1F2937]">
                                {day.date}
                                {index === 0 && (
                                  <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                    오늘
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-[#1F2937]">{day.day_of_week}</td>
                              <td className="px-4 py-3 text-sm text-right text-[#1F2937] font-medium">
                                {day.scheduled_quantity.toLocaleString()}개
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-[#1F2937]">
                                {day.equipment_count}대
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${
                                        day.utilization >= 80 ? 'bg-green-500' : 
                                        day.utilization >= 50 ? 'bg-yellow-500' : 
                                        'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(day.utilization, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[#1F2937] font-medium w-12 text-right">
                                    {day.utilization}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {day.scheduled_quantity === 0 ? (
                                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                    미배정
                                  </span>
                                ) : day.utilization >= 80 ? (
                                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                    최적
                                  </span>
                                ) : day.utilization >= 50 ? (
                                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                                    양호
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                    여유
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
                          <tr>
                            <td colSpan={2} className="px-4 py-3 text-sm font-medium text-[#1F2937]">
                              주간 합계
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-[#2563EB]">
                              {weeklySummary.reduce((sum, day) => sum + day.scheduled_quantity, 0).toLocaleString()}개
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-[#1F2937]">
                              {Math.max(...weeklySummary.map(d => d.equipment_count))}대
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-[#1F2937]">
                              평균 {(weeklySummary.reduce((sum, day) => sum + day.utilization, 0) / 7).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
};