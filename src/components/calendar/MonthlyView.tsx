import React, { useMemo } from 'react';
import { formatDate, getMonthDays, isToday, formatTime as formatTimeUtil } from '../../utils/dateUtils';
import './MonthlyView.css';

interface MonthlyViewProps {
    currentDate: Date;
    attendanceRecords: Record<string, any>;
    events: Record<string, any[]>;
    dailyStats: Record<string, any>;
    absenceRequests: Record<string, any[]>;
    userRole?: string;
    onDateClick: (date: Date) => void;
    onContextMenu: (e: React.MouseEvent, date: Date) => void;
}

const MonthlyView: React.FC<MonthlyViewProps> = ({
    currentDate,
    attendanceRecords,
    events,
    dailyStats,
    absenceRequests,
    userRole,
    onDateClick,
    onContextMenu,
}) => {
    const calendarDays = useMemo(() => {
        return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
    }, [currentDate]);

    const calendarWeeks = useMemo(() => {
        const weeks = [];
        for (let i = 0; i < calendarDays.length; i += 7) {
            weeks.push(calendarDays.slice(i, i + 7));
        }
        return weeks;
    }, [calendarDays]);

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return '---';
        return formatTimeUtil(timeStr);
    };

    return (
        <div className="calendar-grid">
            <div className="calendar-weekdays">
                {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                    <div key={day} className="weekday-header">
                        {day}
                    </div>
                ))}
            </div>

            <div className="calendar-days">
                {calendarWeeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="calendar-week">
                        {week.map((day, dayIndex) => {
                            const dateStr = day.date ? formatDate(day.date, 'YYYY-MM-DD') : '';
                            const record = day.date ? attendanceRecords[dateStr] : null;
                            const dayEvents = day.date ? (events[dateStr] || []) : [];
                            const dayRequests = day.date ? (absenceRequests[dateStr] || []) : [];

                            const isCurrentMonth = day.isCurrentMonth;
                            const isTodayFlag = day.date && isToday(day.date);

                            const approvedRequest = dayRequests.find(req => req.status === 'approved');
                            let statusClass = 'status-none';
                            if (approvedRequest) {
                                if (approvedRequest.request_type === 'absence' || approvedRequest.request_type === 'absent' || approvedRequest.request_type === 'official_absence') {
                                    statusClass = 'status-absent';
                                } else if (approvedRequest.request_type === 'late' || approvedRequest.request_type === 'official_late') {
                                    statusClass = 'status-late';
                                } else if (approvedRequest.request_type === 'early_departure') {
                                    statusClass = 'status-early_departure';
                                }
                            } else if (record) {
                                statusClass = `status-${record.status}`;
                            }

                            const dayClasses = [
                                'calendar-day',
                                isCurrentMonth ? 'current-month' : 'other-month',
                                isTodayFlag ? 'today' : '',
                                dayIndex === 0 ? 'sunday' : '',
                                dayIndex === 6 ? 'saturday' : '',
                                statusClass,
                                dayEvents.length > 0 ? 'has-event' : '',
                                dayRequests.length > 0 ? 'has-request' : '',
                            ].join(' ');

                            const stats = day.date ? dailyStats[dateStr] : null;
                            const hasPendingRequests = stats && stats.pending_requests > 0;

                            const tooltipText = stats
                                ? `欠席: ${stats.absent || 0}名, 遅刻: ${stats.late || 0}名, 早退: ${stats.early_departure || 0}名${hasPendingRequests ? `, 承認待ち: ${stats.pending_requests}件` : ''}`
                                : '';

                            return (
                                <div
                                    key={dayIndex}
                                    className={dayClasses}
                                    onContextMenu={(e) => day.date && onContextMenu(e, day.date)}
                                    onClick={() => day.date && onDateClick(day.date)}
                                    title={tooltipText}
                                >
                                    <div className="day-number">
                                        {day.day}
                                        {hasPendingRequests && (userRole === 'teacher' || userRole === 'admin') && (
                                            <span className="pending-indicator">●</span>
                                        )}
                                    </div>
                                    {isCurrentMonth && (
                                        <div className="day-content">
                                            {record && (
                                                <div className="attendance-info">
                                                    <span className="status-badge">
                                                        {record.status === 'present' ? '出' :
                                                            record.status === 'absent' ? '欠' :
                                                                record.status === 'late' ? '遅' :
                                                                    record.status === 'early_departure' ? '早' : '他'}
                                                    </span>

                                                    <div className="attendance-times-calendar">
                                                        <span className="time-value">
                                                            {formatTime(record.check_in_time)}
                                                        </span>
                                                        <span className="time-separator">~</span>
                                                        <span className="time-value">
                                                            {formatTime(record.check_out_time)}
                                                        </span>
                                                    </div>

                                                    {record.reason && (
                                                        <div className="time-item">
                                                            <span className="time-label">理由:</span>
                                                            <span className="time-value">
                                                                {record.reason}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {dayEvents.length > 0 && (
                                                <div className="event-info">
                                                    {dayEvents.map(event => (
                                                        <div key={event.id} className="event-item" title={event.title}>
                                                            {event.title}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {dayRequests.length > 0 && (() => {
                                                const visibleRequests = dayRequests.filter(req => req.status !== 'rejected');
                                                if (visibleRequests.length === 0) return null;

                                                const latestRequest = visibleRequests[0];
                                                const getStatusMark = (status: string) => {
                                                    switch (status) {
                                                        case 'pending': return '📝';
                                                        case 'approved': return '✅';
                                                        case 'rejected': return '❌';
                                                        default: return '📋';
                                                    }
                                                };
                                                const getStatusText = (status: string) => {
                                                    switch (status) {
                                                        case 'pending': return '申請中';
                                                        case 'approved': return '承認済';
                                                        case 'rejected': return '却下';
                                                        default: return '';
                                                    }
                                                };
                                                return (
                                                    <div
                                                        className={`request-item request-${latestRequest.status}`}
                                                        title={`${latestRequest.request_type}: ${latestRequest.reason}`}
                                                    >
                                                        <span className="request-mark">{getStatusMark(latestRequest.status)}</span>
                                                        <span className="request-text">{getStatusText(latestRequest.status)}</span>
                                                    </div>
                                                );
                                            })()}

                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MonthlyView;
