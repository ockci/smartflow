import { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { authAPI } from '../utils/api';

interface LoginPageProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function LoginPage({ onLogin, onSignup }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      await authAPI.login(email, password);

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      console.log('로그인 성공!');
      onLogin();
    } catch (error: any) {
      console.error('로그인 실패:', error);
      const errorMsg = error.response?.data?.detail || '이메일 또는 비밀번호가 올바르지 않습니다';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Illustration & Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#2563EB] via-[#1E40AF] to-[#1E3A8A]"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(37, 99, 235, 0.95) 0%, rgba(30, 64, 175, 0.95) 50%, rgba(30, 58, 138, 0.95) 100%), url('https://images.unsplash.com/photo-1621685743758-fbcfa21f9856?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwc3VwcGx5JTIwY2hhaW58ZW58MXx8fHwxNzYxMTE4OTk1fDA&ixlib=rb-4.1.0&q=80&w=1080')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div className="relative z-10 flex flex-col justify-center items-start p-16 text-white">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 mb-6">
              <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
              <span className="text-sm">AI Powered System</span>
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-6">
            AI가 당신의 발주를<br />
            <span className="text-[#10B981]">똑똑하게 관리</span>합니다
          </h1>

          <p className="text-xl text-white/90 mb-12">
            데이터 기반 최적 발주, 이제는 SmartFlow와 함께
          </p>

          <div className="space-y-4 text-white/90">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#10B981] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="mb-1">실시간 수요 예측</h3>
                <p className="text-sm text-white/80">AI가 과거 데이터를 분석하여 미래 수요를 정확히 예측합니다</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#10B981] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="mb-1">최적 발주 계산</h3>
                <p className="text-sm text-white/80">재고 부족과 과다 재고를 방지하는 최적의 발주량을 제안합니다</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#10B981] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="mb-1">직관적인 대시보드</h3>
                <p className="text-sm text-white/80">현황 파악이 한눈에 되는 대시보드로 의사결정이 간편합니다</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#F9FAFB]">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-[#1F2937] text-3xl font-bold">SmartFlow</h2>
            </div>
            <p className="text-[#6B7280]">발주 관리 시스템에 로그인하세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-[#374151]">
                <Mail className="w-4 h-4" />
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your-email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2 text-[#374151]">
                <Lock className="w-4 h-4" />
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-[#6B7280] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                />
                로그인 상태 유지
              </label>
              <a href="#" className="text-[#2563EB] hover:underline">
                비밀번호 찾기
              </a>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1E40AF] text-white transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#F9FAFB] px-2 text-gray-500">
                  계정이 없으신가요?
                </span>
              </div>
            </div>
            <Button
              onClick={onSignup}
              variant="outline"
              className="w-full mt-4 h-11"
            >
              회원가입
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}