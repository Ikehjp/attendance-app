import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useAuthStore from '../stores/authStore';
import { attendanceApi } from '../api/attendanceApi';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import './EventManagementPage.css';

interface EventParticipant {
  id: number;
  user_name: string;
  status: string;
}

interface Event {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  is_public: boolean;
  participant_count?: number;
  creator_name?: string;
  created_by?: number;
  participation_status?: string;
  participants?: EventParticipant[];
  [key: string]: any;
}

interface EventFormData {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  is_public: boolean;
  participant_ids: number[];
}

const EventManagementPage: React.FC = React.memo(() => {
  const { user, isAuthenticated } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
  });

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    is_public: false,
    participant_ids: [],
  });

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await attendanceApi.getEvents({
        startDate: dateFilter.startDate ? new Date(dateFilter.startDate).toISOString() : undefined,
        endDate: dateFilter.endDate ? new Date(dateFilter.endDate).toISOString() : undefined,
      });

      if (response.success) {
        const eventsData = (response.data as any).events;
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      } else {
        setError(response.message || 'イベントの読み込みに失敗しました');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'イベントの読み込みに失敗しました';
      setError(errorMessage);

      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('EventManagementPage: イベント読み込みエラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadEvents();
    }
  }, [isAuthenticated, loadEvents]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const { name, type } = target;
    const value = target.value;
    const checked = (target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      setError(null);

      const eventPayload = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      };

      let response;
      if (editingEvent) {
        response = await attendanceApi.updateEvent(editingEvent.id, eventPayload);
      } else {
        response = await attendanceApi.createEvent(eventPayload);
      }

      if (response.success) {
        setShowForm(false);
        setEditingEvent(null);
        setFormData({
          title: '',
          description: '',
          start_date: '',
          end_date: '',
          location: '',
          is_public: false,
          participant_ids: [],
        });
        await loadEvents();
      } else {
        setError(response.message || '操作に失敗しました');
      }
    } catch (err: any) {
      const errorMessage = err.message || '操作に失敗しました';
      setError(errorMessage);

      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('EventManagementPage: イベント操作エラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData, editingEvent, loadEvents]);

  const handleEdit = useCallback((event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
      end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
      location: event.location || '',
      is_public: event.is_public || false,
      participant_ids: [],
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (eventId: number) => {
    if (!window.confirm('このイベントを削除しますか？')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await attendanceApi.deleteEvent(eventId);

      if (response.success) {
        await loadEvents();
      } else {
        setError(response.message || '削除に失敗しました');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'イベントの削除に失敗しました';
      setError(errorMessage);

      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('EventManagementPage: イベント削除エラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadEvents]);

  const handleParticipate = useCallback(async (eventId: number, status: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await attendanceApi.respondToEvent(eventId, status);

      if (response.success) {
        await loadEvents();
      } else {
        setError(response.message || '参加ステータスの更新に失敗しました');
      }
    } catch (err: any) {
      const errorMessage = err.message || '参加ステータスの更新に失敗しました';
      setError(errorMessage);

      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('EventManagementPage: 参加ステータス更新エラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadEvents]);

  const handleViewEvent = useCallback(async (eventId: number) => {
    try {
      const response = await attendanceApi.getEvent(eventId);
      if (response.success) {
        setSelectedEvent((response.data as any).event);
      } else {
        setError(response.message || 'イベントの取得に失敗しました');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'イベントの取得に失敗しました';
      setError(errorMessage);

      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('EventManagementPage: イベント取得エラー:', err);
      }
    }
  }, []);

  const formatDateTime = useCallback((dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
      const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

      if (startDate && eventDate < startDate) return false;
      if (endDate && eventDate > endDate) return false;
      return true;
    });
  }, [events, dateFilter]);

  if (!isAuthenticated) {
    return (
      <div className="event-management-page">
        <div className="access-denied">
          <h2>アクセス拒否</h2>
          <p>このページにアクセスするにはログインが必要です。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-management-page">
      <div className="event-container">
        <div className="event-header">
          <h1>イベント管理</h1>
          <Button
            variant="primary"
            onClick={() => {
              setEditingEvent(null);
              setFormData({
                title: '',
                description: '',
                start_date: '',
                end_date: '',
                location: '',
                is_public: false,
                participant_ids: [],
              });
              setShowForm(true);
            }}
            disabled={isLoading}
          >
            新規イベント作成
          </Button>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button className="retry-button" onClick={loadEvents}>
              再試行
            </button>
          </div>
        )}

        {/* 日付フィルター */}
        <div className="date-filter">
          <Input
            label="開始日"
            type="date"
            value={dateFilter.startDate}
            onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
          />
          <Input
            label="終了日"
            type="date"
            value={dateFilter.endDate}
            onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
          />
          <Button variant="secondary" onClick={loadEvents} disabled={isLoading}>
            フィルター適用
          </Button>
        </div>

        {/* イベント作成・編集フォーム */}
        {showForm && (
          <div className="event-form-overlay">
            <div className="event-form">
              <h2>{editingEvent ? 'イベント編集' : '新規イベント作成'}</h2>
              <form onSubmit={handleSubmit}>
                <Input
                  label="タイトル *"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
                <div className="form-group">
                  <label htmlFor="eventDescription" className="form-label">説明</label>
                  <textarea
                    id="eventDescription"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="form-textarea"
                  />
                </div>
                <Input
                  label="開始日時 *"
                  type="datetime-local"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="終了日時"
                  type="datetime-local"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                />
                <Input
                  label="場所"
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                />
                <div className="form-group">
                  <label className="form-checkbox-label">
                    <input
                      type="checkbox"
                      name="is_public"
                      checked={formData.is_public}
                      onChange={handleInputChange}
                    />
                    公開イベント
                  </label>
                </div>
                <div className="form-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowForm(false);
                      setEditingEvent(null);
                    }}
                    disabled={isLoading}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading}
                  >
                    {editingEvent ? '更新' : '作成'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* イベント一覧 */}
        {isLoading && events.length === 0 ? (
          <div className="loading">
            <div className="spinner" />
            <p>イベントを読み込み中...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="no-events">
            <p>イベントが見つかりません</p>
          </div>
        ) : (
          <div className="event-list">
            {filteredEvents.map((event) => (
              <div key={event.id} className="event-card">
                <div className="event-info">
                  <h3>{event.title}</h3>
                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}
                  <div className="event-details">
                    <div className="event-detail-item">
                      <span className="detail-label">開始:</span>
                      <span className="detail-value">{formatDateTime(event.start_date)}</span>
                    </div>
                    {event.end_date && (
                      <div className="event-detail-item">
                        <span className="detail-label">終了:</span>
                        <span className="detail-value">{formatDateTime(event.end_date)}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="event-detail-item">
                        <span className="detail-label">場所:</span>
                        <span className="detail-value">{event.location}</span>
                      </div>
                    )}
                    <div className="event-detail-item">
                      <span className="detail-label">作成者:</span>
                      <span className="detail-value">{event.creator_name || '不明'}</span>
                    </div>
                    <div className="event-detail-item">
                      <span className="detail-label">参加者:</span>
                      <span className="detail-value">{event.participant_count || 0}人</span>
                    </div>
                    <div className="event-detail-item">
                      <span className={`badge ${event.is_public ? 'badge-public' : 'badge-private'}`}>
                        {event.is_public ? '公開' : '非公開'}
                      </span>
                    </div>
                  </div>
                  {event.participation_status && (
                    <div className="participation-status">
                      ステータス: {event.participation_status === 'accepted' ? '参加予定' :
                        event.participation_status === 'pending' ? '保留中' : '辞退'}
                    </div>
                  )}
                </div>
                <div className="event-actions">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleViewEvent(event.id)}
                    disabled={isLoading}
                  >
                    詳細
                  </Button>
                  {event.created_by === user?.id && (
                    <>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => handleEdit(event)}
                        disabled={isLoading}
                      >
                        編集
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleDelete(event.id)}
                        disabled={isLoading}
                      >
                        削除
                      </Button>
                    </>
                  )}
                  {event.created_by !== user?.id && (
                    <>
                      {event.participation_status !== 'accepted' && (
                        <Button
                          variant="success"
                          size="small"
                          onClick={() => handleParticipate(event.id, 'accepted')}
                          disabled={isLoading}
                        >
                          参加
                        </Button>
                      )}
                      {event.participation_status === 'accepted' && (
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleParticipate(event.id, 'declined')}
                          disabled={isLoading}
                        >
                          辞退
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* イベント詳細モーダル */}
        {selectedEvent && (
          <div className="event-detail-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="event-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="event-detail-header">
                <h2>{selectedEvent.title}</h2>
                <button className="close-button" onClick={() => setSelectedEvent(null)}>×</button>
              </div>
              <div className="event-detail-content">
                {selectedEvent.description && (
                  <div className="detail-section">
                    <h3>説明</h3>
                    <p>{selectedEvent.description}</p>
                  </div>
                )}
                <div className="detail-section">
                  <h3>日時</h3>
                  <p>開始: {formatDateTime(selectedEvent.start_date)}</p>
                  {selectedEvent.end_date && (
                    <p>終了: {formatDateTime(selectedEvent.end_date)}</p>
                  )}
                </div>
                {selectedEvent.location && (
                  <div className="detail-section">
                    <h3>場所</h3>
                    <p>{selectedEvent.location}</p>
                  </div>
                )}
                {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                  <div className="detail-section">
                    <h3>参加者 ({selectedEvent.participants.length}人)</h3>
                    <ul className="participant-list">
                      {selectedEvent.participants.map((participant) => (
                        <li key={participant.id}>
                          {participant.user_name} ({participant.status === 'accepted' ? '参加予定' :
                            participant.status === 'pending' ? '保留中' : '辞退'})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

EventManagementPage.displayName = 'EventManagementPage';

export default EventManagementPage;
