import { useState } from 'react';
import { User, Mail, Building, Phone, Shield, Bell, CreditCard, LogOut, ArrowLeft, Save, Edit } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Sidebar } from './Sidebar'; // Sidebar 컴포넌트 import

interface MyPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function MyPage({ onNavigate, onLogout }: MyPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    name: '김민준',
    email: 'minjun.kim@democompany.com',
    company: '㈜ 데모컴퍼니',
    position: '관리자',
    phone: '010-1234-5678',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    orderAlert: true,
    stockAlert: true,
    weeklyReport: false,
  });

  const handleSave = () => {
    setIsEditing(false);
    // 여기에 실제 저장 로직을 추가합니다 (e.g., API 호출)
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F0F9FF] via-[#F9FAFB] to-[#F0FFFE]">
      {/* Sidebar */}
      <Sidebar currentPage="mypage" onNavigate={onNavigate} onLogout={onLogout} />


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
                        김
                      </AvatarFallback>
                    </Avatar>
                    
                    <h2 className="text-[#1F2937] text-xl mb-1">{userData.name}</h2>
                    <p className="text-[#6B7280] text-sm mb-1">{userData.position}</p>
                    <p className="text-[#6B7280] text-sm mb-4">{userData.company}</p>
                    
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-[#6B7280]">가입일</span>
                        <span className="text-sm text-[#1F2937]">2025.01.15</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-[#6B7280]">플랜</span>
                        <span className="text-sm text-[#10B981]">프리미엄</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-[#6B7280]">발주 건수</span>
                        <span className="text-sm text-[#1F2937]">127건</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full mt-4 border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      플랜 변경
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-[#E5E7EB] shadow-md mt-6">
                <CardContent className="p-6">
                  <h3 className="text-[#1F2937] mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#10B981]" />
                    보안
                  </h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                    >
                      비밀번호 변경
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                    >
                      2단계 인증 설정
                    </Button>
                    <Separator />
                    <Button
                      onClick={onLogout}
                      variant="ghost"
                      className="w-full justify-start text-[#EF4444] hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      로그아웃
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Content - Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Information */}
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <div className="border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
                  <h2 className="text-[#1F2937] text-xl">프로필 정보</h2>
                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      수정
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsEditing(false)}
                        variant="outline"
                        size="sm"
                        className="border-[#E5E7EB] text-[#6B7280]"
                      >
                        취소
                      </Button>
                      <Button
                        onClick={handleSave}
                        size="sm"
                        className="bg-[#2563EB] hover:bg-[#1E40AF] text-white"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2 text-[#374151]">
                        <User className="w-4 h-4" />
                        이름
                      </Label>
                      <Input
                        id="name"
                        value={userData.name}
                        onChange={(e) => setUserData({...userData, name: e.target.value})}
                        disabled={!isEditing}
                        className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 disabled:bg-[#F9FAFB]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2 text-[#374151]">
                        <Mail className="w-4 h-4" />
                        이메일
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={userData.email}
                        onChange={(e) => setUserData({...userData, email: e.target.value})}
                        disabled={!isEditing}
                        className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 disabled:bg-[#F9FAFB]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company" className="flex items-center gap-2 text-[#374151]">
                        <Building className="w-4 h-4" />
                        회사명
                      </Label>
                      <Input
                        id="company"
                        value={userData.company}
                        onChange={(e) => setUserData({...userData, company: e.target.value})}
                        disabled={!isEditing}
                        className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 disabled:bg-[#F9FAFB]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2 text-[#374151]">
                        <Phone className="w-4 h-4" />
                        연락처
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={userData.phone}
                        onChange={(e) => setUserData({...userData, phone: e.target.value})}
                        disabled={!isEditing}
                        className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 disabled:bg-[#F9FAFB]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <div className="border-b border-[#E5E7EB] px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#2563EB]" />
                    <h2 className="text-[#1F2937] text-xl">알림 설정</h2>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[#1F2937] mb-1">이메일 알림</h3>
                        <p className="text-sm text-[#6B7280]">중요한 업데이트를 이메일로 받습니다</p>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked: any) => setNotifications({...notifications, email: checked})}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[#1F2937] mb-1">발주 완료 알림</h3>
                        <p className="text-sm text-[#6B7280]">발주가 완료되면 즉시 알림을 받습니다</p>
                      </div>
                      <Switch
                        checked={notifications.orderAlert}
                        onCheckedChange={(checked: any) => setNotifications({...notifications, orderAlert: checked})}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[#1F2937] mb-1">재고 부족 경고</h3>
                        <p className="text-sm text-[#6B7280]">재고가 안전선 아래로 떨어지면 알림을 받습니다</p>
                      </div>
                      <Switch
                        checked={notifications.stockAlert}
                        onCheckedChange={(checked: any) => setNotifications({...notifications, stockAlert: checked})}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[#1F2937] mb-1">주간 리포트</h3>
                        <p className="text-sm text-[#6B7280]">매주 월요일 요약 리포트를 받습니다</p>
                      </div>
                      <Switch
                        checked={notifications.weeklyReport}
                        onCheckedChange={(checked: any) => setNotifications({...notifications, weeklyReport: checked})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Actions */}
              <Card className="bg-white border border-[#E5E7EB] shadow-md">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <Shield className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-[#1F2937] mb-1">데이터 내보내기</h3>
                        <p className="text-sm text-[#6B7280] mb-3">
                          발주 이력 및 재고 데이터를 CSV 파일로 다운로드할 수 있습니다
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#F59E0B] text-[#F59E0B] hover:bg-orange-50"
                        >
                          데이터 내보내기
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <Shield className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-[#1F2937] mb-1">계정 삭제</h3>
                        <p className="text-sm text-[#6B7280] mb-3">
                          계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#EF4444] text-[#EF4444] hover:bg-red-50"
                        >
                          계정 삭제
                        </Button>
                      </div>
                    </div>
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