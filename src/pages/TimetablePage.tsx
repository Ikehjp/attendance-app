import React, { useState, useEffect, useCallback } from 'react';
import { timetableApi, groupApi, subjectApi } from '../api';
import useAuthStore from '../stores/authStore';
import SubjectsManagement from '../components/SubjectsManagement';
import './TimetablePage.css';

interface Group {
  id: number;
  name: string;
  [key: string]: any;
}

interface TimetableSession {
  id: number;
  day_of_week: number;
  period: number;
  subject: string;
  subject_id?: number;
  start_time: string;
  end_time: string;
  room?: string;
  is_cancelled?: boolean;
  is_manually_modified?: boolean;
  [key: string]: any;
}

interface TimeSlot {
  periodNumber?: number;
  periodName: string;
  startTime: string;
  endTime: string;
  [key: string]: any;
}

interface OrganizationSettings {
  lateLimitMinutes: number;
  dateResetTime: string;
  schoolStartTime?: string;
  schoolEndTime?: string;
  timeSlots: TimeSlot[];
}

interface Subject {
  id: number;
  subject_name: string;
  subject_code?: string;
}

interface WeeklyPatternSession {
  periodNumber: number;
  subjectId: number;
  startTime: string;
  endTime: string;
  room?: string;
  teacherName?: string;
}

interface WeeklyPattern {
  [dayOfWeek: number]: WeeklyPatternSession[];
}

// ヘルパー関数: 指定した日付が含まれる週の月曜日を取得
const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(date.setDate(diff));
};

// ヘルパー関数: 日付をYYYY-MM-DD形式に変換
const formatDateYMD = (date: Date) => {
  return date.toISOString().split('T')[0];
};

interface Timetable {
  id: number;
  group_id: number;
  name?: string;
  academic_year: string;
  semester: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at?: string;
}

const TimetablePage: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const [activeTab, setActiveTab] = useState<'timetable' | 'list' | 'pattern' | 'settings' | 'subjects'>('timetable');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  const [displayMode, setDisplayMode] = useState<'week'>('week'); // 将来的に月表示などに対応するため
  const [timetables, setTimetables] = useState<TimetableSession[]>([]);
  const [timetableList, setTimetableList] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // 設定関連の State
  const [settings, setSettings] = useState<OrganizationSettings>({
    lateLimitMinutes: 15,
    dateResetTime: '04:00',
    timeSlots: [],
  });
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);

  // 週パターン展開関連の State
  const [weeklyPattern, setWeeklyPattern] = useState<WeeklyPattern>({
    1: [], 2: [], 3: [], 4: [], 5: [],
  });
  const [expandStartDate, setExpandStartDate] = useState<string>('');
  const [expandEndDate, setExpandEndDate] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<number | null>(null);

  // 一括休講関連の State
  const [showBulkCancelModal, setShowBulkCancelModal] = useState<boolean>(false);
  const [bulkCancelDate, setBulkCancelDate] = useState<string>('');
  const [bulkCancelReason, setBulkCancelReason] = useState<string>('');

  // 個別編集関連の State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<TimetableSession | null>(null);
  const [editFormData, setEditFormData] = useState({
    subjectId: 0,
    room: '',
    teacherName: '',
    notes: '',
  });

  // 時間割作成関連の State
  const [showCreateTimetableModal, setShowCreateTimetableModal] = useState<boolean>(false);
  const [createTimetableForm, setCreateTimetableForm] = useState({
    name: '',
    academicYear: new Date().getFullYear().toString(),
    semester: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  // 初回マウント時にグループと設定を取得（一度だけ）
  useEffect(() => {
    fetchGroups();
    if (isAdminOrOwner) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrOwner]);

  // タブ切り替え時にデータを取得
  useEffect(() => {
    if (activeTab === 'list' && selectedGroup) {
      fetchTimetableList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedGroup]);

  // 設定タブに切り替えた時 - 設定は初回に取得済みなので再取得不要
  // (ユーザーが手動でリロードしたい場合は「再読み込み」ボタンを追加)

  useEffect(() => {
    if (selectedGroup) {
      fetchTimetables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup, currentWeekStart]);

  const fetchTimetableList = async () => {
    if (!selectedGroup) return;
    try {
      setLoading(true);
      const response = await timetableApi.getTimetablesByGroup(selectedGroup);
      if (response.success) {
        setTimetableList(response.data as any[]);
      }
    } catch (err) {
      console.error(err);
      setError('時間割一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await groupApi.getGroups();
      if (response.success) {
        // response.data.groupsから配列を取得
        const groupsArray = (response.data as any)?.groups || [];
        setGroups(groupsArray);
        if (groupsArray.length > 0) {
          setSelectedGroup(groupsArray[0].id);
        }
      } else {
        setError('グループの取得に失敗しました');
      }
    } catch (err) {
      setError('グループの取得に失敗しました');
    }
  };

  const fetchTimetables = async () => {
    if (!selectedGroup) return;

    setLoading(true);
    try {
      // 今週の範囲を取得
      const startDate = new Date(currentWeekStart);
      const endDate = new Date(currentWeekStart);
      endDate.setDate(endDate.getDate() + 6); // 日曜日まで

      const response = await timetableApi.getTimetableByPeriod(
        selectedGroup,
        'week',
        formatDateYMD(startDate),
        formatDateYMD(endDate),
      );

      if (response.success) {
        const sessions = response.data as any[];

        // UI表示用にデータを整形
        const formattedSessions = sessions.map(session => {
          const date = new Date(session.class_date);
          const day = date.getDay(); // 0(Sun) - 6(Sat)
          return {
            ...session,
            // 日曜は7、月〜土はそのまま1〜6
            day_of_week: day === 0 ? 7 : day,
            subject: session.subject_name,
            period: session.period_number, // period_number を period にマッピング
          };
        });

        setTimetables(formattedSessions);
      }
    } catch (err) {
      setError('時間割の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const response = await timetableApi.getOrganizationSettings();
      if (response.success && response.data) {
        const data = response.data as any;
        setSettings({
          lateLimitMinutes: (data.lateLimitMinutes !== undefined && data.lateLimitMinutes !== null) ? data.lateLimitMinutes : 15,
          dateResetTime: data.dateResetTime?.substring(0, 5) || '04:00',
          timeSlots: data.timeSlots || [],
        });
      }
    } catch (err) {
      // Error handled silently
    } finally {
      setSettingsLoading(false);
    }
  }, [user?.role]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Excelファイル(.xlsx, .xls)を選択してください');
        return;
      }
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile || !selectedGroup) {
      setError('ファイルとグループを選択してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await timetableApi.importFromExcel(importFile, selectedGroup);
      if (response.success) {
        setSuccess(`${(response.data as any).imported}件の時間割をインポートしました`);
        setShowImportModal(false);
        setImportFile(null);
        fetchTimetables();
      } else {
        setError(response.message || 'インポートに失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'インポートに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 設定保存
  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    setError(null);
    try {
      const response = await timetableApi.saveOrganizationSettings({
        lateLimitMinutes: settings.lateLimitMinutes,
        dateResetTime: settings.dateResetTime + ':00',
        timeSlots: settings.timeSlots.map((slot, index) => ({
          periodNumber: index + 1,
          periodName: slot.periodName || `${index + 1}限`,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });
      if (response.success) {
        setSuccess('設定を保存しました');
      } else {
        setError(response.message || '設定の保存に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '設定の保存に失敗しました');
    } finally {
      setSettingsLoading(false);
    }
  };

  // 時限追加
  const addTimeSlot = () => {
    const lastSlot = settings.timeSlots[settings.timeSlots.length - 1];
    const newSlot = {
      periodName: `${settings.timeSlots.length + 1}限`,
      startTime: lastSlot ? lastSlot.endTime : '09:00',
      endTime: lastSlot ? addMinutes(lastSlot.endTime, 50) : '09:50',
    };
    setSettings({ ...settings, timeSlots: [...settings.timeSlots, newSlot] });
  };

  // 時限削除
  const removeTimeSlot = (index: number) => {
    const newSlots = settings.timeSlots.filter((_, i) => i !== index);
    setSettings({ ...settings, timeSlots: newSlots });
  };

  // 時限更新
  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string) => {
    const newSlots = [...settings.timeSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSettings({ ...settings, timeSlots: newSlots });
  };

  const addMinutes = (time: string, minutes: number) => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m + minutes);
    return date.toTimeString().slice(0, 5);
  };

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return time.substring(0, 5);
  };

  const getDayLabel = (day: number) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[day] || day;
  };

  // ========================================
  // 週パターン展開関連ハンドラー
  // ========================================

  // 科目一覧取得
  const fetchSubjects = useCallback(async () => {
    try {
      const response = await subjectApi.getSubjects();
      if (response.success) {
        setSubjects((response.data as any)?.subjects || response.data || []);
      }
    } catch (err) {
      console.error('科目取得エラー:', err);
    }
  }, []);

  // 週パターンタブに切り替え時（設定は初回に取得済みなので除外）
  useEffect(() => {
    if (activeTab === 'pattern' && isAdminOrOwner) {
      if (selectedGroup) fetchTimetableList();
      fetchSubjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdminOrOwner, selectedGroup, fetchSubjects]);

  // パターンにセッションを追加
  const addPatternSession = (dayOfWeek: number) => {
    const currentSessions = weeklyPattern[dayOfWeek] || [];

    // 既存のセッションから最大のperiodNumberを見つける
    const maxPeriod = currentSessions.length > 0
      ? Math.max(...currentSessions.map(s => s.periodNumber))
      : 0;

    // 次の時限を設定（最大+1、ただし8限以上の場合は1に戻る）
    let nextPeriod = maxPeriod + 1;
    if (nextPeriod > 8) nextPeriod = 1;

    // 時限に応じた時間を取得
    const targetSlot = settings.timeSlots[nextPeriod - 1] || settings.timeSlots[0];

    const newSession: WeeklyPatternSession = {
      periodNumber: nextPeriod,
      subjectId: subjects[0]?.id || 0,
      startTime: targetSlot?.startTime || '09:00',
      endTime: targetSlot?.endTime || '09:50',
      room: '',
      teacherName: '',
    };
    setWeeklyPattern({
      ...weeklyPattern,
      [dayOfWeek]: [...currentSessions, newSession],
    });
  };

  // パターンからセッションを削除
  const removePatternSession = (dayOfWeek: number, index: number) => {
    const newSessions = weeklyPattern[dayOfWeek].filter((_, i) => i !== index);
    setWeeklyPattern({
      ...weeklyPattern,
      [dayOfWeek]: newSessions,
    });
  };

  // パターンセッションを更新
  const updatePatternSession = (
    dayOfWeek: number,
    index: number,
    field: keyof WeeklyPatternSession,
    value: string | number,
  ) => {
    const newSessions = [...weeklyPattern[dayOfWeek]];
    newSessions[index] = { ...newSessions[index], [field]: value };
    setWeeklyPattern({
      ...weeklyPattern,
      [dayOfWeek]: newSessions,
    });
  };

  // 時限選択時に時刻を自動設定
  const handlePeriodChange = (dayOfWeek: number, index: number, periodNumber: number) => {
    const timeSlot = settings.timeSlots.find((_, i) => i + 1 === periodNumber);
    if (timeSlot) {
      const newSessions = [...weeklyPattern[dayOfWeek]];
      newSessions[index] = {
        ...newSessions[index],
        periodNumber,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
      };
      setWeeklyPattern({
        ...weeklyPattern,
        [dayOfWeek]: newSessions,
      });
    } else {
      updatePatternSession(dayOfWeek, index, 'periodNumber', periodNumber);
    }
  };

  // 週パターンを期間に展開
  const handleExpandPattern = async () => {
    if (!selectedTimetableId || !expandStartDate || !expandEndDate) {
      setError('時間割、開始日、終了日を選択してください');
      return;
    }

    // パターンが空かチェック
    const hasPattern = Object.values(weeklyPattern).some(sessions => sessions.length > 0);
    if (!hasPattern) {
      setError('週パターンを少なくとも1つ追加してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await timetableApi.expandWeeklyPattern(
        selectedTimetableId,
        weeklyPattern,
        expandStartDate,
        expandEndDate,
      );

      if (response.success) {
        const data = response.data as any;
        setSuccess(`${data.createdCount}件の授業セッションを作成しました（${data.skippedCount}件スキップ）`);
        fetchTimetables();
      } else {
        setError(response.message || '展開に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '展開に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 一括休講関連ハンドラー
  // ========================================

  const handleBulkCancel = async () => {
    if (!bulkCancelDate || !bulkCancelReason) {
      setError('日付と理由を入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await timetableApi.bulkCancelSessions(
        bulkCancelDate,
        bulkCancelReason,
        selectedGroup ? { groupId: selectedGroup } : {},
      );

      if (response.success) {
        const data = response.data as any;
        setSuccess(`${data.affectedCount}件の授業を休講にしました`);
        setShowBulkCancelModal(false);
        setBulkCancelDate('');
        setBulkCancelReason('');
        fetchTimetables();
      } else {
        setError(response.message || '一括休講に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '一括休講に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 個別編集関連ハンドラー
  // ========================================

  const openEditModal = (session: TimetableSession) => {
    setEditingSession(session);
    setEditFormData({
      subjectId: session.subject_id || 0,
      room: session.room || '',
      teacherName: session.teacher_name || '',
      notes: session.notes || '',
    });
    fetchSubjects();
    setShowEditModal(true);
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;

    setLoading(true);
    setError(null);

    try {
      const response = await timetableApi.updateClassSession(editingSession.id, {
        subjectId: editFormData.subjectId || undefined,
        room: editFormData.room,
        teacherName: editFormData.teacherName,
        notes: editFormData.notes,
      });

      if (response.success) {
        setSuccess('授業セッションを更新しました');
        setShowEditModal(false);
        setEditingSession(null);
        fetchTimetables();
      } else {
        setError(response.message || '更新に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 時間割作成ハンドラー
  // ========================================

  const handleCreateTimetable = async () => {
    if (!selectedGroup) {
      setError('グループを選択してください');
      return;
    }

    if (!createTimetableForm.academicYear || !createTimetableForm.semester) {
      setError('年度と学期を入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await timetableApi.createTimetable({
        groupId: selectedGroup,
        name: createTimetableForm.name,
        academicYear: createTimetableForm.academicYear,
        semester: createTimetableForm.semester,
        startDate: createTimetableForm.startDate || null,
        endDate: createTimetableForm.endDate || null,
        isActive: createTimetableForm.isActive,
      });

      if (response.success) {
        setSuccess('時間割を作成しました');
        setShowCreateTimetableModal(false);
        setCreateTimetableForm({
          name: '',
          academicYear: new Date().getFullYear().toString(),
          semester: '',
          startDate: '',
          endDate: '',
          isActive: true,
        });
        fetchTimetables();
      } else {
        setError(response.message || '時間割の作成に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '時間割の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="timetable-page">
      <div className="timetable-container">
        <div className="page-header">
          <h1>時間割管理</h1>
          <p className="page-subtitle">クラスの時間割と出欠設定を管理します</p>
        </div>

        {/* タブ切り替え */}
        {isAdminOrOwner && (
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'timetable' ? 'active' : ''}`}
              onClick={() => setActiveTab('timetable')}
            >
              📅 時間割
            </button>
            <button
              className={`tab ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              📑 時間割一覧
            </button>
            <button
              className={`tab ${activeTab === 'pattern' ? 'active' : ''}`}
              onClick={() => setActiveTab('pattern')}
            >
              📋 週パターン展開
            </button>
            <button
              className={`tab ${activeTab === 'subjects' ? 'active' : ''}`}
              onClick={() => setActiveTab('subjects')}
            >
              📚 科目管理
            </button>
            <button
              className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ 出欠設定
            </button>
          </div>
        )}

        {error && <div className="alert alert--error"><span>⚠️ {error}</span><button onClick={() => setError(null)}>×</button></div>}
        {success && <div className="alert alert--success"><span>✓ {success}</span><button onClick={() => setSuccess(null)}>×</button></div>}

        {/* 時間割一覧タブ */}
        {activeTab === 'list' && (
          <div className="timetable-list-container">
            <div className="group-selector" style={{ marginBottom: '20px' }}>
              <label htmlFor="groupSelectList">グループ:</label>
              <select id="groupSelectList" value={selectedGroup || ''} onChange={(e) => setSelectedGroup(Number(e.target.value))} className="form-select">
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="loading-state">読み込み中...</div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>ID</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>年度</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>学期</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>期間</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>状態</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>作成日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetableList.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                          データがありません
                        </td>
                      </tr>
                    ) : (
                      timetableList.map((timetable) => (
                        <tr key={timetable.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px' }}>{timetable.id}</td>
                          <td style={{ padding: '12px' }}>{timetable.academic_year}</td>
                          <td style={{ padding: '12px' }}>{timetable.semester}</td>
                          <td style={{ padding: '12px' }}>
                            {timetable.start_date ? formatDateYMD(new Date(timetable.start_date)) : ''}
                            {' 〜 '}
                            {timetable.end_date ? formatDateYMD(new Date(timetable.end_date)) : ''}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {timetable.is_active ? (
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '9999px',
                                fontSize: '12px',
                                fontWeight: 500,
                                backgroundColor: '#d1fae5',
                                color: '#065f46',
                              }}>
                                アクティブ
                              </span>
                            ) : (
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '9999px',
                                fontSize: '12px',
                                fontWeight: 500,
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                              }}>
                                非アクティブ
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {timetable.created_at ? new Date(timetable.created_at).toLocaleDateString() : ''}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 時間割タブ */}
        {activeTab === 'timetable' && (
          <>
            <div className="timetable-controls">
              <div className="group-selector">
                <label htmlFor="groupSelect">グループ:</label>
                <select id="groupSelect" value={selectedGroup || ''} onChange={(e) => setSelectedGroup(Number(e.target.value))} className="form-select">
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
              <div className="control-buttons">
                {isAdminOrOwner && (
                  <>
                    <button className="btn btn--success" onClick={() => setShowCreateTimetableModal(true)}>
                      ➕ 時間割作成
                    </button>
                    <button className="btn btn--warning" onClick={() => setShowBulkCancelModal(true)}>
                      🚫 一括休講
                    </button>
                    <button className="btn btn--primary" onClick={() => setShowImportModal(true)}>
                      📥 Excelインポート
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="calendar-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', margin: '20px 0' }}>
              <button className="btn btn--secondary" onClick={() => {
                const prev = new Date(currentWeekStart);
                prev.setDate(prev.getDate() - 7);
                setCurrentWeekStart(prev);
              }}>
                ← 前週
              </button>
              <div className="current-week-label">
                <input
                  type="date"
                  value={formatDateYMD(currentWeekStart)}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    if (!isNaN(date.getTime())) {
                      setCurrentWeekStart(getMonday(date));
                    }
                  }}
                  style={{ fontSize: '1.2rem', fontWeight: 'bold', padding: '4px' }}
                />
              </div>
              <button className="btn btn--secondary" onClick={() => {
                const next = new Date(currentWeekStart);
                next.setDate(next.getDate() + 7);
                setCurrentWeekStart(next);
              }}>
                次週 →
              </button>
              <button className="btn btn--secondary" onClick={() => setCurrentWeekStart(getMonday(new Date()))}>
                今週
              </button>
            </div>

            {loading ? (
              <div className="loading-state">読み込み中...</div>
            ) : timetables.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <p>時間割がありません</p>
                {user?.role === 'admin' && <p className="empty-hint">Excelファイルからインポートしてください</p>}
              </div>
            ) : (
              <div className="timetable-grid">
                <div className="timetable-header">
                  <div className="period-column">時限</div>
                  {[1, 2, 3, 4, 5].map(day => (
                    <div key={day} className="day-column">{getDayLabel(day)}</div>
                  ))}
                </div>
                {Array.from({ length: 8 }, (_, i) => i + 1).map(period => (
                  <div key={period} className="timetable-row">
                    <div className="period-cell">{period}限</div>
                    {[1, 2, 3, 4, 5].map(day => {
                      const session = timetables.find(t => t.day_of_week === day && t.period === period);
                      const isModified = session?.is_manually_modified;
                      const isCancelled = session?.is_cancelled;
                      return (
                        <div
                          key={`${day}-${period}`}
                          className={`session-cell ${session ? 'has-session' : ''} ${isModified ? 'modified' : ''} ${isCancelled ? 'cancelled' : ''}`}
                          onClick={() => session && isAdminOrOwner && openEditModal(session)}
                          style={{ cursor: session && isAdminOrOwner ? 'pointer' : 'default' }}
                        >
                          {session ? (
                            <>
                              <div className="session-subject">
                                {session.subject}
                                {isModified && <span className="modified-badge" title="手動変更済み">✎</span>}
                                {isCancelled && <span className="cancelled-badge" title="休講">休</span>}
                              </div>
                              <div className="session-time">{formatTime(session.start_time)} - {formatTime(session.end_time)}</div>
                              {session.room && <div className="session-room">{session.room}</div>}
                            </>
                          ) : (
                            <div className="empty-session">-</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 週パターン展開タブ */}
        {activeTab === 'pattern' && isAdminOrOwner && (
          <div className="pattern-panel">
            <div className="pattern-header">
              <h3>週パターン展開</h3>
              <p className="pattern-description">
                曜日ごとの授業パターンを定義し、指定期間に一括展開します。
              </p>
            </div>

            {/* 展開設定 */}
            <div className="expand-settings">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="timetableSelect">対象時間割</label>
                  <select
                    id="timetableSelect"
                    value={selectedTimetableId || ''}
                    onChange={(e) => setSelectedTimetableId(Number(e.target.value))}
                    className="form-select"
                  >
                    <option value="">時間割を選択...</option>
                    <option value="">時間割を選択...</option>
                    {timetableList.length === 0 ? (
                      <option disabled>時間割がありません</option>
                    ) : (
                      timetableList.map((t) => (
                        <option key={t.id} value={t.id}>
                          [ID: {t.id}] {t.name ? `${t.name} ` : ''}({t.academic_year} {t.semester || 'メイン'})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="expandStartDate">開始日</label>
                  <input
                    id="expandStartDate"
                    type="date"
                    value={expandStartDate}
                    onChange={(e) => setExpandStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="expandEndDate">終了日</label>
                  <input
                    id="expandEndDate"
                    type="date"
                    value={expandEndDate}
                    onChange={(e) => setExpandEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* 曜日別パターン定義 */}
            <div className="weekly-pattern-grid">
              {[1, 2, 3, 4, 5].map(day => (
                <div key={day} className="day-pattern">
                  <div className="day-header">
                    <span className="day-label">{getDayLabel(day)}曜日</span>
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => addPatternSession(day)}
                    >
                      ＋ 追加
                    </button>
                  </div>
                  <div className="pattern-sessions">
                    {(weeklyPattern[day] || []).length === 0 ? (
                      <div className="empty-pattern">授業なし</div>
                    ) : (
                      weeklyPattern[day].map((session, index) => (
                        <div key={index} className="pattern-session-item">
                          <select
                            value={session.periodNumber}
                            onChange={(e) => handlePeriodChange(day, index, Number(e.target.value))}
                            className="form-select period-select"
                          >
                            {settings.timeSlots.map((_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}限</option>
                            ))}
                            {settings.timeSlots.length === 0 && (
                              <>
                                <option value={1}>1限</option>
                                <option value={2}>2限</option>
                                <option value={3}>3限</option>
                                <option value={4}>4限</option>
                                <option value={5}>5限</option>
                                <option value={6}>6限</option>
                                <option value={7}>7限</option>
                                <option value={8}>8限</option>
                              </>
                            )}
                          </select>
                          <select
                            value={session.subjectId}
                            onChange={(e) => updatePatternSession(day, index, 'subjectId', Number(e.target.value))}
                            className="form-select subject-select"
                          >
                            <option value={0}>科目を選択...</option>
                            {subjects.map(subject => (
                              <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="教室"
                            value={session.room || ''}
                            onChange={(e) => updatePatternSession(day, index, 'room', e.target.value)}
                            className="form-input room-input"
                          />
                          <button
                            className="btn btn--danger btn--sm"
                            onClick={() => removePatternSession(day, index)}
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 展開ボタン */}
            <div className="pattern-actions">
              <button
                className="btn btn--primary btn--lg"
                onClick={handleExpandPattern}
                disabled={loading || !selectedTimetableId || !expandStartDate || !expandEndDate}
              >
                {loading ? '展開中...' : '📅 パターンを期間に展開'}
              </button>
            </div>
          </div>
        )}

        {/* 設定タブ */}
        {activeTab === 'settings' && isAdminOrOwner && (
          <div className="settings-panel">
            <div className="settings-section">
              <h3>出欠判定設定</h3>
              <div className="settings-grid">
                <div className="form-group">
                  <label htmlFor="schoolStartTime">学校開始時間（登校時間）</label>
                  <input
                    id="schoolStartTime"
                    type="time"
                    value={settings.schoolStartTime || '09:00'}
                    onChange={(e) => setSettings({ ...settings, schoolStartTime: e.target.value })}
                    className="form-input"
                  />
                  <small>この時間を基準に遅刻判定を行います</small>
                </div>

                <div className="form-group">
                  <label htmlFor="schoolEndTime">学校終了時間（下校時間）</label>
                  <input
                    id="schoolEndTime"
                    type="time"
                    value={settings.schoolEndTime || '16:00'}
                    onChange={(e) => setSettings({ ...settings, schoolEndTime: e.target.value })}
                    className="form-input"
                  />
                  <small>この時間までのスキャンを受け付けます</small>
                </div>

                <div className="form-group">
                  <label htmlFor="lateLimitMinutes">遅刻許容時間（分）</label>
                  <input
                    id="lateLimitMinutes"
                    type="number"
                    min="0"
                    max="60"
                    value={settings.lateLimitMinutes}
                    onChange={(e) => setSettings({ ...settings, lateLimitMinutes: Number(e.target.value) })}
                    className="form-input"
                  />
                  <small>学校開始時間から何分以内なら「出席」扱いにするか</small>
                </div>
                <div className="form-group">
                  <label htmlFor="dateResetTime">日付リセット時間</label>
                  <input
                    id="dateResetTime"
                    type="time"
                    value={settings.dateResetTime}
                    onChange={(e) => setSettings({ ...settings, dateResetTime: e.target.value })}
                    className="form-input"
                  />
                  <small>この時間より前は「前日の授業」として扱います</small>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="section-header">
                <h3>時限設定</h3>
                <button className="btn btn--secondary btn--sm" onClick={addTimeSlot}>
                  ＋ 時限追加
                </button>
              </div>
              {settings.timeSlots.length === 0 ? (
                <div className="empty-hint">時限が設定されていません。「時限追加」をクリックして追加してください。</div>
              ) : (
                <div className="time-slots-list">
                  {settings.timeSlots.map((slot, index) => (
                    <div key={index} className="time-slot-item">
                      <div className="slot-number">{index + 1}限</div>
                      <input
                        type="text"
                        value={slot.periodName || ''}
                        onChange={(e) => updateTimeSlot(index, 'periodName', e.target.value)}
                        placeholder="名称"
                        className="form-input slot-name"
                      />
                      <input
                        type="time"
                        value={slot.startTime || ''}
                        onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                        className="form-input slot-time"
                      />
                      <span>〜</span>
                      <input
                        type="time"
                        value={slot.endTime || ''}
                        onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                        className="form-input slot-time"
                      />
                      <button className="btn btn--danger btn--sm" onClick={() => removeTimeSlot(index)}>
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="settings-actions">
              <button
                className="btn btn--primary"
                onClick={handleSaveSettings}
                disabled={settingsLoading}
              >
                {settingsLoading ? '保存中...' : '設定を保存'}
              </button>
            </div>
          </div>
        )}

        {/* 科目管理タブ */}
        {activeTab === 'subjects' && isAdminOrOwner && (
          <SubjectsManagement />
        )}
      </div>

      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Excelインポート</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="import-instructions">
                <h3>インポート方法</h3>
                <ol>
                  <li>Excelファイルには以下の列が必要です：<br />
                    <code>day_of_week, period, subject, start_time, end_time, room</code>
                  </li>
                  <li>day_of_weekは1(月)〜5(金)の数値</li>
                  <li>periodは1〜6の数値</li>
                  <li>時刻は HH:MM 形式（例: 09:00）</li>
                </ol>
              </div>
              <div className="form-group">
                <label htmlFor="excelFile">Excelファイル</label>
                <input id="excelFile" type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="form-file" />
                {importFile && <div className="file-preview">📎 {importFile.name}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setShowImportModal(false)}>キャンセル</button>
              <button className="btn btn--primary" onClick={handleImport} disabled={!importFile || loading}>
                {loading ? 'インポート中...' : 'インポート'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一括休講モーダル */}
      {showBulkCancelModal && (
        <div className="modal-overlay" onClick={() => setShowBulkCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🚫 一括休講</h2>
              <button className="modal-close" onClick={() => setShowBulkCancelModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                指定した日付の全授業を休講にします。台風や学校行事など、一日全体が休みになる場合にご利用ください。
              </p>
              <div className="form-group">
                <label htmlFor="bulkCancelDate">休講日</label>
                <input
                  id="bulkCancelDate"
                  type="date"
                  value={bulkCancelDate}
                  onChange={(e) => setBulkCancelDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="bulkCancelReason">休講理由</label>
                <textarea
                  id="bulkCancelReason"
                  value={bulkCancelReason}
                  onChange={(e) => setBulkCancelReason(e.target.value)}
                  placeholder="例: 台風接近のため全休講"
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setShowBulkCancelModal(false)}>キャンセル</button>
              <button
                className="btn btn--warning"
                onClick={handleBulkCancel}
                disabled={!bulkCancelDate || !bulkCancelReason || loading}
              >
                {loading ? '処理中...' : '一括休講を実行'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 個別編集モーダル */}
      {showEditModal && editingSession && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ 授業編集</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-session-info">
                <p><strong>日付:</strong> {editingSession.class_date || '(日付なし)'}</p>
                <p><strong>時限:</strong> {editingSession.period}限</p>
                <p><strong>現在の科目:</strong> {editingSession.subject}</p>
              </div>

              <div className="form-group">
                <label htmlFor="editSubject">科目</label>
                <select
                  id="editSubject"
                  value={editFormData.subjectId}
                  onChange={(e) => setEditFormData({ ...editFormData, subjectId: Number(e.target.value) })}
                  className="form-select"
                >
                  <option value={0}>変更しない</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="editRoom">教室</label>
                <input
                  id="editRoom"
                  type="text"
                  value={editFormData.room}
                  onChange={(e) => setEditFormData({ ...editFormData, room: e.target.value })}
                  placeholder="例: A101"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="editTeacher">担当者</label>
                <input
                  id="editTeacher"
                  type="text"
                  value={editFormData.teacherName}
                  onChange={(e) => setEditFormData({ ...editFormData, teacherName: e.target.value })}
                  placeholder="担当者名"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="editNotes">備考</label>
                <textarea
                  id="editNotes"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="備考があれば入力"
                  className="form-textarea"
                  rows={3}
                />
              </div>

              {editingSession.is_manually_modified && (
                <div className="alert alert--info">
                  <span>✎ この授業は手動で変更されています</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setShowEditModal(false)}>キャンセル</button>
              <button
                className="btn btn--primary"
                onClick={handleUpdateSession}
                disabled={loading}
              >
                {loading ? '更新中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 時間割作成モーダル */}
      {showCreateTimetableModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTimetableModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ 新規時間割作成</h2>
              <button className="modal-close" onClick={() => setShowCreateTimetableModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                新しい時間割を作成します。作成後、週パターン展開タブで授業を設定できます。
              </p>

              <div className="form-group">
                <label htmlFor="createTimetableGroup">対象グループ</label>
                <select
                  id="createTimetableGroup"
                  value={selectedGroup || ''}
                  onChange={(e) => setSelectedGroup(Number(e.target.value))}
                  className="form-select"
                >
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="createTimetableName">時間割名（任意）</label>
                <input
                  id="createTimetableName"
                  type="text"
                  value={createTimetableForm.name}
                  onChange={(e) => setCreateTimetableForm({ ...createTimetableForm, name: e.target.value })}
                  placeholder="例: 2026年度1学期"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="createAcademicYear">年度 *</label>
                  <input
                    id="createAcademicYear"
                    type="text"
                    value={createTimetableForm.academicYear}
                    onChange={(e) => setCreateTimetableForm({ ...createTimetableForm, academicYear: e.target.value })}
                    placeholder="例: 2026"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="createSemester">学期 *</label>
                  <select
                    id="createSemester"
                    value={createTimetableForm.semester}
                    onChange={(e) => setCreateTimetableForm({ ...createTimetableForm, semester: e.target.value })}
                    className="form-select"
                  >
                    <option value="">選択してください</option>
                    <option value="前期">前期</option>
                    <option value="後期">後期</option>
                    <option value="通年">通年</option>
                    <option value="1学期">1学期</option>
                    <option value="2学期">2学期</option>
                    <option value="3学期">3学期</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="createStartDate">開始日（任意）</label>
                  <input
                    id="createStartDate"
                    type="date"
                    value={createTimetableForm.startDate}
                    onChange={(e) => setCreateTimetableForm({ ...createTimetableForm, startDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="createEndDate">終了日（任意）</label>
                  <input
                    id="createEndDate"
                    type="date"
                    value={createTimetableForm.endDate}
                    onChange={(e) => setCreateTimetableForm({ ...createTimetableForm, endDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={createTimetableForm.isActive}
                    onChange={(e) => setCreateTimetableForm({ ...createTimetableForm, isActive: e.target.checked })}
                  />
                  <span>アクティブにする（この時間割を有効にする）</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setShowCreateTimetableModal(false)}>キャンセル</button>
              <button
                className="btn btn--success"
                onClick={handleCreateTimetable}
                disabled={loading || !createTimetableForm.academicYear || !createTimetableForm.semester}
              >
                {loading ? '作成中...' : '時間割を作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetablePage;
