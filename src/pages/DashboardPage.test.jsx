import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './DashboardPage';
import useAuthStore from '../stores/authStore';

// Mock setup
jest.mock('../stores/authStore');
jest.mock('../components/AdminDashboardView', () => () => <div data-testid="admin-dashboard">Admin Dashboard</div>);
jest.mock('../components/TeacherDashboardView', () => () => <div data-testid="teacher-dashboard">Teacher Dashboard</div>);
// EmployeeDashboard is defined within DashboardPage, so the API needs to be mocked
jest.mock('../api/attendanceApi', () => ({
  attendanceApi: {
    getAttendanceRecords: jest.fn().mockResolvedValue({ success: true, data: { records: [] } }),
    getAttendanceStats: jest.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));
jest.mock('./CalendarPage', () => () => <div data-testid="calendar-page">Calendar Page</div>);

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.mockClear();
  });

  test('renders AdminDashboardView for admin user', () => {
    useAuthStore.mockReturnValue({
      user: { id: 1, name: 'Admin User', role: 'admin' },
    });

    render(<DashboardPage />);
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
  });

  test('renders TeacherDashboardView for teacher user', () => {
    useAuthStore.mockReturnValue({
      user: { id: 2, name: 'Teacher User', role: 'teacher' },
    });

    render(<DashboardPage />);
    expect(screen.getByTestId('teacher-dashboard')).toBeInTheDocument();
  });

  test('renders EmployeeDashboard for student/employee user', async() => {
    useAuthStore.mockReturnValue({
      user: { id: 3, name: 'Student User', role: 'student' },
    });

    render(<DashboardPage />);

    // Check if EmployeeDashboard loading state is shown
    // This confirms that EmployeeDashboard component is mounted
    // "ダッシュボードを読み込んでいます..." -> "Loading dashboard..." (approx check via regex)
    expect(screen.getByText(/ダッシュボードを読み込んでいます/)).toBeInTheDocument();
  });

  test('renders loading state when not logged in', () => {
    useAuthStore.mockReturnValue({
      user: null,
    });

    render(<DashboardPage />);
    // "ユーザー情報を読み込んでいます..."
    expect(screen.getByText(/ユーザー情報を読み込んでいます/)).toBeInTheDocument();
  });
});
