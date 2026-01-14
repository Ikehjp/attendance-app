import { apiClient, ApiResponse } from './client';

// サーバーヘルスチェック
export const checkServerHealth = async(): Promise<any> => {
  try {
    const response = await apiClient.get('/auth/health');
    return response;
  } catch (error) {
    return error; // インターセプターが処理したエラーオブジェクト
  }
};

// attendanceApi オブジェクト
export const attendanceApi = {
  // --- 認証 ---
  login: async(email: string, password: string): Promise<ApiResponse> => {
    return (await apiClient.post('/auth/login', { email, password })) as unknown as ApiResponse;
  },

  register: async(userData: any): Promise<ApiResponse> => {
    return (await apiClient.post('/auth/register', userData)) as unknown as ApiResponse;
  },

  logout: async(): Promise<ApiResponse> => {
    return (await apiClient.post('/auth/logout')) as unknown as ApiResponse;
  },

  // パスワードリセット
  forgotPassword: async(email: string): Promise<ApiResponse> => {
    return (await apiClient.post('/auth/forgot-password', { email })) as unknown as ApiResponse;
  },
  resetPassword: async(token: string, newPassword: string): Promise<ApiResponse> => {
    return (await apiClient.post('/auth/reset-password', { token, newPassword })) as unknown as ApiResponse;
  },

  getAuthUser: async(): Promise<ApiResponse> => {
    return (await apiClient.get('/auth/me')) as unknown as ApiResponse;
  },

  getUserProfile: async(): Promise<ApiResponse> => {
    return (await apiClient.get('/auth/me')) as unknown as ApiResponse;
  },

  // ユーザー役割管理
  getUsersByRole: async(role: string): Promise<ApiResponse> => {
    return (await apiClient.get(`/users/role/${role}`)) as unknown as ApiResponse;
  },

  // エクスポート機能
  exportAttendanceRecords: async(startDate: string, endDate: string, userId: number | string | null = null): Promise<any> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (userId) params.append('userId', userId.toString());

    const response = await apiClient.get(`/export/attendance?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportAllAttendanceRecords: async(startDate: string, endDate: string): Promise<any> => {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await apiClient.get(`/export/attendance/all?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportEventParticipants: async(eventId: number | string): Promise<any> => {
    const response = await apiClient.get(`/export/event/${eventId}/participants`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getUserById: async(userId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/users/${userId}`)) as unknown as ApiResponse;
  },

  updateUserProfile: async(userId: number | string, data: any): Promise<ApiResponse> => {
    return (await apiClient.put(`/users/${userId}`, data)) as unknown as ApiResponse;
  },

  // --- 出欠 (教員/管理者用) ---
  recordAttendance: async(userId: number | string, action: string, recordId: number | string | null = null): Promise<ApiResponse> => {
    const date = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    return (await apiClient.post('/attendance', {
      userId,
      date: date,
      type: action, // 'checkin' または 'checkout'
      timestamp: timestamp,
      recordId: recordId,
    })) as unknown as ApiResponse;
  },

  getAttendanceRecords: async(userId: number | string, filters: any): Promise<ApiResponse> => {
    return (await apiClient.get('/attendance', {
      params: { userId, ...filters },
    })) as unknown as ApiResponse;
  },

  getAttendanceStats: async(userId: number | string, period: string): Promise<ApiResponse> => {
    return (await apiClient.get('/attendance/stats', {
      params: { userId, period },
    })) as unknown as ApiResponse;
  },

  getMonthlyReport: async(userId: number | string, year: number | string, month: number | string): Promise<ApiResponse> => {
    return (await apiClient.get('/attendance/report', {
      params: { userId, year, month },
    })) as unknown as ApiResponse;
  },

  // --- 学生管理 (管理者用) ---
  getStudents: async(searchTerm?: string): Promise<ApiResponse> => {
    return (await apiClient.get('/students', {
      params: { search: searchTerm },
    })) as unknown as ApiResponse;
  },
  createStudent: async(studentData: any): Promise<ApiResponse> => {
    return (await apiClient.post('/students', studentData)) as unknown as ApiResponse;
  },
  updateStudent: async(studentId: number | string, studentData: any): Promise<ApiResponse> => {
    return (await apiClient.put(`/students/${studentId}`, studentData)) as unknown as ApiResponse;
  },
  deleteStudent: async(studentId: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/students/${studentId}`)) as unknown as ApiResponse;
  },

  // --- 学生出欠 (教員用) ---
  getStudentAttendance: async(filters: any): Promise<ApiResponse> => {
    return (await apiClient.get('/student-attendance', {
      params: filters,
    })) as unknown as ApiResponse;
  },
  recordStudentAttendance: async(studentId: number | string, timestamp: string): Promise<ApiResponse> => {
    return (await apiClient.post('/student-attendance', { studentId, timestamp })) as unknown as ApiResponse;
  },
  deleteStudentAttendance: async(recordId: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/student-attendance/${recordId}`)) as unknown as ApiResponse;
  },

  recordQRAttendance: async(studentId: number | string, timestamp: string): Promise<ApiResponse> => {
    return (await apiClient.post('/student-attendance/qr', { studentId, timestamp })) as unknown as ApiResponse;
  },

  // --- 学生ダッシュボード (学生用) ---
  getStudentGroups: async(studentId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/students/${studentId}/groups`)) as unknown as ApiResponse;
  },
  respondToInvitation: async(studentId: number | string, groupId: number | string, action: string): Promise<ApiResponse> => {
    return (await apiClient.post(`/students/${studentId}/groups/${groupId}/respond`, { action })) as unknown as ApiResponse;
  },
  scanQRCode: async(studentId: number | string, qrData: string): Promise<ApiResponse> => {
    return (await apiClient.post('/qr/scan', { studentId, qrData })) as unknown as ApiResponse;
  },
  // recordScanはscanQRCodeへのエイリアス（StudentDashboardPageで使用）
  recordScan: async(qrData: string, timestamp: string): Promise<ApiResponse> => {
    return (await apiClient.post('/qr/scan', { qr_data: qrData, timestamp })) as unknown as ApiResponse;
  },
  confirmScan: async(studentId: number | string, classId: number | string, scanToken: string): Promise<ApiResponse> => {
    return (await apiClient.post('/qr/scan/confirm', { studentId, classId, scanToken })) as unknown as ApiResponse;
  },

  confirmClassAttendance: async(classId: number | string, timestamp: string): Promise<ApiResponse> => {
    return (await apiClient.post('/attendance/confirm', { classId, timestamp })) as unknown as ApiResponse;
  },

  // --- グループ管理 (教員用) ---
  getGroups: async(): Promise<ApiResponse> => {
    return (await apiClient.get('/groups')) as unknown as ApiResponse;
  },
  createGroup: async(groupData: any): Promise<ApiResponse> => {
    return (await apiClient.post('/groups', groupData)) as unknown as ApiResponse;
  },
  deleteGroup: async(groupId: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/groups/${groupId}`)) as unknown as ApiResponse;
  },

  // --- イベント管理 ---
  getEvents: async(filters: any): Promise<ApiResponse> => {
    return (await apiClient.get('/events', { params: filters })) as unknown as ApiResponse;
  },
  getEvent: async(eventId: number | string): Promise<ApiResponse> => {
    return (await apiClient.get(`/events/${eventId}`)) as unknown as ApiResponse;
  },
  createEvent: async(eventData: any): Promise<ApiResponse> => {
    return (await apiClient.post('/events', eventData)) as unknown as ApiResponse;
  },
  updateEvent: async(eventId: number | string, eventData: any): Promise<ApiResponse> => {
    return (await apiClient.put(`/events/${eventId}`, eventData)) as unknown as ApiResponse;
  },
  deleteEvent: async(eventId: number | string): Promise<ApiResponse> => {
    return (await apiClient.delete(`/events/${eventId}`)) as unknown as ApiResponse;
  },
  respondToEvent: async(eventId: number | string, status: string): Promise<ApiResponse> => {
    return (await apiClient.post(`/events/${eventId}/respond`, { status })) as unknown as ApiResponse;
  },

  // --- [新規] ロール変更用 ---
  getRoleUpdateStatus: async(): Promise<ApiResponse> => {
    return (await apiClient.get('/users/me/role-status')) as unknown as ApiResponse;
  },
  updateRole: async(newRole: string, password: string): Promise<ApiResponse> => {
    return (await apiClient.post('/users/me/role', { newRole, password })) as unknown as ApiResponse;
  },

  // --- カレンダー統計 ---
  getDailyStats: async(year: number | string, month: number | string): Promise<ApiResponse> => {
    return (await apiClient.get('/attendance/daily-stats', {
      params: { year, month },
    })) as unknown as ApiResponse;
  },

  getAbsenceDetails: async(date: string): Promise<ApiResponse> => {
    return (await apiClient.get(`/attendance/absence-details/${date}`)) as unknown as ApiResponse;
  },

  // --- 欠席申請 ---
  submitAbsenceRequest: async(requestData: any): Promise<ApiResponse> => {
    const formData = new FormData();
    Object.keys(requestData).forEach(key => {
      if (requestData[key] !== null && requestData[key] !== undefined) {
        formData.append(key, requestData[key]);
      }
    });
    return (await apiClient.post('/absence-requests', formData)) as unknown as ApiResponse;
  },
};