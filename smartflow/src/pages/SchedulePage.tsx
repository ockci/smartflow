import React, { useState, useEffect } from 'react';
import { scheduleAPI, apiClient } from '../lib/api';
import {
  CalendarDays,
  Download,
  Play,
  StopCircle,
  Package,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
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
  status?: string;
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

export const SchedulePage: React.FC<SchedulePageProps> = ({ onNavigate, onLogout }) => {
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

  // 스케줄 조회
  const fetchSchedule = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await scheduleAPI.getResult();
      const data = response?.data || response;

      if (!data?.schedule || data.schedule.length === 0) {
        setScheduleData(null);
        toast.info('스케줄 데이터가 없습니다');
        return;
      }

      const formattedData = {
        schedules: data.schedule,
        metrics: data.metrics || metrics,
      };
      setScheduleData(formattedData);
    } catch (error) {
      console.error('스케줄 조회 실패:', error);
      setScheduleData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 주간 요약 조회 (7일 미만이면 3일만 보여줌)
  const fetchWeeklySummary = async (): Promise<void> => {
    try {
      setLoadingWeekly(true);
      const response = await apiClient.get('/api/schedule/weekly-summary');
      const list: WeeklySummary[] = response.data.weekly_summary || [];
      if (list.length < 7) {
        setWeeklySummary(list.slice(0, Math.min(list.length, 3)));
      } else {
        setWeeklySummary(list.slice(0, 7));
      }
    } catch (error) {
      console.error('주간 요약 로딩 실패:', error);
      setWeeklySummary([]);
    } finally {
      setLoadingWeekly(false);
    }
  };

  // 스케줄 생성 (헤더 버튼)
  const handleGenerateSchedule = async (): Promise<void> => {
    if (!window.confirm('새로운 스케줄을 생성하시겠습니까?')) return;
    try {
      setIsGenerating(true);
      toast.info('스케줄 생성 중...');

      const startTime = Date.now();
      const response = await scheduleAPI.generate();
      const data = response?.data || response;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      if (!data?.schedule || data.schedule.length === 0) {
        toast.error('스케줄 생성 실패: 유효한 데이터가 없습니다');
        return;
      }

      setScheduleData({ schedules: data.schedule, metrics: data.metrics || metrics });
      await fetchWeeklySummary();

      toast.success(`스케줄 생성 완료 (${elapsed}s)`);
    } catch (error: any) {
      console.error('스케줄 생성 실패:', error);
      toast.error(error?.response?.data?.detail || '스케줄 생성에 실패했습니다');
    } finally {
      setIsGenerating(false);
    }
  };

  // 작업 상태 변경 (가동 / 종료)
  const handleStatusChange = async (scheduleId: number, currentStatus: string | undefined) => {
    try {
      const newStatus = currentStatus === 'in_progress' ? 'completed' : 'in_progress';
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `http://localhost:8000/api/schedule/${scheduleId}/status?status=${newStatus}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error('상태 변경 실패');
      toast.success(newStatus === 'in_progress' ? '작업 시작' : '작업 완료');
      // 상태 바뀐 후 스케줄 재조회
      await fetchSchedule();
      // 가동(시작)하면 대시보드로 잠깐 이동(원래 로직 유지)
      if (newStatus === 'in_progress') {
        setTimeout(() => onNavigate('dashboard'), 500);
      }
    } catch (e) {
      console.error('상태 변경 실패', e);
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  // 기계별 그룹화
  const groupedSchedules = schedules.reduce((acc, schedule) => {
    const key = schedule.machine_id || '미지정';
    if (!acc[key]) acc[key] = [];
    acc[key].push(schedule);
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  useEffect(() => {
    fetchSchedule();
    fetchWeeklySummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      <Sidebar currentPage="schedule" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col">
        {/* Header: 생성 버튼 항상 보이도록 */}
        <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#1F2937]">생산 스케줄링</h1>
                <p className="text-sm text-[#6B7280]">AI 기반 최적화 스케줄</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleGenerateSchedule}
                disabled={isGenerating}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              >
                {isGenerating ? '⏳ 생성 중...' : '스케줄 생성'}
              </Button>
              <Button onClick={() => { const url = scheduleAPI.downloadExcel(); window.open(url, '_blank'); }}>
                <Download className="w-4 h-4 mr-2" />
                다운로드
              </Button>
            </div>
          </div>
        </header>

        {/* Main: 좌(기계별) 우(전체 상단 / 주간 하단) */}
        <main className="flex-1 p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 왼쪽: 기계별 (col-span 1) */}
              <div className="lg:col-span-1">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>기계별 스케줄</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.keys(groupedSchedules).length === 0 ? (
                      <div className="text-center text-gray-500 py-8">스케줄 데이터가 없습니다</div>
                    ) : (
                      Object.entries(groupedSchedules).map(([machineId, items]) => (
                        <div key={machineId} className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-gray-800">{machineId}</h3>
                            <span className="text-xs text-gray-500">{items.length}건</span>
                          </div>

                          <div className="space-y-2">
                            {items.map((s) => {
                              const start = new Date(s.start_time);
                              const end = new Date(s.end_time);
                              const hours = Math.max(1, Math.round(s.duration_minutes / 60));
                              return (
                                <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{s.product_code}</p>
                                    <p className="text-xs text-gray-500 truncate">{s.order_number}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} →
                                      {end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 ml-4">
                                    {/* 상태 표시 */}
                                    {s.status === 'in_progress' ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                        ⚙️ 진행중
                                      </span>
                                    ) : s.status === 'completed' ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                        ✅ 완료
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                        ⏸ 대기
                                      </span>
                                    )}

                                    {/* 가동/종료 버튼 (눈에 띄게) */}
                                    {s.status === 'in_progress' ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleStatusChange(s.id, s.status)}
                                        className="border-green-600 text-green-600 hover:bg-green-50"
                                      >
                                        <StopCircle className="w-4 h-4 mr-1" />
                                        종료
                                      </Button>
                                    ) : s.status === 'completed' ? (
                                      <Button size="sm" variant="ghost" className="text-gray-400" disabled>
                                        완료
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => handleStatusChange(s.id, s.status)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                      >
                                        <Play className="w-4 h-4 mr-1" />
                                        시작
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 오른쪽: 전체 스케줄(상단) + 주간 계획(하단) => col-span 2 */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* 전체 스케줄 (상단) */}
                <Card>
                  <CardHeader>
                    <CardTitle>전체 스케줄</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {schedules.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">전체 스케줄이 없습니다</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>기계</TableHead>
                              <TableHead>제품</TableHead>
                              <TableHead>주문번호</TableHead>
                              <TableHead>시작</TableHead>
                              <TableHead>종료</TableHead>
                              <TableHead>시간</TableHead>
                              <TableHead className="text-center">상태</TableHead>
                              <TableHead className="text-center">액션</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {schedules.map((item) => {
                              const start = new Date(item.start_time);
                              const end = new Date(item.end_time);
                              const hours = Math.max(1, Math.round(item.duration_minutes / 60));
                              
                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.machine_id}</TableCell>
                                  <TableCell>{item.product_code}</TableCell>
                                  <TableCell>{item.order_number}</TableCell>
                                  <TableCell className="text-sm">
                                    {start.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {end.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </TableCell>
                                  <TableCell className="font-semibold">{hours}시간</TableCell>
                                  <TableCell className="text-center">
                                    {item.status === 'in_progress' ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">⚙️ 진행중</span>
                                    ) : item.status === 'completed' ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800">✅ 완료</span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">⏸ 대기</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {item.status === 'in_progress' ? (
                                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(item.id, item.status)} className="border-green-600 text-green-600 hover:bg-green-50">
                                        <StopCircle className="w-4 h-4 mr-1" /> 종료
                                      </Button>
                                    ) : item.status === 'completed' ? (
                                      <span className="text-xs text-gray-400">완료</span>
                                    ) : (
                                      <Button size="sm" onClick={() => handleStatusChange(item.id, item.status)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        <Play className="w-4 h-4 mr-1" /> 시작
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 주간 계획 (하단) */}
                <Card>
                  <CardHeader className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-[#2563EB]" />
                      <CardTitle>주간 생산 계획</CardTitle>
                    </div>
                    <div className="text-sm text-[#6B7280]">{weeklySummary.length > 0 ? `${weeklySummary.length}일 표시` : '데이터 없음'}</div>
                  </CardHeader>
                  <CardContent>
                    {loadingWeekly ? (
                      <div className="text-center py-6 text-gray-500">로딩 중...</div>
                    ) : weeklySummary.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">주간 데이터가 없습니다</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                            <tr>
                              <th className="px-4 py-2 text-left">날짜</th>
                              <th className="px-4 py-2 text-left">요일</th>
                              <th className="px-4 py-2 text-right">생산 예정</th>
                              <th className="px-4 py-2 text-right">가동률</th>
                              <th className="px-4 py-2 text-center">상태</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weeklySummary.map((d) => (
                              <tr key={d.date} className="border-b hover:bg-[#F9FAFB]">
                                <td className="px-4 py-2">{d.date}</td>
                                <td className="px-4 py-2">{d.day_of_week}</td>
                                <td className="px-4 py-2 text-right font-medium">{d.scheduled_quantity.toLocaleString()}개</td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div style={{ width: `${Math.min(d.utilization, 100)}%` }} className={`h-full ${d.utilization >= 80 ? 'bg-green-500' : d.utilization >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                    </div>
                                    <span className="w-10 text-right font-medium">{d.utilization}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {d.scheduled_quantity === 0 ? (
                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">미배정</span>
                                  ) : d.utilization >= 80 ? (
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">최적</span>
                                  ) : d.utilization >= 50 ? (
                                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">양호</span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">여유</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
                            <tr>
                              <td colSpan={2} className="px-4 py-2 text-sm font-medium">합계</td>
                              <td className="px-4 py-2 text-right font-bold text-[#2563EB]">{weeklySummary.reduce((sum, d) => sum + d.scheduled_quantity, 0).toLocaleString()}개</td>
                              <td className="px-4 py-2 text-right">{weeklySummary.length ? Math.round(weeklySummary.reduce((sum, d) => sum + d.utilization, 0) / weeklySummary.length) : 0}%</td>
                              <td className="px-4 py-2"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
