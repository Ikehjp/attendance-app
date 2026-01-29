import React, { useState, useEffect, useCallback } from 'react'; // useMemo removed as it's not used directly anymore
import useAuthStore from '../stores/authStore';
import { attendanceApi } from '../api/attendanceApi';
import { absenceRequestApi } from '../api/absenceRequestApi';
import { timetableApi } from '../api/timetableApi';
import { formatDate } from '../utils/dateUtils';
import ExportButton from '../components/common/ExportButton';
import AbsenceRequestModal from '../components/calendar/AbsenceRequestModal';
import AbsenceListModal from '../components/calendar/AbsenceListModal';
import MonthlyView from '../components/calendar/MonthlyView';
import DailyDetailModal from '../components/calendar/DailyDetailModal';
import WeeklyView from '../components/calendar/WeeklyView';
import YearlyView from '../components/calendar/YearlyView';
import './CalendarPage.css';

interface CalendarPageProps {
  isDashboardMode?: boolean;
}

type ViewMode = 'month' | 'week' | 'year';

const CalendarPage: React.FC<CalendarPageProps> = React.memo(({ isDashboardMode = false }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(isDashboardMode ? 'week' : 'month');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, any>>({});
  const [events, setEvents] = useState<Record<string, any[]>>({});
  const [dailyStats, setDailyStats] = useState<Record<string, any>>({});
  const [absenceRequests, setAbsenceRequests] = useState<Record<string, any[]>>({});
  const [timetables, setTimetables] = useState<Record<string, any[]>>({});
  const [timeSlots, setTimeSlots] = useState<any[]>([]); // 追加: 時限設定
  const [groups, setGroups] = useState<any[]>([]); // 追加: グループリスト（管理者用）
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null); // 追加: 選択されたグループID
  const [displayGroupId, setDisplayGroupId] = useState<number | null>(null); // 実際に表示に使用するID

  /* モーダル表示用ステート (学生モバイル用詳細) */
  const [showDailyDetail, setShowDailyDetail] = useState(false);
  const [selectedDailyData, setSelectedDailyData] = useState<{
    record: any;
    events: any[];
    requests: any[];
    timetables: any[];
  }>({
    record: null,
    events: [],
    requests: [],
    timetables: [],
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // モーダル用 state
  const [showAbsenceRequest, setShowAbsenceRequest] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAbsenceList, setShowAbsenceList] = useState<boolean>(false);
  const [absenceData, setAbsenceData] = useState<any>(null);

  // グループと設定の取得（初回のみ）
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // 設定の取得
        const settingsRes = await timetableApi.getOrganizationSettings();
        console.log('[Calendar] Settings response:', settingsRes);
        if (settingsRes.success && settingsRes.data) {
          const slots = (settingsRes.data as any).timeSlots || [];
          console.log('[Calendar] Loaded timeSlots:', slots);
          setTimeSlots(slots);
        }

        // 管理者・教員の場合、グループリストを取得
        if (['owner', 'admin', 'teacher'].includes(user?.role || '')) {
          console.log('[Calendar] Fetching groups for role:', user?.role);
          const groupRes = await attendanceApi.getGroups();
          console.log('[Calendar] Groups response:', groupRes);
          if (groupRes.success) {
            const groupsList = (groupRes.data as any).groups || [];
            console.log('[Calendar] Groups list:', groupsList);
            setGroups(groupsList);
            if (groupsList.length > 0) {
              setSelectedGroupId(groupsList[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };

    if (isAuthenticated) {
      fetchInitialData();
    }
  }, [isAuthenticated, user?.role]);

  // 選択されたグループIDまたは学生の所属グループIDを決定
  useEffect(() => {
    if (user?.role === 'student' && user?.student_id) {
      // 学生の場合、所属グループを取得して設定
      const fetchStudentGroup = async () => {
        try {
          console.log('[Calendar] Fetching student groups for:', user.student_id);
          const res = await attendanceApi.getStudentGroups(user.student_id);
          console.log('[Calendar] Student groups response:', res);
          // レスポンス形式: { success: true, data: { groups: [...], total: N } }
          const groupsList = (res.data as any)?.groups || [];
          console.log('[Calendar] Groups list:', groupsList);
          if (res.success && groupsList.length > 0) {
            setDisplayGroupId(groupsList[0].id);
            console.log('[Calendar] Set displayGroupId to:', groupsList[0].id);
          }
        } catch (e) {
          console.error('[Calendar] Error fetching student groups:', e);
        }
      };
      fetchStudentGroup();
    } else if (selectedGroupId) {
      // 管理者等が選択した場合
      setDisplayGroupId(selectedGroupId);
    }
  }, [user, selectedGroupId]);

  const loadCalendarData = useCallback(async () => {
    try {
      if (!isAuthenticated || !user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const userId = user.id;

      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const [attendanceResponse, eventResponse, statsResponse] = await Promise.all([
        attendanceApi.getMonthlyReport(userId, year, month),
        attendanceApi.getEvents({
          start_date: startDate,
          end_date: endDate,
        }),
        attendanceApi.getDailyStats(year, month),
      ]);

      // 1. 出欠記録の処理
      if (attendanceResponse && attendanceResponse.success) {
        const records = (attendanceResponse.data && Array.isArray((attendanceResponse.data as any).records))
          ? (attendanceResponse.data as any).records
          : [];
        const recordsMap: Record<string, any> = {};
        records.forEach((record: any) => {
          const recordDate = record.date || record.attendance_date;
          if (recordDate) {
            recordsMap[recordDate.split('T')[0]] = record;
          }
        });
        setAttendanceRecords(recordsMap);
      } else {
        throw new Error(attendanceResponse?.message || 'カレンダーデータの取得に失敗しました');
      }

      // 2. イベントの処理
      if (eventResponse && eventResponse.success) {
        const eventList = (eventResponse.data && Array.isArray((eventResponse.data as any).events))
          ? (eventResponse.data as any).events
          : [];
        const eventsMap: Record<string, any[]> = {};
        eventList.forEach((event: any) => {
          let eventDate = event.start_date;
          if (eventDate) {
            eventDate = eventDate.split('T')[0].split(' ')[0];
          }
          if (eventDate && !eventsMap[eventDate]) {
            eventsMap[eventDate] = [];
          }
          if (eventDate) {
            eventsMap[eventDate].push(event);
          }
        });
        setEvents(eventsMap);
      } else {
        throw new Error(eventResponse?.message || 'イベントデータの取得に失敗しました');
      }

      // 3. 日次統計の処理
      if (statsResponse && statsResponse.success) {
        setDailyStats(statsResponse.data as any || {});
      } else {
        setDailyStats({});
      }

      // 4. 学生の欠席申請を取得
      if (user?.role === 'student' && user?.student_id) {
        try {
          const absenceResponse = await absenceRequestApi.getRequestsByStudent(user.student_id, {
            startDate,
            endDate,
          });
          if (absenceResponse && absenceResponse.success) {
            const requestsMap: Record<string, any[]> = {};
            const requests = Array.isArray(absenceResponse.data) ? absenceResponse.data : [];
            requests.forEach((req: any) => {
              let reqDate = req.request_date;
              if (reqDate) {
                if (reqDate.includes('T')) {
                  reqDate = reqDate.split('T')[0];
                } else if (reqDate.includes(' ')) {
                  reqDate = reqDate.split(' ')[0];
                }
                if (reqDate.length === 10) {
                  if (!requestsMap[reqDate]) {
                    requestsMap[reqDate] = [];
                  }
                  requestsMap[reqDate].push(req);
                }
              }
            });
            setAbsenceRequests(requestsMap);
          }
        } catch (absErr) {
          console.warn('[Calendar] 欠席申請取得エラー:', absErr);
        }
      }

      // 5. 時間割の取得
      console.log('[Calendar] displayGroupId for timetable:', displayGroupId);
      if (displayGroupId) {
        try {
          console.log('[Calendar] Fetching timetable for period:', { displayGroupId, startDate, endDate });
          const timetableResponse = await timetableApi.getTimetableByPeriod(
            displayGroupId,
            'month',
            startDate,
            endDate,
          );
          console.log('[Calendar] Timetable response:', timetableResponse);

          if (timetableResponse.success && Array.isArray(timetableResponse.data)) {
            const timetablesMap: Record<string, any[]> = {};
            timetableResponse.data.forEach((session: any) => {
              const sessionDate = formatDate(new Date(session.class_date), 'YYYY-MM-DD');
              if (!timetablesMap[sessionDate]) {
                timetablesMap[sessionDate] = [];
              }
              timetablesMap[sessionDate].push(session);
            });
            console.log('[Calendar] Timetables map:', timetablesMap);
            setTimetables(timetablesMap);
          } else {
            console.warn('[Calendar] Timetable response failed or no data');
          }
        } catch (ttErr) {
          console.warn('[Calendar] 時間割取得エラー:', ttErr);
        }
      } else {
        console.log('[Calendar] No displayGroupId, skipping timetable fetch');
        setTimetables({});
      }

    } catch (err: any) {
      setError('カレンダーデータの読み込みに失敗しました: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, isAuthenticated, user, displayGroupId]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadCalendarData();
    }
  }, [isAuthenticated, user?.id, loadCalendarData]);

  const handleNavigate = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        newDate.setMonth(prev.getMonth() + offset);
      } else if (viewMode === 'week') {
        newDate.setDate(prev.getDate() + (offset * 7));
      } else if (viewMode === 'year') {
        newDate.setFullYear(prev.getFullYear() + offset);
      }
      return newDate;
    });
  };

  const handleExport = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    return await attendanceApi.exportAttendanceRecords(startDate, endDate);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, date?: Date) => {
    if (date && user?.role === 'student') {
      e.preventDefault();
      if (!user?.student_id) {
        setError('学生IDが登録されていません。管理者に連絡してください。');
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date.getTime() >= today.getTime()) {
        setSelectedDate(date);
        setShowAbsenceRequest(true);
      } else {
        alert('過去の日付には欠席申請できません。今日以降の日付を選択してください。');
      }
    }
  }, [user]);

  const handleDateClick = useCallback(async (date: Date) => {
    const canViewAbsenceList = ['owner', 'admin', 'teacher', 'employee'].includes(user?.role || '');
    if (canViewAbsenceList) {
      try {
        const dateStr = formatDate(date, 'YYYY-MM-DD');
        const response = await attendanceApi.getAbsenceDetails(dateStr);
        if (response.success) {
          setAbsenceData(response.data);
          setSelectedDate(date);
          setShowAbsenceList(true);
        }
      } catch (err) {
        // Error handled silently
      }
    } else {
      // 学生用: 日次詳細モーダルを表示
      const dateStr = formatDate(date, 'YYYY-MM-DD');
      const record = attendanceRecords[dateStr];
      const dayEvents = events[dateStr] || [];
      const dayRequests = absenceRequests[dateStr] || [];
      const dayClasses = timetables[dateStr] || [];

      setSelectedDailyData({
        record,
        events: dayEvents,
        requests: dayRequests,
        timetables: dayClasses,
      });
      setSelectedDate(date);
      setShowDailyDetail(true);
    }
  }, [user, attendanceRecords, events, absenceRequests, timetables]);

  const handleAbsenceSubmit = async (formData: any) => {
    try {
      const response = await attendanceApi.submitAbsenceRequest(formData);
      if (!response.success) {
        throw new Error(response.message || '申請の送信に失敗しました');
      }
      loadCalendarData();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '申請の送信に失敗しました';
      throw new Error(errorMessage);
    }
  };

  const renderHeader = () => {
    let title = '';
    if (viewMode === 'month') {
      title = formatDate(currentDate, 'YYYY年 MM月');
    } else if (viewMode === 'week') {
      // 週の範囲を表示
      const d = new Date(currentDate);
      const day = d.getDay();
      const diff = d.getDate() - day; // 日曜日
      const weekStart = new Date(d.setDate(diff));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startStr = formatDate(weekStart, 'YYYY年MM月DD日');
      const endStr = formatDate(weekEnd, 'MM月DD日');
      title = `${startStr} - ${endStr}`;
    } else if (viewMode === 'year') {
      title = formatDate(currentDate, 'YYYY年');
    }

    return (
      <div className="calendar-navigation">
        <div className="nav-controls">
          <button onClick={() => handleNavigate(-1)} className="nav-button">
            &lt; 前
          </button>
          <button onClick={() => handleNavigate(1)} className="nav-button">
            次 &gt;
          </button>
        </div>

        <span className="current-period">{title}</span>

        {/* 管理者・教員用グループ選択 */}
        {groups.length > 0 && ['admin', 'owner', 'teacher'].includes(user?.role || '') && (
          <div style={{ marginLeft: '16px' }}>
            <select
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(Number(e.target.value))}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="view-controls">
          <button
            className={`view-button ${viewMode === 'year' ? 'active' : ''}`}
            onClick={() => setViewMode('year')}
          >
            年
          </button>
          <button
            className={`view-button ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            月
          </button>
          <button
            className={`view-button ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            週
          </button>
        </div>

        {!isDashboardMode && viewMode !== 'year' && (
          <ExportButton
            onExport={handleExport}
            filename={`attendance_${currentDate.getFullYear()}_${String(currentDate.getMonth() + 1).padStart(2, '0')}.csv`}
            label="エクスポート"
            size="small"
          />
        )}
      </div>
    );
  };

  if (isLoading && !attendanceRecords) { // データが全くない場合のみローディング表示
    return (
      <div className="calendar-page">
        <div className="calendar-loading">
          <div className="spinner" />
          <p>カレンダーを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error && !isDashboardMode && Object.keys(attendanceRecords).length === 0) {
    return (
      <div className="calendar-page">
        <div className="calendar-container">
          <div className="error-message">
            {error}
            <button onClick={loadCalendarData} className="retry-button">
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`calendar-page ${isDashboardMode ? 'dashboard-mode' : ''}`}>
      <div className="calendar-container">
        {!isDashboardMode && (
          <div className="calendar-header-top">
            <h1 className="calendar-title">出欠カレンダー</h1>
          </div>
        )}

        {renderHeader()}

        {viewMode === 'month' && (
          <>
            <MonthlyView
              currentDate={currentDate}
              attendanceRecords={attendanceRecords}
              events={events}
              dailyStats={dailyStats}
              absenceRequests={absenceRequests}
              userRole={user?.role}
              onDateClick={handleDateClick}
              onContextMenu={handleContextMenu}
            />

            <div className="calendar-legend">
              <div className="legend-item">
                <div className="legend-color legend-color--present" />
                <span>出勤</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color--absent" />
                <span>欠勤</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color--late" />
                <span>遅刻</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color--early-departure" />
                <span>早退</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color--today" />
                <span>今日</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color--event" />
                <span>イベント</span>
              </div>
            </div>
          </>
        )}

        {viewMode === 'week' && (
          <WeeklyView
            currentDate={currentDate}
            attendanceRecords={attendanceRecords}
            events={events}
            absenceRequests={absenceRequests}
            timetables={timetables}
            timeSlots={timeSlots}
            onDateClick={handleDateClick}
            onContextMenu={handleContextMenu}
            userRole={user?.role}
          />
        )}

        {viewMode === 'year' && (
          <YearlyView
            currentDate={currentDate}
            attendanceRecords={attendanceRecords} // 注意: 現在は現在の月のみデータがある
            onMonthClick={(date) => {
              setCurrentDate(date);
              setViewMode('month');
            }}
          />
        )}

        {/* 欠席申請モーダル (学生用) */}
        <AbsenceRequestModal
          isOpen={showAbsenceRequest}
          onClose={() => setShowAbsenceRequest(false)}
          defaultDate={selectedDate}
          onSubmit={handleAbsenceSubmit}
        />

        {/* 欠席者リストモーダル (教員用) */}
        <AbsenceListModal
          isOpen={showAbsenceList}
          onClose={() => setShowAbsenceList(false)}
          date={selectedDate}
          absenceData={absenceData}
        />

        {/* 日次詳細モーダル (モバイル学生用) */}
        <DailyDetailModal
          isOpen={showDailyDetail}
          onClose={() => setShowDailyDetail(false)}
          date={selectedDate}
          attendanceRecord={selectedDailyData.record}
          events={selectedDailyData.events}
          requests={selectedDailyData.requests}
          timetables={selectedDailyData.timetables}
        />
      </div>
    </div >
  );
});

CalendarPage.displayName = 'CalendarPage';

export default CalendarPage;
