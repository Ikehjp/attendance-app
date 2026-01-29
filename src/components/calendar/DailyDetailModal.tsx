import React from 'react';
import { formatDate, formatTime } from '../../utils/dateUtils';
import './DailyDetailModal.css';

interface DailyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    attendanceRecord: any;
    events: any[];
    requests: any[];
    timetables: any[];
}

const DailyDetailModal: React.FC<DailyDetailModalProps> = ({
    isOpen,
    onClose,
    date,
    attendanceRecord,
    events,
    requests,
    timetables,
}) => {
    if (!isOpen || !date) return null;

    const dateStr = formatDate(date, 'YYYY年MM月DD日 (WEEKDAY)');

    const getStatusText = (status: string) => {
        switch (status) {
            case 'present': return '出席';
            case 'absent': return '欠席';
            case 'late': return '遅刻';
            case 'early_departure': return '早退';
            default: return status;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'present': return 'status-present';
            case 'absent': return 'status-absent';
            case 'late': return 'status-late';
            case 'early_departure': return 'status-early_departure';
            default: return '';
        }
    };

    const renderRequestStatus = (status: string) => {
        switch (status) {
            case 'pending': return <span className="req-badge req-pending">申請中</span>;
            case 'approved': return <span className="req-badge req-approved">承認済</span>;
            case 'rejected': return <span className="req-badge req-rejected">却下</span>;
            default: return null;
        }
    };

    return (
        <div className="daily-detail-modal-overlay" onClick={onClose}>
            <div className="daily-detail-modal-content" onClick={e => e.stopPropagation()}>
                <div className="daily-detail-header">
                    <h2>{dateStr}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="daily-detail-body">
                    {/* 出欠情報 */}
                    <section className="detail-section">
                        <h3>出欠状況</h3>
                        {attendanceRecord ? (
                            <div className={`attendance-status-card ${getStatusClass(attendanceRecord.status)}`}>
                                <div className="status-badge-large">
                                    {getStatusText(attendanceRecord.status)}
                                </div>
                                <div className="time-info">
                                    <div className="time-row">
                                        <span className="label">出勤:</span>
                                        <span className="value">{formatTime(attendanceRecord.check_in_time) || '--:--'}</span>
                                    </div>
                                    <div className="time-row">
                                        <span className="label">退勤:</span>
                                        <span className="value">{formatTime(attendanceRecord.check_out_time) || '--:--'}</span>
                                    </div>
                                </div>
                                {attendanceRecord.reason && (
                                    <div className="reason-info">
                                        <p className="label">理由・備考:</p>
                                        <p className="value">{attendanceRecord.reason}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="no-data">記録なし</p>
                        )}
                    </section>

                    {/* 申請情報 */}
                    {requests.length > 0 && (
                        <section className="detail-section">
                            <h3>申請状況</h3>
                            <div className="requests-list">
                                {requests.map((req, idx) => (
                                    <div key={idx} className="request-card">
                                        <div className="request-header">
                                            <span className="request-type">{req.request_type === 'absence' ? '欠席' : req.request_type}</span>
                                            {renderRequestStatus(req.status)}
                                        </div>
                                        <p className="request-reason">{req.reason}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* イベント情報 */}
                    {events.length > 0 && (
                        <section className="detail-section">
                            <h3>イベント</h3>
                            <ul className="events-list">
                                {events.map((evt, idx) => (
                                    <li key={idx} className="event-item-large">
                                        {evt.title}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* 授業情報 */}
                    {timetables.length > 0 && (
                        <section className="detail-section">
                            <h3>授業予定</h3>
                            <div className="timetables-list">
                                {timetables.map((cls, idx) => (
                                    <div key={idx} className={`class-item ${cls.is_cancelled ? 'cancelled' : ''}`}>
                                        <div className="class-time">
                                            {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                                        </div>
                                        <div className="class-info">
                                            <div className="subject-name">{cls.subject_name}</div>
                                            {cls.room && <div className="room-name">教室: {cls.room}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DailyDetailModal;
