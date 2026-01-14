/**
 * [追加] 渡された値を安全にDateオブジェクトに変換するヘルパー関数
 * @param {*} date - Dateオブジェクト、文字列、数値、またはnull
 * @returns {Date | null} 有効なDateオブジェクト、または無効な場合はnull
 */
const ensureDateObject = (date) => {
  if (Object.prototype.toString.call(date) === '[object Date]') {
    // 既にDateオブジェクト
    return date;
  }

  if (typeof date === 'string' || typeof date === 'number') {
    // 文字列または数値（タイムスタンプ）から変換
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d; // 有効な日付
    }
  }

  // null, undefined, または無効な日付
  return null;
};

/**
 * YYYY-MM-DD HH:MM:SS 形式の文字列を返す
 */
export const formatDate = (date, formatStr) => {
  const d = ensureDateObject(date); // [修正] 安全な変換を行う

  // [修正] 無効な日付の場合は空文字を返す
  if (!d) return '';

  formatStr = formatStr.replace(/YYYY/g, d.getFullYear());
  formatStr = formatStr.replace(/MM/g, (d.getMonth() + 1).toString().padStart(2, '0'));
  formatStr = formatStr.replace(/DD/g, d.getDate().toString().padStart(2, '0'));
  formatStr = formatStr.replace(/HH/g, d.getHours().toString().padStart(2, '0'));
  formatStr = formatStr.replace(/MI/g, d.getMinutes().toString().padStart(2, '0'));
  formatStr = formatStr.replace(/SS/g, d.getSeconds().toString().padStart(2, '0'));
  return formatStr;
};

/**
 * HH:MM 形式の文字列を返す
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  // "HH:MM:SS" または "HH:MM" 形式を想定
  return timeStr.split(':').slice(0, 2).join(':');
};

/**
 * カレンダー表示用の日付配列を生成
 */
export const getMonthDays = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];

  // 曜日に合わせて空白を挿入
  const firstDayOfMonth = date.getDay(); // 0 (日) - 6 (土)
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({ day: null, date: null, isCurrentMonth: false });
  }

  // 月の日付を追加
  while (date.getMonth() === month) {
    days.push({
      day: date.getDate(),
      date: new Date(date), // Dateオブジェクト
      isCurrentMonth: true,
    });
    date.setDate(date.getDate() + 1);
  }

  // 週の残りを埋める
  while (days.length % 7 !== 0) {
    days.push({ day: null, date: null, isCurrentMonth: false });
  }

  return days;
};

/**
 * Dateオブジェクトが今日かどうかを判定
 */
export const isToday = (date) => {
  const d = ensureDateObject(date); // [修正] 安全な変換を行う

  // [修正] 無効な日付の場合はfalseを返す
  if (!d) return false;

  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};