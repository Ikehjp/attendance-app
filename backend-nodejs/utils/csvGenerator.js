/**
 * CSV生成ユーティリティ
 * BOM付きUTF-8でExcel対応
 */

/**
 * 配列データをCSV形式の文字列に変換
 * @param {Array<Object>} data - データ配列
 * @param {Array<string>} headers - ヘッダー配列
 * @param {Array<string>} fields - フィールド名配列
 * @returns {string} CSV文字列
 */
const arrayToCSV = (data, headers, fields) => {
    // BOM (Byte Order Mark) を追加してExcelで文字化けを防ぐ
    const BOM = '\uFEFF';

    // ヘッダー行
    const headerRow = headers.join(',');

    // データ行
    const dataRows = data.map(row => {
        return fields.map(field => {
            let value = row[field] ?? '';

            // 値を文字列に変換
            value = String(value);

            // カンマ、改行、ダブルクォートを含む場合はダブルクォートで囲む
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                // ダブルクォートをエスケープ
                value = value.replace(/"/g, '""');
                value = `"${value}"`;
            }

            return value;
        }).join(',');
    });

    return BOM + [headerRow, ...dataRows].join('\n');
};

/**
 * 出席記録をCSV形式に変換
 * @param {Array<Object>} records - 出席記録配列
 * @returns {string} CSV文字列
 */
const attendanceToCSV = (records) => {
    const headers = ['日付', '曜日', '開始時刻', '終了時刻', 'ステータス', '備考'];
    const fields = ['date', 'day_of_week', 'start_time', 'end_time', 'status', 'notes'];

    // データを整形
    const formattedData = records.map(record => ({
        date: record.date,
        day_of_week: getDayOfWeek(record.date),
        start_time: record.start_time || '-',
        end_time: record.end_time || '-',
        status: getStatusLabel(record.status),
        notes: record.notes || ''
    }));

    return arrayToCSV(formattedData, headers, fields);
};

/**
 * イベント参加者をCSV形式に変換
 * @param {Object} event - イベント情報
 * @param {Array<Object>} participants - 参加者配列
 * @returns {string} CSV文字列
 */
const eventParticipantsToCSV = (event, participants) => {
    const headers = ['学生ID', '氏名', 'メールアドレス', '参加ステータス', '応答日時'];
    const fields = ['student_id', 'name', 'email', 'response_status', 'responded_at'];

    // データを整形
    const formattedData = participants.map(participant => ({
        student_id: participant.student_id || '-',
        name: participant.name,
        email: participant.email,
        response_status: getParticipantStatusLabel(participant.response_status),
        responded_at: participant.responded_at ? new Date(participant.responded_at).toLocaleString('ja-JP') : '-'
    }));

    return arrayToCSV(formattedData, headers, fields);
};

/**
 * 日付から曜日を取得
 * @param {string} dateStr - 日付文字列 (YYYY-MM-DD)
 * @returns {string} 曜日
 */
const getDayOfWeek = (dateStr) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const date = new Date(dateStr);
    return days[date.getDay()];
};

/**
 * ステータスコードからラベルを取得
 * @param {string} status - ステータスコード
 * @returns {string} ステータスラベル
 */
const getStatusLabel = (status) => {
    const statusMap = {
        'present': '出席',
        'absent': '欠席',
        'late': '遅刻',
        'excused': '公欠'
    };
    return statusMap[status] || status;
};

/**
 * 参加ステータスコードからラベルを取得
 * @param {string} status - ステータスコード
 * @returns {string} ステータスラベル
 */
const getParticipantStatusLabel = (status) => {
    const statusMap = {
        'pending': '未応答',
        'accepted': '参加',
        'declined': '不参加'
    };
    return statusMap[status] || status;
};

module.exports = {
    arrayToCSV,
    attendanceToCSV,
    eventParticipantsToCSV
};
