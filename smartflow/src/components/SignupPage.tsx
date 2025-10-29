import { useState } from 'react';
import { User, Mail, Lock, Building, Phone, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { authAPI } from '../utils/api';

interface SignupPageProps {
  onSignup: () => void;
  onBackToLogin: () => void;
}

export function SignupPage({ onSignup, onBackToLogin }: SignupPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    position: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 검증
    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다');
      return;
    }

    if (!formData.name || !formData.email || !formData.password || !formData.company) {
      alert('필수 항목을 입력해주세요');
      return;
    }

    if (formData.password.length < 8) {
      alert('비밀번호는 최소 8자 이상이어야 합니다');
      return;
    }

    setLoading(true);
    try {
      await authAPI.signup({
        username: formData.name,
        email: formData.email,
        password: formData.password,
        company_name: formData.company,
      });

      console.log('회원가입 성공!');
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
      onBackToLogin();
    } catch (error: any) {
      console.error('회원가입 실패:', error);
      const errorMsg = error.response?.data?.detail || '회원가입에 실패했습니다';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-[#2563EB] via-[#1E40AF] to-[#1E3A8A]"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(37, 99, 235, 0.95) 0%, rgba(30, 64, 175, 0.95) 50%, rgba(30, 58, 138, 0.95) 100%), url('https://images.unsplash.com/photo-1583737077382-3f51318d6074?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB3YXJlaG91c2UlMjBpbnZlbnRvcnl8ZW58MXx8fHwxNzYxMDk2MDExfDA&ixlib=rb-4.1.0&q=80&w=1080')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        <div className="relative z-10 flex flex-col justify-center items-start p-16 text-white">
          <div className="mb-12">
            <h1 className="text-5xl mb-6">
              SmartFlow와 함께<br />
              <span className="text-[#10B981]">스마트한 발주 관리</span>를<br />
              시작하세요
            </h1>
            
            <p className="text-xl text-white/90">
              중소 제조기업을 위한 AI 발주 최적화 솔루션
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg mb-1">빠른 설정</h3>
                <p className="text-sm text-white/80">5분 만에 계정 생성 및 시스템 설정 완료</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg mb-1">안전한 보안</h3>
                <p className="text-sm text-white/80">기업 데이터 암호화 및 보안 인증</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg mb-1">24/7 지원</h3>
                <p className="text-sm text-white/80">연중무휴 고객 지원 및 기술 문의</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#F9FAFB] overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Button
              onClick={onBackToLogin}
              variant="ghost"
              size="sm"
              className="mb-4 text-[#6B7280] hover:text-[#2563EB]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              로그인으로 돌아가기
            </Button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-[#1F2937] text-3xl">회원가입</h2>
            </div>
            <p className="text-[#6B7280]">SmartFlow 계정을 만들어보세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-[#374151]">
                <User className="w-4 h-4" />
                이름
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                required
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
                placeholder="user@company.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2 text-[#374151]">
                  <Lock className="w-4 h-4" />
                  비밀번호
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-[#374151]">
                  <Lock className="w-4 h-4" />
                  비밀번호 확인
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2 text-[#374151]">
                <Building className="w-4 h-4" />
                회사명
              </Label>
              <Input
                id="company"
                type="text"
                placeholder="(주) 회사이름"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position" className="text-[#374151]">
                직책 (선택)
              </Label>
              <Select value={formData.position} onValueChange={(value: string) => handleChange('position', value)}>
                <SelectTrigger className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20">
                  <SelectValue placeholder="직책을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ceo">대표이사</SelectItem>
                  <SelectItem value="manager">관리자</SelectItem>
                  <SelectItem value="staff">담당자</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-[#374151]">
                <Phone className="w-4 h-4" />
                연락처 (선택)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="010-1234-5678"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="h-11 border-[#D1D5DB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
              />
            </div>

            <div className="flex items-start gap-2 text-sm">
              <input 
                type="checkbox" 
                id="terms" 
                className="w-4 h-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB] mt-0.5" 
                required
              />
              <label htmlFor="terms" className="text-[#6B7280]">
                <a href="#" className="text-[#2563EB] hover:underline">서비스 이용약관</a> 및{' '}
                <a href="#" className="text-[#2563EB] hover:underline">개인정보 처리방침</a>에 동의합니다
              </label>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1E40AF] text-white transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50"
            >
              {loading ? '처리 중...' : '회원가입'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[#6B7280]">
            이미 계정이 있으신가요?{' '}
            <button 
              onClick={onBackToLogin}
              className="text-[#2563EB] hover:underline"
            >
              로그인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}