import React from 'react';
import { formatDate, isToday } from '../../utils/dateUtils';
import './YearlyView.css';

interface YearlyViewProps {
    currentDate: Date;
    attendanceRecords: Record<string, any>;
    onMonthClick: (date: Date) => void;
}

const YearlyView: React.FC<YearlyViewProps> = ({
    currentDate,
    attendanceRecords,
    onMonthClick,
}) => {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i); // 0-11

    // 月ごとのカレンダーを生成するヘルパー関数
    const renderMiniCalendar = (monthIndex: number) => {
        const monthFirstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);
        const daysInMonth = lastDay.getDate();

        // 月の最初の日の曜日 (0: 日曜, 1: 月曜...)
        const startDayOfWeek = monthFirstDay.getDay();

        // カレンダーの日付配列生成
        const days = [];
        // 空白セル
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        // 日付
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, monthIndex, i));
        }

        return (
            <div
                key={monthIndex}
                className="mini-calendar"
                onClick={() => onMonthClick(new Date(year, monthIndex, 1))}
            >
                <div className="mini-calendar-header">
                    {monthIndex + 1}月
                </div>
                <div className="mini-calendar-weekdays">
                    {['日', '月', '火', '水', '木', '金', '土'].map(d => (
                        <span key={d}>{d}</span>
                    ))}
                </div>
                <div className="mini-calendar-grid">
                    {days.map((date, i) => {
                        if (!date) return <div key={`empty-${i}`} className="mini-day empty"></div>;

                        const dateStr = formatDate(date, 'YYYY-MM-DD');
                        const record = attendanceRecords[dateStr];
                        const isTodayFlag = isToday(date);
                        let statusClass = '';

                        if (record) {
                            if (record.status === 'present') statusClass = 'status-present';
                            else if (record.status === 'absent') statusClass = 'status-absent';
                            else if (record.status === 'late') statusClass = 'status-late';
                            else if (record.status === 'early_departure') statusClass = 'status-early-departure';
                        }

                        return (
                            <div key={i} className={`mini-day ${statusClass} ${isTodayFlag ? 'today' : ''}`}>
                                {date.getDate()}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="yearly-view">
            <div className="yearly-header">
                <h2>{year}年</h2>
            </div>
            <div className="months-grid">
                {months.map(month => renderMiniCalendar(month))}
            </div>
        </div>
    );
};

export default YearlyView;
