import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { DashboardPage } from './components/DashboardPage';
import { OrderCalculationPage } from './components/OrderCalculationPage';
import { SimulationPage } from './components/SimulationPage';
import { OrderHistoryPage } from './components/OrderHistoryPage';
import { MyPage } from './components/MyPage';
import { Toaster } from './components/ui/sonner';
import { EquipmentPage } from './pages/EquipmentPage';
import { OrderUploadPage } from './pages/OrderUploadPage';
import { SchedulePage } from './pages/SchedulePage';
import { ForecastPage } from './pages/ForecastPage';
import { ProductManagementPage } from './pages/ProductManagementPage';

type Page = 'login' | 'signup' | 'dashboard' | 'order' | 'simulation' | 'history' | 'mypage' | 'equipment' | 'orders' | 'schedule' | 'forecast' | 'products';


export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 로드 시 토큰 확인
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
      setCurrentPage('dashboard');
    }
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleSignup = () => {
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken'); // accessToken 제거
    localStorage.removeItem('login'); // 혹시 다른 로그인 플래그도 있으면 같이 제거
    setIsLoggedIn(false);
    setCurrentPage('login');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 로그인 상태가 아닐 때 */}
      {!isLoggedIn && (
        <>
          {currentPage === 'login' && (
            <LoginPage 
              onLogin={handleLogin} 
              onSignup={() => setCurrentPage('signup')} 
            />
          )}
          {currentPage === 'signup' && (
            <SignupPage 
              onSignup={handleSignup} 
              onBackToLogin={() => setCurrentPage('login')} 
            />
          )}
        </>
      )}

      {/* 로그인 상태일 때 */}
      {isLoggedIn && (
        <>
          {currentPage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} onLogout={handleLogout} />}
          {currentPage === 'order' && <OrderCalculationPage onNavigate={handleNavigate} onLogout={handleLogout} />}
          {currentPage === 'simulation' && <SimulationPage onNavigate={handleNavigate} onLogout={handleLogout} />}
          {currentPage === 'history' && <OrderHistoryPage onNavigate={handleNavigate} onLogout={handleLogout} />}
          {currentPage === 'mypage' && <MyPage onNavigate={handleNavigate} onLogout={handleLogout} />}
          {currentPage === 'equipment' && <EquipmentPage onNavigate={handleNavigate} onLogout={handleLogout} />}
          {currentPage === 'orders' && <OrderUploadPage onNavigate={handleNavigate} onLogout={handleLogout} />}
          {currentPage === 'schedule' && <SchedulePage onNavigate={handleNavigate} onLogout={handleLogout} />}
          {currentPage === 'forecast' && <ForecastPage onNavigate={handleNavigate} />}
          {currentPage === 'products' && <ProductManagementPage onNavigate={handleNavigate} onLogout={handleLogout} />}
        </>
      )}

      <Toaster />
    </div>
  );
}