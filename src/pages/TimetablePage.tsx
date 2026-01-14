import React, { useState, useEffect, useCallback } from 'react';
import { timetableApi, groupApi } from '../api';
import useAuthStore from '../stores/authStore';
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
  start_time: string;
  end_time: string;
  room?: string;
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
  timeSlots: TimeSlot[];
}

const TimetablePage: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const [activeTab, setActiveTab] = useState<'timetable' | 'settings'>('timetable');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [timetables, setTimetables] = useState<TimetableSession[]>([]);
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

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    fetchGroups();
    if (isAdminOrOwner) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 設定タブに切り替えた時にも設定を再取得
  useEffect(() => {
    if (activeTab === 'settings' && isAdminOrOwner) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (selectedGroup) {
      fetchTimetables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

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
      }
    } catch (err) {
      setError('グループの取得に失敗しました');
    }
  };

  const fetchTimetables = async () => {
    setLoading(true);
    try {
      const response = await timetableApi.getTimetablesByGroup(selectedGroup);
      if (response.success) {
        setTimetables(response.data as unknown as TimetableSession[]);
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
          lateLimitMinutes: data.lateLimitMinutes || 15,
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
              className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ 出欠設定
            </button>
          </div>
        )}

        {error && <div className="alert alert--error"><span>⚠️ {error}</span><button onClick={() => setError(null)}>×</button></div>}
        {success && <div className="alert alert--success"><span>✓ {success}</span><button onClick={() => setSuccess(null)}>×</button></div>}

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
              {user?.role === 'admin' && (
                <button className="btn btn--primary" onClick={() => setShowImportModal(true)}>
                  📥 Excelインポート
                </button>
              )}
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
                {Array.from({ length: 6 }, (_, i) => i + 1).map(period => (
                  <div key={period} className="timetable-row">
                    <div className="period-cell">{period}限</div>
                    {[1, 2, 3, 4, 5].map(day => {
                      const session = timetables.find(t => t.day_of_week === day && t.period === period);
                      return (
                        <div key={`${day}-${period}`} className={`session-cell ${session ? 'has-session' : ''}`}>
                          {session ? (
                            <>
                              <div className="session-subject">{session.subject}</div>
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

        {/* 設定タブ */}
        {activeTab === 'settings' && isAdminOrOwner && (
          <div className="settings-panel">
            <div className="settings-section">
              <h3>出欠判定設定</h3>
              <div className="settings-grid">
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
                  <small>授業開始時間から何分以内なら「出席」扱いにするか</small>
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
    </div>
  );
};

export default TimetablePage;
