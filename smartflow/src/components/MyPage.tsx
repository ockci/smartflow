import { useState, useEffect } from 'react';
import { User, Mail, Building, Phone, Shield, Bell, CreditCard, LogOut, ArrowLeft, Save, Edit } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Sidebar } from './Sidebar';
import { authAPI } from '../lib/api';  // ⭐ API import 추가 (상위 폴더)

interface MyPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function MyPage({ onNavigate, onLogout }: MyPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);  // ⭐ 로딩 상태 추가
  const [error, setError] = useState<string | null>(null);  // ⭐ 에러 상태 추가
  
  // ⭐ 실제 사용자 데이터로 초기화
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    company: '',
    position: '관리자',
    phone: '010-0000-0000',
    created_at: '',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    orderAlert: true,
    stockAlert: true,
    weeklyReport: false,
  });

  // ⭐ 컴포넌트 마운트 시 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const user = await authAPI.getCurrentUser();
        
        setUserData({
          name: user.username,
          email: user.email,
          company: user.company_name || '회사 미등록',
          position: '관리자',
          phone: '010-0000-0000',  // 백엔드에 phone 없으면 기본값
          created_at: new Date(user.created_at).toLocaleDateString('ko-KR'),
        });
        
        setError(null);
      } catch (err: any) {
        console.error('사용자 정보 로딩 실패:', err);
        setError('사용자 정보를 불러올 수 없습니다');
        
        // 401 에러면 로그아웃
        if (err.response?.status === 401) {
          alert('로그인이 만료되었습니다');
          onLogout();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [onLogout]);

  const handleSave = () => {
    setIsEditing(false);
    // TODO: 실제 저장 로직 (API 호출)
  };

  // ⭐ 로딩 중
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // ⭐ 에러 발생
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => onNavigate('dashboard')}>대시보드로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      <Sidebar currentPage="mypage" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col">
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
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#1F2937] text-2xl">마이페이지</h1>
                <p className="text-sm text-[#6B7280]">계정 설정 및 프로필 관리</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Profile Card */}
            <div className="lg:col-span-1">
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-24 h-24 mb-4">
                      <AvatarFallback className="bg-gradient-to-br from-[#2563EB] to-[#1E40AF] text-white text-2xl">
                        {userData.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h2 className="text-[#1F2937] text-xl mb-1">{userData.name}</h2>
                    <p className="text-[#6B7280] text-sm mb-1">{userData.position}</p>
                    <p className="text-[#6B7280] text-sm mb-4">{userData.company}</p>
                    
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-[#6B7280]">가입일</span>
                        <span className="text-sm text-[#1F2937]">{userData.created_at}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-[#6B7280]">플랜</span>
                        <span className="text-sm text-[#10B981]">프리미엄</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-[#6B7280]">발주 건수</span>
                        <span className="text-sm text-[#1F2937]">-건</span>
                      </div>
                    </div>
                    
                    <Separator className="my-6" />
                    
                    <Button
                      onClick={onLogout}
                      variant="outline"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      로그아웃
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Content - Profile Details & Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Information */}
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[#1F2937] text-lg font-semibold">프로필 정보</h3>
                    <Button
                      onClick={() => setIsEditing(!isEditing)}
                      variant="outline"
                      size="sm"
                    >
                      {isEditing ? (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          저장
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          수정
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2 text-[#6B7280]">
                        <User className="w-4 h-4" />
                        이름
                      </Label>
                      <Input
                        id="name"
                        value={userData.name}
                        onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                        disabled={!isEditing}
                        className="border-[#E5E7EB]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2 text-[#6B7280]">
                        <Mail className="w-4 h-4" />
                        이메일
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={userData.email}
                        disabled
                        className="border-[#E5E7EB] bg-gray-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company" className="flex items-center gap-2 text-[#6B7280]">
                        <Building className="w-4 h-4" />
                        회사명
                      </Label>
                      <Input
                        id="company"
                        value={userData.company}
                        onChange={(e) => setUserData({ ...userData, company: e.target.value })}
                        disabled={!isEditing}
                        className="border-[#E5E7EB]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2 text-[#6B7280]">
                        <Phone className="w-4 h-4" />
                        연락처
                      </Label>
                      <Input
                        id="phone"
                        value={userData.phone}
                        onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                        disabled={!isEditing}
                        className="border-[#E5E7EB]"
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-6 flex gap-3">
                      <Button onClick={handleSave} className="bg-[#2563EB] hover:bg-[#1E40AF]">
                        <Save className="w-4 h-4 mr-2" />
                        저장하기
                      </Button>
                      <Button onClick={() => setIsEditing(false)} variant="outline">
                        취소
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Bell className="w-5 h-5 text-[#2563EB]" />
                    <h3 className="text-[#1F2937] text-lg font-semibold">알림 설정</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB]">
                      <div>
                        <p className="text-[#1F2937] font-medium">이메일 알림</p>
                        <p className="text-sm text-[#6B7280]">중요한 업데이트를 이메일로 받습니다</p>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, email: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB]">
                      <div>
                        <p className="text-[#1F2937] font-medium">발주 완료 알림</p>
                        <p className="text-sm text-[#6B7280]">발주가 완료되면 즉시 알림을 받습니다</p>
                      </div>
                      <Switch
                        checked={notifications.orderAlert}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, orderAlert: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB]">
                      <div>
                        <p className="text-[#1F2937] font-medium">재고 부족 알림</p>
                        <p className="text-sm text-[#6B7280]">재고가 안전 수준 이하로 떨어지면 알림을 받습니다</p>
                      </div>
                      <Switch
                        checked={notifications.stockAlert}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, stockAlert: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-[#1F2937] font-medium">주간 리포트</p>
                        <p className="text-sm text-[#6B7280]">매주 월요일 주간 요약 리포트를 받습니다</p>
                      </div>
                      <Switch
                        checked={notifications.weeklyReport}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, weeklyReport: checked })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security */}
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Shield className="w-5 h-5 text-[#2563EB]" />
                    <h3 className="text-[#1F2937] text-lg font-semibold">보안</h3>
                  </div>

                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-[#E5E7EB] hover:bg-[#F9FAFB]"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      비밀번호 변경
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}