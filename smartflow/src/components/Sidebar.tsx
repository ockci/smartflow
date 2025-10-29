import { useState, useEffect } from 'react';
import { LayoutDashboard, Calculator, FileText, TrendingUp, User, Settings, LogOut, HardHat, Package, Calendar, Box, Brain } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { authAPI } from '../utils/api';  // ⭐ API import 추가

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'equipment', label: '설비 관리', icon: HardHat },
  { id: 'products', label: '제품 관리', icon: Box },
  { id: 'orders', label: '주문 관리', icon: Package },
  { id: 'schedule', label: '스케줄링', icon: Calendar },
  { id: 'order', label: '발주 계산', icon: Calculator },
  { id: 'forecast', label: 'AI 예측', icon: Brain },
  { id: 'history', label: '발주 이력', icon: FileText },
  { id: 'simulation', label: '시뮬레이션', icon: TrendingUp },
];

export function Sidebar({ currentPage, onNavigate, onLogout }: SidebarProps) {
  // ⭐ 실제 사용자 정보 상태
  const [userName, setUserName] = useState('로딩중...');
  const [companyName, setCompanyName] = useState('');

  // ⭐ 컴포넌트 마운트 시 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const user = await authAPI.getCurrentUser();
        setUserName(user.username);
        setCompanyName(user.company_name || '회사 미등록');
      } catch (err) {
        console.error('사용자 정보 로딩 실패:', err);
        setUserName('Unknown');
        setCompanyName('');
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col h-screen sticky top-0">
      {/* User Profile Section */}
      <div className="p-6 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3 mb-2">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="bg-gradient-to-br from-[#2563EB] to-[#1E40AF] text-white">
              {userName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-xs text-[#6B7280]">환영합니다,</p>
            <p className="text-[#1F2937]">{userName} 님</p>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg px-3 py-2 mt-3">
          <p className="text-xs text-[#6B7280]">소속</p>
          <p className="text-sm text-[#1F2937]">{companyName}</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#1E40AF] text-white shadow-md' 
                    : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>

        <Separator className="my-6" />

        {/* Settings Menu */}
        <div className="space-y-1">
          <button
            onClick={() => onNavigate('mypage')}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
              ${currentPage === 'mypage'
                ? 'bg-gradient-to-r from-[#2563EB] to-[#1E40AF] text-white shadow-md' 
                : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]'
              }
            `}
          >
            <User className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">마이페이지</span>
          </button>

          <button
            onClick={() => {
              onLogout();
              onNavigate('login');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#6B7280] hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">로그아웃</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}