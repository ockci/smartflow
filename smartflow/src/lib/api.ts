/**
 * SmartFlow API 클라이언트
 * 백엔드 FastAPI와 통신하는 모든 함수를 정의
 */
// 🟢 수정된 코드 - Authorization 헤더 자동 주입
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ⭐ 요청 인터셉터: 모든 요청에 토큰 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ⭐ 응답 인터셉터: 401 에러 시 로그인 페이지로 리다이렉트
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// 토큰 자동 추가 인터셉터 (중요!)
// ============================================================================

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (401 에러 시 로그아웃 처리)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 또는 인증 실패
      localStorage.removeItem('accessToken');
      // 로그인 페이지로 이동하거나 상태 업데이트
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// 타입 정의 (백엔드 응답 형식에 맞춤)
// ============================================================================

export interface BackendEquipment {
  id: number;
  machine_id: string;
  machine_name: string | null;
  tonnage: number;
  capacity_per_hour: number;
  shift_start: string;
  shift_end: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export interface BackendOrder {
  id: number;
  order_number: string;
  product_code: string;
  product_name: string | null;
  quantity: number;
  due_date: string; // ISO date
  priority: number;
  status: string;
  is_urgent: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface BackendSchedule {
  order_number: string;
  product_code: string;
  machine_id: string;
  start_time: string; // ISO datetime
  end_time: string;
  duration_minutes: number;
  is_on_time: boolean;
  due_date: string;
  quantity: number;
}

export interface ScheduleResult {
  schedule_id: string;
  schedules: BackendSchedule[];
  metrics: {
    on_time_rate: number;
    utilization: number;
    total_orders: number;
    on_time_orders: number;
  };
  generated_at: string;
}

export interface ForecastResult {
  product_code: string;
  predictions: number[];
  dates: string[];
  confidence_lower?: number[];
  confidence_upper?: number[];
  accuracy?: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  company_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// ============================================================================
// 인증 API (추가!)
// ============================================================================

export const authAPI = {
  /**
   * 회원가입
   */
  signup: async (data: {
    email: string;
    username: string;
    password: string;
    company_name?: string;
  }) => {
    const response = await apiClient.post<User>('/api/auth/signup', data);
    return response.data;
  },

  /**
   * 로그인
   * OAuth2 형식 (form-urlencoded)
   */
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email);  // 이메일을 username으로
    formData.append('password', password);

    const response = await apiClient.post<LoginResponse>('/api/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // 토큰 저장
    localStorage.setItem('accessToken', response.data.access_token);
    
    return response.data;
  },

  /**
   * 현재 사용자 정보 조회
   */
  getCurrentUser: async () => {
    const response = await apiClient.get<User>('/api/auth/me');
    return response.data;
  },

  /**
   * 로그아웃 (토큰 삭제)
   */
  logout: () => {
    localStorage.removeItem('accessToken');
  },
};

// ============================================================================
// 설비 관리 API
// ============================================================================

export const equipmentAPI = {
  /**
   * 설비 목록 조회
   */
  list: async () => {
    const response = await apiClient.get<BackendEquipment[]>('/api/equipment/list');
    return response.data;
  },

  /**
   * 설비 추가
   */
  create: async (data: {
    machine_id: string;
    machine_name?: string;
    tonnage: number;
    capacity_per_hour: number;
    shift_start: string;
    shift_end: string;
  }) => {
    const response = await apiClient.post<BackendEquipment>('/api/equipment/create', data);
    return response.data;
  },

  /**
   * 엑셀 업로드
   */
  uploadExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/equipment/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * 템플릿 다운로드
   */
  downloadTemplate: () => {
    return `${apiClient.defaults.baseURL}/api/equipment/download/template`;
  },

   /**
   * 설비 삭제
   */
  // api.ts
  delete: async (equipmentId: number) => {
    const response = await apiClient.delete(`/api/equipment/${equipmentId}`);
    return response.data;
  },
};

// ============================================================================
// 주문 관리 API
// ============================================================================

export const orderAPI = {
  /**
   * 주문 목록 조회
   */
  list: async () => {
    const response = await apiClient.get<BackendOrder[]>('/api/orders/list');
    return response.data;
  },

  /**
   * 주문 추가
   */
  create: async (data: {
    order_number: string;
    product_code: string;
    product_name?: string;
    quantity: number;
    due_date: string;
    priority?: number;
    is_urgent?: boolean;
  }) => {
    const response = await apiClient.post<BackendOrder>('/api/orders/create', data);
    return response.data;
  },

  /**
   * 긴급 주문 추가
   */
  urgent: async (data: {
    order_number: string;
    product_code: string;
    quantity: number;
    due_date: string;
  }) => {
    const response = await apiClient.post('/api/orders/urgent', {
      ...data,
      is_urgent: true,
      priority: 1,
    });
    return response.data;
  },


  
  
  /**
   * 엑셀 업로드
   */
  uploadExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/orders/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * 템플릿 다운로드
   */
  downloadTemplate: () => {
    return `${apiClient.defaults.baseURL}/api/orders/download/template`;
  },

  /**
   * 주문 삭제
   */
  delete: async (id: number) => {
    const response = await apiClient.delete(`/api/orders/delete/${id}`);
    return response.data;
  },

  /**
   * 주문 상태 업데이트
   */
  updateStatus: async (orderId: number, status: string) => {
    const response = await apiClient.put(`/api/orders/update-status/${orderId}?status=${status}`);
    return response.data;
  },

  /**
   * 여러 주문 일괄 완료 처리
   */
  completeBatch: async (orderIds: number[]) => {
    const response = await apiClient.post('/api/orders/complete-batch', { order_ids: orderIds });
    return response.data;
  },

  /**
   * 생산 시작
   */
  startProduction: async (orderId: number) => {
    const response = await apiClient.post(`/api/orders/start-production/${orderId}`);
    return response.data;
  },

  /**
   * 재고 확인
   */
  checkInventory: async (productCode: string, quantity: number) => {
    const response = await apiClient.post('/api/orders/check-inventory', {
      product_code: productCode,
      quantity: quantity
    });
    return response.data;
  },
};




// ============================================================================
// 스케줄링 API
// ============================================================================

// ============================================================================
// 스케줄링 API
// ============================================================================

export const scheduleAPI = {
  /**
   * 스케줄 생성 (핵심!)
   */
  generate: async () => {
    const response = await apiClient.post('/api/schedule/generate');
    return response.data;  // { success, data: { schedule, metrics } }
  },

  /**
   * 스케줄 결과 조회
   */
  getResult: async () => {
  const response = await apiClient.get('/api/schedule/list');  // ← /list로 변경
  return response.data;
  },

  /**
   * 간트차트 데이터 조회
   */
  getGantt: async () => {
    const response = await apiClient.get('/api/schedule/gantt');
    return response.data;
  },

  /**
   * 스케줄 엑셀 다운로드
   */
  downloadExcel: () => {
    return `${apiClient.defaults.baseURL}/api/schedule/download`;
  },
};

// ============================================================================
// AI 예측 API
// ============================================================================

export const forecastAPI = {
  /**
   * 수요 예측 실행
   */
  predict: async (data: {
    product_code: string;
    start_date: string;
    days: number;
  }) => {
    // localStorage에서 사용자 정보 가져오기
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
  
    const response = await apiClient.post<ForecastResult>('/api/forecast/predict', {
      ...data,
      company_name: user?.company_name  // ← 회사명 추가
    });
    return response.data;
  },

  /**
   * 제품별 예측 결과 조회
   */
  getResult: async (productCode: string) => {
    const response = await apiClient.get<ForecastResult>(`/api/forecast/result/${productCode}`);
    return response.data;
  },

  /**
   * 전체 제품 일괄 예측
   */
  batch: async () => {
    const response = await apiClient.post('/api/forecast/batch');
    return response.data;
  },
};

// ============================================================================
// 재고 최적화 API
// ============================================================================

export const inventoryAPI = {
  /**
   * 재고 정책 계산
   */
  calculate: async (productCode: string) => {
    const response = await apiClient.post('/api/inventory/calculate', {
      product_code: productCode,
    });
    return response.data;
  },

  /**
   * 제품별 재고 상태 조회
   */
  getStatus: async (productCode: string) => {
    const response = await apiClient.get(`/api/inventory/status/${productCode}`);
    return response.data;
  },

  /**
   * 재고 알림 목록
   */
  getAlerts: async () => {
    const response = await apiClient.get('/api/inventory/alerts');
    return response.data;
  },

  // ⭐ 여기부터 추가!
  /**
   * 재고 목록 조회
   */
  list: async () => {
    const response = await apiClient.get('/api/inventory/list');
    return response.data;
  },

  /**
   * 재고 등록
   */
  create: async (data: any) => {
    const response = await apiClient.post('/api/inventory/create', data);
    return response.data;
  },

  /**
   * 재고 수정
   */
  update: async (productCode: string, data: any) => {
    const response = await apiClient.put(`/api/inventory/update/${productCode}`, data);
    return response.data;
  },

  /**
   * 재고 삭제
   */
  delete: async (productCode: string) => {
    const response = await apiClient.delete(`/api/inventory/delete/${productCode}`);
    return response.data;
  },

  /**
   * 재고 상세 조회
   */
  detail: async (productCode: string) => {
    const response = await apiClient.get(`/api/inventory/${productCode}`);
    return response.data;
  },
};

// ============================================================================
// 대시보드 API
// ============================================================================

export const dashboardAPI = {
  /**
   * 전체 요약 (KPI)
   */
  getSummary: async () => {
    const response = await apiClient.get('/api/dashboard/summary');
    return response.data;
  },

  /**
   * 오늘 생산 현황
   */
  getProduction: async () => {
    const response = await apiClient.get('/api/dashboard/production');
    return response.data;
  },

  /**
   * 긴급 알림
   */
  getAlerts: async () => {
    const response = await apiClient.get('/api/dashboard/alerts');
    return response.data;
  },
};

// ============================================================================
// 헬퍼 함수 (데이터 변환)
// ============================================================================

/**
 * 백엔드 Equipment를 프론트엔드 형식으로 변환
 */
export const convertEquipment = (backend: BackendEquipment) => {
  console.log('🔧 변환 중:', backend);  // 디버깅
  return {
    id: backend.machine_id,
    dbId: backend.id,
    name: backend.machine_name || backend.machine_id,
    tonnage: backend.tonnage,
    operatingHours: `${backend.shift_start}-${backend.shift_end}`,
    capacity: backend.capacity_per_hour,
    status: backend.status,
  };
};

/**
 * 백엔드 Order를 프론트엔드 형식으로 변환
 */
export const convertOrder = (backend: BackendOrder) => ({
  id: backend.id.toString(),
  orderNumber: backend.order_number,
  productCode: backend.product_code,
  productName: backend.product_name,
  quantity: backend.quantity,
  dueDate: backend.due_date,
  priority: backend.priority,
  status: backend.status,
  isUrgent: backend.is_urgent,
});

/**
 * 백엔드 Schedule을 프론트엔드 형식으로 변환 (간트차트용)
 */
export const convertScheduleForGantt = (backend: BackendSchedule, index: number) => {
  const startDate = new Date(backend.start_time);

  
  // 시작 시간을 시간 단위로 변환 (예: 8시 = 8, 16시 = 16)
  const startHours = startDate.getHours() + (startDate.getMinutes() / 60);
  const durationHours = backend.duration_minutes / 60;
  
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  
  return {
    id: `task-${index}`,
    machine: backend.machine_id,
    orderNumber: backend.order_number,
    productCode: backend.product_code,
    start: Math.round(startHours),
    end: Math.round(startHours + durationHours),
    duration: Math.round(durationHours),
    color: colors[index % colors.length],
    isOnTime: backend.is_on_time,
  };
};


// ============================================================================
// 발주 관리 API
// ============================================================================

export const purchaseOrderAPI = {
  /**
   * 발주 목록 조회
   */
  list: async () => {
    const response = await apiClient.get('/api/purchase-orders/list');
    return response.data;
  },

  /**
   * 발주 등록
   */
  create: async (data: {
    purchase_number: string;
    product_code: string;
    product_name: string;
    quantity: number;
    supplier?: string | null;
    unit_price?: number | null;
    order_date: string;
    expected_date?: string | null;
    priority?: number;
    is_ai_recommended?: boolean;
    notes?: string | null;
  }) => {
    const response = await apiClient.post('/api/purchase-orders/create', data);
    return response.data;
  },

  /**
   * 발주 상태 업데이트
   */
  updateStatus: async (purchaseId: number, status: string) => {
    const response = await apiClient.put(`/api/purchase-orders/update-status/${purchaseId}?status=${status}`);
    return response.data;
  },

  /**
   * 발주 삭제
   */
  delete: async (purchaseId: number) => {
    const response = await apiClient.delete(`/api/purchase-orders/delete/${purchaseId}`);
    return response.data;
  },

  /**
   * AI 추천 발주 목록
   */
  getAIRecommendations: async () => {
    const response = await apiClient.get('/api/purchase-orders/ai-recommendations');
    return response.data;
  },

  /**
   * 엑셀 업로드
   */
  uploadExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/purchase-orders/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * 템플릿 다운로드
   */
  downloadTemplate: () => {
    return `${apiClient.defaults.baseURL}/api/purchase-orders/download/template`;
  },
};


export default apiClient;