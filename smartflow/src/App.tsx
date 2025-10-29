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

  // ì•± ë¡œë“œ ì‹œ í† í° í™•ì¸
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
    localStorage.removeItem('accessToken'); // accessToken ì œê±°
    localStorage.removeItem('login'); // í˜¹ì‹œ ë‹¤ë¥¸ ë¡œê·¸ì¸ í”Œëž˜ê·¸ë„ ìžˆìœ¼ë©´ ê°™ì´ ì œê±°
    setIsLoggedIn(false);
    setCurrentPage('login');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  // ë¡œë”© ì¤‘
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
          <p className="mt-4 text-gray-600">ë¡œë”© ì¤‘...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ë¡œê·¸ì¸ ìƒíƒœê°€ ì•„ë‹ ë•Œ */}
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

      {/* ë¡œê·¸ì¸ ìƒíƒœì¼ ë•Œ */}
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
          {currentPage === 'forecast' && <ForecastPage onNavigate={handleNavigate} onLogout={handleLogout} />}
          {currentPage === 'products' && <ProductManagementPage onNavigate={handleNavigate} onLogout={handleLogout} />}
        </>
      )}

      <Toaster />
    </div>
  );
}