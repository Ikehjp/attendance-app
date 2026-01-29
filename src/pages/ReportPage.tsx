import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { attendanceApi } from '../api/attendanceApi';
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import './ReportPage.css';

interface AttendanceRecord {
    id: number;
    user_id: number;
    status: string;
    check_in_time: string | null;
    check_out_time: string | null;
    date: string;
}

interface MonthlyData {
    month: string;
    present: number;
    late: number;
    absent: number;
    total: number;
    attendanceRate: number;
}

const ReportPage: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month');

    useEffect(() => {
        if (user?.id) {
            loadReportData();
        }
    }, [user]);

    const loadReportData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            if (!user?.id) return;

            // 過去1年分のデータを取得
            const endDate = new Date();
            const startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 1);

            const response = await attendanceApi.getAttendanceRecords(user.id, {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
            });

            if (response.success && response.data?.records) {
                setAttendanceRecords(response.data.records);
            }
        } catch (err) {
            console.error('レポートデータ読み込みエラー:', err);
            setError('データの読み込みに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    // 月別データを計算
    const monthlyData = useMemo((): MonthlyData[] => {
        const months: { [key: string]: { present: number; late: number; absent: number; total: number } } = {};

        attendanceRecords.forEach((record) => {
            const monthKey = record.date.substring(0, 7); // YYYY-MM
            if (!months[monthKey]) {
                months[monthKey] = { present: 0, late: 0, absent: 0, total: 0 };
            }

            months[monthKey].total++;
            if (record.status === 'present') {
                months[monthKey].present++;
            } else if (record.status === 'late') {
                months[monthKey].late++;
            } else if (record.status === 'absent') {
                months[monthKey].absent++;
            }
        });

        return Object.entries(months)
            .map(([month, data]) => ({
                month,
                ...data,
                attendanceRate: Math.round(((data.present + data.late) / data.total) * 100),
            }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12); // 最新12ヶ月
    }, [attendanceRecords]);

    // 総合統計を計算
    const totalStats = useMemo(() => {
        const total = attendanceRecords.length;
        const present = attendanceRecords.filter((r) => r.status === 'present').length;
        const late = attendanceRecords.filter((r) => r.status === 'late').length;
        const absent = attendanceRecords.filter((r) => r.status === 'absent').length;
        const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        return { total, present, late, absent, attendanceRate };
    }, [attendanceRecords]);

    // 円グラフ用データ
    const pieData = useMemo(
        () => [
            { name: '出席', value: totalStats.present, color: '#10b981' },
            { name: '遅刻', value: totalStats.late, color: '#f59e0b' },
            { name: '欠席', value: totalStats.absent, color: '#ef4444' },
        ],
        [totalStats],
    );

    // CSVエクスポート
    const handleExportCSV = () => {
        const csvContent = [
            ['日付', 'ステータス', '出勤時刻', '退勤時刻'],
            ...attendanceRecords.map((record) => [
                record.date,
                record.status,
                record.check_in_time || '',
                record.check_out_time || '',
            ]),
        ]
            .map((row) => row.join(','))
            .join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `出席レポート_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (isLoading) {
        return (
            <div className="report-page">
                <div className="report-loading">
                    <div className="spinner" />
                    <p>レポートを読み込んでいます...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="report-page">
                <div className="report-error">
                    <p>{error}</p>
                    <button onClick={loadReportData} className="retry-button">
                        再試行
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="report-page">
            <div className="report-container">
                {/* ヘッダー */}
                <div className="report-header">
                    <h1 className="report-title">📊 出席レポート</h1>
                    <div className="header-actions">
                        <button onClick={handleExportCSV} className="btn btn-secondary">
                            <span>📥</span> CSV出力
                        </button>
                        <button onClick={() => window.print()} className="btn btn-secondary">
                            <span>🖨️</span> 印刷
                        </button>
                        <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
                            ← ダッシュボードに戻る
                        </button>
                    </div>
                </div>

                {/* 統計カード */}
                <div className="stats-cards">
                    <div className="stat-card primary">
                        <div className="stat-icon">📈</div>
                        <div className="stat-content">
                            <p className="stat-label">出席率</p>
                            <p className="stat-value">{totalStats.attendanceRate}%</p>
                        </div>
                    </div>

                    <div className="stat-card success">
                        <div className="stat-icon">✅</div>
                        <div className="stat-content">
                            <p className="stat-label">出席日数</p>
                            <p className="stat-value">{totalStats.present}日</p>
                        </div>
                    </div>

                    <div className="stat-card warning">
                        <div className="stat-icon">⏰</div>
                        <div className="stat-content">
                            <p className="stat-label">遅刻回数</p>
                            <p className="stat-value">{totalStats.late}回</p>
                        </div>
                    </div>

                    <div className="stat-card danger">
                        <div className="stat-icon">❌</div>
                        <div className="stat-content">
                            <p className="stat-label">欠席回数</p>
                            <p className="stat-value">{totalStats.absent}回</p>
                        </div>
                    </div>
                </div>

                {/* グラフセクション */}
                <div className="charts-section">
                    {/* 月別出席率グラフ */}
                    <div className="chart-card">
                        <h2 className="chart-title">月別出席率推移</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="attendanceRate"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    name="出席率(%)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* ステータス別円グラフ */}
                    <div className="chart-card">
                        <h2 className="chart-title">出席状況の内訳</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) => `${name}: ${value}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 月別詳細棒グラフ */}
                <div className="chart-card full-width">
                    <h2 className="chart-title">月別出席詳細</h2>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="present" fill="#10b981" name="出席" />
                            <Bar dataKey="late" fill="#f59e0b" name="遅刻" />
                            <Bar dataKey="absent" fill="#ef4444" name="欠席" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* データテーブル */}
                {attendanceRecords.length > 0 && (
                    <div className="report-table-container">
                        <h2 className="section-title">出席記録詳細</h2>
                        <div className="table-wrapper">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>日付</th>
                                        <th>ステータス</th>
                                        <th>出勤時刻</th>
                                        <th>退勤時刻</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceRecords.slice(-30).reverse().map((record) => (
                                        <tr key={record.id}>
                                            <td>{record.date}</td>
                                            <td>
                                                <span className={`status-badge status-${record.status}`}>
                                                    {record.status === 'present'
                                                        ? '出席'
                                                        : record.status === 'late'
                                                            ? '遅刻'
                                                            : record.status === 'absent'
                                                                ? '欠席'
                                                                : record.status}
                                                </span>
                                            </td>
                                            <td>{record.check_in_time || '---'}</td>
                                            <td>{record.check_out_time || '---'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {attendanceRecords.length > 30 && (
                            <p className="table-note">※ 最新30件を表示しています</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportPage;
