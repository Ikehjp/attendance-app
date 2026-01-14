const { query } = require('../config/database');
const logger = require('../utils/logger');
const AttendanceService = require('./AttendanceService');
const StudentAttendanceService = require('./StudentAttendanceService');

/**
 * [完全版] レポートサービス
 */
class ReportService {
  /**
   * 出欠レポートの取得
   */
  static async getAttendanceReport(options = {}) {
    try {
      const {
        type,
        start_date,
        end_date,
        user_id,
        student_id,
        class_id
      } = options;

      let sql = '';
      const params = [];

      if (student_id || class_id) {
        // --- 学生レポート (detailed_attendance_records) ---
        sql = `
          SELECT 
            dar.id,
            dar.attendance_date as date,
            dar.status,
            dar.check_in_time,
            dar.check_out_time,
            dar.notes,
            s.name as student_name,
            s.student_id,
            c.class_code,
            sj.subject_name
          FROM detailed_attendance_records dar
          JOIN students s ON dar.student_id = s.student_id
          JOIN classes c ON dar.class_id = c.id
          JOIN subjects sj ON c.subject_id = sj.id
          WHERE dar.attendance_date >= ? AND dar.attendance_date <= ?
        `;
        params.push(start_date, end_date);

        if (student_id) {
          sql += ' AND dar.student_id = ?';
          params.push(student_id);
        }
        if (class_id) {
          sql += ' AND dar.class_id = ?';
          params.push(class_id);
        }
        sql += ' ORDER BY dar.attendance_date DESC, s.name ASC';

      } else {
        // --- 従業員レポート (user_attendance_records) ---
        sql = `
          SELECT 
            uar.id,
            uar.date,
            uar.status,
            uar.check_in_time,
            uar.check_out_time,
            uar.reason,
            u.name as user_name
          FROM user_attendance_records uar
          JOIN users u ON uar.user_id = u.id
          WHERE uar.date >= ? AND uar.date <= ?
        `;
        params.push(start_date, end_date);

        if (user_id) {
          sql += ' AND uar.user_id = ?';
          params.push(user_id);
        }
        sql += ' ORDER BY uar.date DESC, u.name ASC';
      }

      const records = await query(sql, params);
      return {
        success: true,
        data: {
          type: student_id || class_id ? 'student' : 'employee',
          report: records
        }
      };

    } catch (error) {
      logger.error('出欠レポート取得エラー:', error.message);
      return {
        success: false,
        message: '出欠レポートの取得に失敗しました'
      };
    }
  }

  /**
   * 統計レポートの取得
   */
  static async getStatisticsReport(options = {}) {
    try {
      const {
        period,
        user_id,
        student_id,
        class_id
      } = options;

      let result;

      if (student_id || class_id) {
        // 学生統計
        result = await StudentAttendanceService.getAttendanceStats({
          student_id,
          class_id,
          period
        });
      } else {
        // 従業員統計
        result = await AttendanceService.getAttendanceStats(user_id, period);
      }

      return result;

    } catch (error) {
      logger.error('統計レポート取得エラー:', error.message);
      return {
        success: false,
        message: '統計レポートの取得に失敗しました'
      };
    }
  }

  /**
   * エクスポート用レポートの取得
   */
  static async exportReport(options = {}) {
    try {
      const { format, type } = options;

      const reportData = await this.getAttendanceReport(options);
      if (!reportData.success) {
        return reportData;
      }

      const records = reportData.data.report;

      if (format === 'csv') {
        if (records.length === 0) {
          return { success: true, data: "データなし", contentType: 'text/csv', filename: 'report.csv' };
        }

        const headers = Object.keys(records[0]);
        let csvContent = headers.join(',') + '\n';

        for (const record of records) {
          const row = headers.map(header => {
            let value = record[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',');
          csvContent += row + '\n';
        }

        return {
          success: true,
          data: csvContent,
          contentType: 'text/csv; charset=utf-8',
          filename: `report_${type}_${new Date().toISOString().split('T')[0]}.csv`
        };
      }

      return {
        success: false,
        message: `${format}形式のエクスポートは現在サポートされていません`
      };

    } catch (error) {
      logger.error('レポートエクスポートエラー:', error.message);
      return {
        success: false,
        message: 'レポートのエクスポートに失敗しました'
      };
    }
  }

  /**
   * ダッシュボード用サマリーレポートの取得
   */
  static async getDashboardSummary(userId, period = 'month') {
    try {
      const result = await AttendanceService.getAttendanceStats(userId, period);

      if (result.success) {
        return {
          success: true,
          data: { summary: result.data }
        };
      } else {
        return result;
      }

    } catch (error) {
      logger.error('ダッシュボードサマリー取得エラー:', error.message);
      return {
        success: false,
        message: 'ダッシュボードサマリーの取得に失敗しました'
      };
    }
  }
}

module.exports = ReportService;