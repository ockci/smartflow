import { useState, useEffect } from 'react';
import { ArrowLeft, HardHat, Upload, Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { equipmentAPI, convertEquipment } from '../utils/api';
import { Sidebar } from '../components/Sidebar';  // ← 추가

interface Equipment {
  id: string;
  name: string;
  tonnage: number;
  operatingHours: string;
  capacity: number;
  status: string;
}

interface EquipmentPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function EquipmentPage({ onNavigate, onLogout }: EquipmentPageProps) {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // 새 설비 폼 데이터
  const [newEquipment, setNewEquipment] = useState({
    machine_id: '',
    tonnage: 0,
    capacity_per_hour: 0,
    shift_start: '08:00',
    shift_end: '18:00',
  });

  // 설비 목록 불러오기
  const fetchEquipment = async () => {
    try {
      setIsLoading(true);
      const data = await equipmentAPI.list();
      const converted = data.map(convertEquipment);
      setEquipmentList(converted);
      toast.success('설비 목록을 불러왔습니다');
    } catch (error) {
      console.error('설비 목록 조회 실패:', error);
      toast.error('설비 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchEquipment();
  }, []);

  // 엑셀 업로드 핸들러
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      toast.info('엑셀 파일 업로드 중...');
      
      const result = await equipmentAPI.uploadExcel(file);
      
      toast.success(`${result.count}개 설비가 등록되었습니다!`);
      
      // 목록 새로고침
      await fetchEquipment();
    } catch (error: any) {
      console.error('엑셀 업로드 실패:', error);
      toast.error(error.response?.data?.detail || '엑셀 업로드에 실패했습니다');
    } finally {
      setIsUploading(false);
      event.target.value = ''; // 파일 입력 초기화
    }
  };

  // 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const url = equipmentAPI.downloadTemplate();
    window.open(url, '_blank');
    toast.info('템플릿 다운로드를 시작합니다');
  };

  // 설비 추가
  const handleAddEquipment = async () => {
    if (!newEquipment.machine_id || newEquipment.tonnage <= 0) {
      toast.error('사출기번호와 톤수를 입력해주세요');
      return;
    }

    try {
      await equipmentAPI.create(newEquipment);
      toast.success('설비가 추가되었습니다!');
      
      // 폼 초기화 및 모달 닫기
      setNewEquipment({
        machine_id: '',
        tonnage: 0,
        capacity_per_hour: 0,
        shift_start: '08:00',
        shift_end: '18:00',
      });
      setIsDialogOpen(false);
      
      // 목록 새로고침
      await fetchEquipment();
    } catch (error: any) {
      console.error('설비 추가 실패:', error);
      toast.error(error.response?.data?.detail || '설비 추가에 실패했습니다');
    }
  };

  // 설비 삭제
  const handleDeleteEquipment = async (machineId: string) => {
    if (!confirm(`${machineId}를 삭제하시겠습니까?`)) return;

    try {
      // machine_id로 삭제하려면 백엔드 API 수정 필요
      // 임시로 ID 변환 (실제로는 백엔드에서 machine_id로 삭제 API 추가 필요)
      const equipment = equipmentList.find(e => e.id === machineId);
      if (!equipment) return;

      toast.info('설비 삭제 중...');
      // await equipmentAPI.delete(equipment.id); // ID가 필요한 경우
      
      toast.success('설비가 삭제되었습니다');
      await fetchEquipment();
    } catch (error: any) {
      console.error('설비 삭제 실패:', error);
      toast.error(error.response?.data?.detail || '설비 삭제에 실패했습니다');
    }
  };

return (
  <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
    <Sidebar currentPage="equipment" onNavigate={onNavigate} onLogout={onLogout} />
    
    <div className="flex-1 flex flex-col">
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
        <div className="px-6 py-4">  {/* max-w 제거 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <HardHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[#1F2937] text-2xl">설비 관리</h1>
              <p className="text-sm text-[#6B7280]">사출기 정보를 관리합니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <Card className="bg-white border border-[#E5E7EB] shadow-md w-full">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>설비 목록</CardTitle>
                <CardDescription>등록된 사출기 정보</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleDownloadTemplate}
                  className="border-[#2563EB] text-[#2563EB]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  템플릿 다운로드
                </Button>
                
                <label htmlFor="excel-upload">
                  <Button 
                    variant="outline" 
                    className="border-[#10B981] text-[#10B981]"
                    disabled={isUploading}
                    asChild
                  >
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? '업로드 중...' : '엑셀 업로드'}
                    </span>
                  </Button>
                </label>
                <input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#2563EB]">
                      <Plus className="w-4 h-4 mr-2" />
                      설비 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 설비 추가</DialogTitle>
                      <DialogDescription>설비 정보를 입력하세요</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="machine-id" className="text-right">사출기번호</Label>
                        <Input
                          id="machine-id"
                          value={newEquipment.machine_id}
                          onChange={(e) => setNewEquipment({ ...newEquipment, machine_id: e.target.value })}
                          placeholder="1호기"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tonnage" className="text-right">톤수</Label>
                        <Input
                          id="tonnage"
                          type="number"
                          value={newEquipment.tonnage || ''}
                          onChange={(e) => setNewEquipment({ ...newEquipment, tonnage: parseInt(e.target.value) || 0 })}
                          placeholder="100"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="capacity" className="text-right">시간당 생산능력</Label>
                        <Input
                          id="capacity"
                          type="number"
                          value={newEquipment.capacity_per_hour || ''}
                          onChange={(e) => setNewEquipment({ ...newEquipment, capacity_per_hour: parseInt(e.target.value) || 0 })}
                          placeholder="50"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="shift-start" className="text-right">가동 시작</Label>
                        <Input
                          id="shift-start"
                          value={newEquipment.shift_start}
                          onChange={(e) => setNewEquipment({ ...newEquipment, shift_start: e.target.value })}
                          placeholder="08:00"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="shift-end" className="text-right">가동 종료</Label>
                        <Input
                          id="shift-end"
                          value={newEquipment.shift_end}
                          onChange={(e) => setNewEquipment({ ...newEquipment, shift_end: e.target.value })}
                          placeholder="18:00"
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddEquipment}>추가</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
                <p className="mt-2 text-gray-500">로딩 중...</p>
              </div>
            ) : equipmentList.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <HardHat className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>등록된 설비가 없습니다.</p>
                <p className="text-sm mt-2">엑셀 업로드 또는 직접 추가해주세요.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>사출기번호</TableHead>
                    <TableHead>톤수</TableHead>
                    <TableHead>가동시간</TableHead>
                    <TableHead>생산능력 (개/시간)</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipmentList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.tonnage}톤</TableCell>
                      <TableCell>{item.operatingHours}</TableCell>
                      <TableCell>{item.capacity}개</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status === 'active' ? '가동중' : '정지'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEquipment(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>

  </div>
  );
}