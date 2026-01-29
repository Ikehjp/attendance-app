import React from 'react';
import { formatDate, isToday } from '../../utils/dateUtils';
import './WeeklyView.css';

interface WeeklyViewProps {
    currentDate: Date;
    attendanceRecords: Record<string, any>;
    events: Record<string, any[]>;
    absenceRequests: Record<string, any[]>;
    timetables: Record<string, any[]>;
    timeSlots?: any[];
    onDateClick: (date: Date) => void;
    onContextMenu: (e: React.MouseEvent, date: Date) => void;
    userRole?: string;
}

const WeeklyView: React.FC<WeeklyViewProps> = ({
    currentDate,
    attendanceRecords,
    events,
    absenceRequests,
    timetables = {},
    timeSlots = [],
    onDateClick,
    onContextMenu,
    userRole,
}) => {
    // 週の開始日（日曜日）を取得
    const getWeekStartDate = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    };

    const weekStartDate = getWeekStartDate(currentDate);
    const weekDays = [];

    // 1週間分の日付を生成
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStartDate);
        d.setDate(d.getDate() + i);
        weekDays.push(d);
    }

    // 時間軸（8:00 - 20:00）
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        return `${h}:${m}`;
    };

    // 時間を分に変換（0:00からの経過分）
    const getMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    // 8:00からの位置（ピクセルまたはパーセント）を計算
    const getPosition = (timeStr: string) => {
        if (!timeStr) return 0;
        const startMinutes = 8 * 60; // 8:00
        const currentMinutes = getMinutes(timeStr);
        const diff = currentMinutes - startMinutes;
        // 1時間あたり60pxと仮定
        return (diff / 60) * 60;
    };

    const getDurationHeight = (start: string, end: string) => {
        if (!start || !end) return 60;
        const startM = getMinutes(start);
        const endM = getMinutes(end);
        const diff = endM - startM;
        return (diff / 60) * 60;
    };

    return (
        <div className="weekly-view">
            <div className="weekly-header">
                <div className="time-column-header"></div>
                {weekDays.map((day, index) => (
                    <div
                        key={index}
                        className={`day-header ${isToday(day) ? 'today' : ''}`}
                        onClick={() => onDateClick(day)}
                    >
                        <div className="day-name">{['日', '月', '火', '水', '木', '金', '土'][day.getDay()]}</div>
                        <div className="day-number">{day.getDate()}</div>
                    </div>
                ))}
            </div>

            <div className="weekly-grid">
                <div className="time-column" style={{ position: 'relative', height: `${hours.length * 60}px` }}>
                    {hours.map((hour, index) => (
                        <div
                            key={`hour-${hour}`}
                            className="time-label"
                            style={{
                                position: 'absolute',
                                top: `${index * 60}px`,
                                width: '100%',
                            }}
                        >
                            <span className="time-text">{hour}:00</span>
                        </div>
                    ))}

                    {timeSlots.map((slot, i) => {
                        if (!slot.startTime || !slot.endTime) return null;

                        // 開始時間の「時」を取得して、その時間の30分位置（中央）に表示する
                        const [startH] = slot.startTime.split(':').map(Number);
                        // 時間軸は8:00スタートなので、(時 - 8) * 60px + 30px (中央)
                        const top = (startH - 8) * 60 + 30;

                        if (top < 0 || top > 13 * 60) return null;

                        return (
                            <div
                                key={`ts-${i}`}
                                className="period-label-independent"
                                style={{
                                    top: `${top}px`,
                                }}
                            >
                                {slot.periodName || `${slot.periodNumber}限`}
                            </div>
                        );
                    })}
                </div>

                {weekDays.map((day, index) => {
                    const dateStr = formatDate(day, 'YYYY-MM-DD');
                    const record = attendanceRecords[dateStr]; // その日の出欠記録（全体）
                    const dayEvents = events[dateStr] || [];
                    const dayRequests = absenceRequests[dateStr] || [];
                    const dayClasses = timetables[dateStr] || [];

                    // デバッグ用: 日付とクラスデータのログ
                    if (dayClasses.length > 0) {
                        console.log(`[WeeklyView] Rendering classes for ${dateStr}:`, dayClasses);
                    }

                    // 出欠記録が既に表示されているかどうかのフラグ管理などは複雑になるため
                    // 簡易的に「時間割」を表示し、そこにステータスを付与する形にする
                    // ただし、現在の出欠データは「1日1件」の仕様に見える（CalendarPageの処理を見る限り）
                    // もし1日複数回の出欠（授業ごと）がある場合、attendanceRecordsの構造が異なるはず
                    // 現状のattendanceRecordsは { "YYYY-MM-DD": { ... } } なので1日1件。
                    // したがって、授業ごとの出欠はまだ実装されていないか、attendanceRecordsがそれをサポートしていない可能性が高い。
                    // → 今回は「授業予定」を表示することを優先する。

                    // 出欠記録は「全体」として表示し、授業は授業として表示する。
                    // 重なる場合は授業を優先表示し、ステータスのみ反映する...といった高度なことはせず
                    // 授業ブロックを淡い色で表示する。

                    return (
                        <div
                            key={index}
                            className="day-column"
                            data-date={dateStr}
                            onContextMenu={(e) => onContextMenu(e, day)}
                            onClick={() => onDateClick(day)}
                        >
                            {/* 背景のグリッド線 */}
                            {hours.map(hour => (
                                <div key={hour} className="grid-cell" />
                            ))}

                            {/* 授業（時間割）の表示 */}
                            {dayClasses.map((classSession: any, i: number) => {
                                // 時限を特定（classSessionにperiod_numberがあればそれを使用、なければtimeSlotsから検索）
                                let periodLabel = '';
                                if (classSession.period_number) {
                                    periodLabel = `${classSession.period_number}限`;
                                } else if (classSession.start_time && timeSlots.length > 0) {
                                    const matchingSlot = timeSlots.find((slot: any) =>
                                        slot.startTime === classSession.start_time,
                                    );
                                    if (matchingSlot) {
                                        periodLabel = matchingSlot.periodName || `${matchingSlot.periodNumber}限`;
                                    }
                                }

                                const uniqueKey = classSession.id ? `class-${classSession.id}` : `class-${dateStr}-${i}`;

                                return (
                                    <div
                                        key={uniqueKey}
                                        className={`class-block ${classSession.is_cancelled ? 'cancelled' : ''}`}
                                        style={{
                                            top: `${getPosition(classSession.start_time)}px`,
                                            height: `${getDurationHeight(classSession.start_time, classSession.end_time)}px`,
                                            minHeight: '20px',
                                        }}
                                        title={`${periodLabel ? periodLabel + ' ' : ''}${classSession.subject_name} (${classSession.room || '-'})`}
                                    >
                                        <div className="class-subject">
                                            {classSession.subject_name}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* 出欠記録の表示（時間割とは別に表示、透過度を持たせるなどして重なりに対応） */}
                            {record && record.check_in_time && record.check_out_time && (
                                <div
                                    className={`attendance-block status-${record.status}`}
                                    style={{
                                        top: `${getPosition(record.check_in_time)}px`,
                                        height: `${getDurationHeight(record.check_in_time, record.check_out_time)}px`,
                                        minHeight: '20px',
                                        zIndex: 15, // 授業より上に表示
                                        width: '80%', // 少し幅を狭くして後ろが見えるように
                                        right: 0,
                                        left: 'auto',
                                        opacity: 0.9,
                                    }}
                                >
                                    <div className="attendance-time">
                                        {formatTime(record.check_in_time)} - {formatTime(record.check_out_time)}
                                    </div>
                                    <div className="attendance-status">
                                        {record.status === 'present' ? '出席' :
                                            record.status === 'late' ? '遅刻' :
                                                record.status === 'early_departure' ? '早退' : record.status}
                                    </div>
                                </div>
                            )}

                            {/* イベントの表示（上部に表示） */}
                            {dayEvents.map((event, i) => (
                                <div
                                    key={`evt-${i}`}
                                    className="event-block"
                                    style={{ top: `${i * 25}px` }}
                                >
                                    {event.title}
                                </div>
                            ))}

                            {/* 欠席申請の表示 */}
                            {dayRequests.length > 0 && (
                                <div className="request-indicator">
                                    {dayRequests.length}件の申請
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WeeklyView;
