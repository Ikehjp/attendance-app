import React, { Component, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CalendarPage from './CalendarPage';
import useAuthStore from '../stores/authStore';
import { attendanceApi } from '../api/attendanceApi';

// Mock setup
jest.mock('../stores/authStore');
jest.mock('../api/attendanceApi', () => ({
    attendanceApi: {
        getAttendanceRecords: jest.fn(),
        getMonthlyReport: jest.fn(),
        getEvents: jest.fn(),
        getDailyStats: jest.fn(),
        exportAttendanceRecords: jest.fn(),
        getAbsenceDetails: jest.fn(),
    },
}));

// Typed Error Boundary
interface ErrorBoundaryProps {
    children: ReactNode;
}
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return <div data-testid="error-boundary">{this.state.error?.toString()}</div>;
        }
        return this.props.children;
    }
}

describe('CalendarPage', () => {
    const mockAttendanceApi = attendanceApi as jest.Mocked<typeof attendanceApi>;
    const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

    beforeEach(() => {
        mockUseAuthStore.mockReturnValue({
            user: { id: 1, name: 'Test User' },
            isAuthenticated: true,
        });

        // API mock default return
        mockAttendanceApi.getAttendanceRecords.mockResolvedValue({
            success: true,
            message: 'success',
            data: {
                records: [
                    {
                        id: 1,
                        date: '2025-11-01',
                        status: 'present',
                        check_in_time: '09:00:00',
                        check_out_time: '18:00:00',
                    },
                ],
            },
        });
        mockAttendanceApi.getMonthlyReport.mockResolvedValue({
            success: true,
            message: 'success',
            data: {
                records: [],
            },
        });
        mockAttendanceApi.getEvents.mockResolvedValue({
            success: true,
            message: 'success',
            data: {
                events: [],
            },
        });
        mockAttendanceApi.getDailyStats.mockResolvedValue({
            success: true,
            message: 'success',
            data: {},
        });
    });

    test('renders calendar page', async () => {
        render(
            <ErrorBoundary>
                <CalendarPage />
            </ErrorBoundary>,
        );

        if (screen.queryByTestId('error-boundary')) {
            console.log('Error caught:', screen.getByTestId('error-boundary')?.textContent);
        }

        // Wait for loading to complete and check header "出欠カレンダー" using regex
        await waitFor(() => {
            expect(screen.getByText(/出欠カレンダー/)).toBeInTheDocument();
        });
    });

    test('renders in dashboard mode', async () => {
        render(
            <ErrorBoundary>
                <CalendarPage isDashboardMode={true} />
            </ErrorBoundary>,
        );

        if (screen.queryByTestId('error-boundary')) {
            console.log('Error caught:', screen.getByTestId('error-boundary')?.textContent);
        }

        const today = new Date();
        // Wait for loading to complete
        await waitFor(() => {
            expect(screen.getByText(new RegExp(today.getFullYear().toString()))).toBeInTheDocument();
        });
    });
});
