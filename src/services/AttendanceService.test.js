import { attendanceApi } from '../api/attendanceApi';

// Mock the API client
jest.mock('../api/attendanceApi', () => ({
  attendanceApi: {
    getAttendanceRecords: jest.fn(),
    recordAttendance: jest.fn(),
  },
}));

describe('AttendanceService (Frontend API Wrapper)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getAttendanceRecords calls API with correct parameters', async() => {
    const mockData = { success: true, data: { records: [] } };
    attendanceApi.getAttendanceRecords.mockResolvedValue(mockData);

    const userId = 'user123';
    const filters = { date: '2023-10-27' };

    await attendanceApi.getAttendanceRecords(userId, filters);

    expect(attendanceApi.getAttendanceRecords).toHaveBeenCalledWith(userId, filters);
  });

  test('recordAttendance calls API with correct parameters', async() => {
    const mockResponse = { success: true, message: 'Checked in' };
    attendanceApi.recordAttendance.mockResolvedValue(mockResponse);

    const userId = 'user123';
    const action = 'checkin';

    await attendanceApi.recordAttendance(userId, action);

    expect(attendanceApi.recordAttendance).toHaveBeenCalledWith(userId, action);
  });
});
