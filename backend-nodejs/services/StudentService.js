const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 学生管理サービス
 */
class StudentService {
  /**
   * 学生の作成
   */
  static async createStudent(studentData) {
    try {
      const result = await transaction(async (conn) => {
        // 学生IDの重複チェック
        const existingStudent = await query(
          'SELECT student_id FROM students WHERE student_id = ?',
          [studentData.student_id]
        );

        if (existingStudent.length > 0) {
          throw new Error('この学生IDは既に使用されています');
        }

        // カードIDの重複チェック（カードIDが指定されている場合）
        if (studentData.card_id) {
          const existingCard = await query(
            'SELECT card_id FROM students WHERE card_id = ?',
            [studentData.card_id]
          );

          if (existingCard.length > 0) {
            throw new Error('このカードIDは既に使用されています');
          }
        }

        // 学生の作成
        const insertResult = await query(
          `INSERT INTO students (student_id, name, card_id, email, phone, grade, class_name, enrollment_date, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            studentData.student_id,
            studentData.name,
            studentData.card_id || null,
            studentData.email || null,
            studentData.phone || null,
            studentData.grade || null,
            studentData.class_name || null,
            studentData.enrollment_date || null,
            studentData.status || 'active'
          ]
        );

        return {
          success: true,
          message: '学生が作成されました',
          data: { studentId: studentData.student_id }
        };
      });

      logger.info('学生作成成功', { studentId: studentData.student_id });
      return result;
    } catch (error) {
      logger.error('学生作成エラー:', error.message);
      return {
        success: false,
        message: error.message || '学生の作成に失敗しました'
      };
    }
  }

  /**
   * 学生一覧の取得
   */
  static async getStudents(options = {}) {
    try {
      const { search, grade, class_name, status, limit, offset = 0 } = options;

      let sql = `
        SELECT *
        FROM students
        WHERE 1=1
      `;
      const params = [];
      const countParams = [];

      if (search) {
        sql += ' AND (name LIKE ? OR student_id LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (grade) {
        sql += ' AND grade = ?';
        params.push(grade);
      }
      if (class_name) {
        sql += ' AND class_name = ?';
        params.push(class_name);
      }
      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }

      // カウントクエリ用 (LIMIT/OFFSET前)
      const countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_query`;
      Object.assign(countParams, params);

      sql += ' ORDER BY name ASC';

      // [修正] ページネーションのロジックを修正
      if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));

        // [修正] OFFSET は LIMIT が存在する場合にのみ追加
        if (offset) {
          sql += ' OFFSET ?';
          params.push(parseInt(offset));
        }
      }

      const students = await query(sql, params);
      const countResult = await query(countSql, countParams);
      const total = countResult[0].total;

      return {
        success: true,
        data: {
          students,
          total,
          limit: limit ? parseInt(limit) : null,
          offset: parseInt(offset)
        }
      };
    } catch (error) {
      logger.error('学生一覧取得エラー:', error.message);
      return {
        success: false,
        message: '学生一覧の取得に失敗しました'
      };
    }
  }

  /**
   * 学生情報の更新
   */
  static async updateStudent(studentId, updateData) {
    try {
      const result = await transaction(async (conn) => {
        // 更新可能なフィールド
        const allowedFields = ['name', 'card_id', 'email', 'phone', 'grade', 'class_name', 'enrollment_date', 'status'];
        const updateFields = [];
        const updateValues = [];

        for (const field of allowedFields) {
          if (updateData[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(updateData[field]);
          }
        }

        if (updateFields.length === 0) {
          return { success: false, message: '更新するデータがありません' };
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(studentId);

        await conn.execute(
          `UPDATE students SET ${updateFields.join(', ')} WHERE student_id = ?`,
          updateValues
        );

        return { success: true, message: '学生情報が更新されました' };
      });

      logger.info('学生情報更新成功', { studentId });
      return result;
    } catch (error) {
      logger.error('学生情報更新エラー:', error.message);
      return {
        success: false,
        message: error.message || '学生情報の更新に失敗しました'
      };
    }
  }

  /**
   * 学生の削除
   */
  static async deleteStudent(studentId) {
    try {
      const result = await transaction(async (conn) => {
        // 学生の存在確認
        const existingStudent = await query(
          'SELECT student_id FROM students WHERE student_id = ?',
          [studentId]
        );

        if (existingStudent.length === 0) {
          throw new Error('学生が見つかりません');
        }

        // 関連する出欠記録を削除
        await query(
          'DELETE FROM student_attendance_records WHERE student_id = ?',
          [studentId]
        );

        await query(
          'DELETE FROM detailed_attendance_records WHERE student_id = ?',
          [studentId]
        );

        await query(
          'DELETE FROM enrollments WHERE student_id = ?',
          [studentId]
        );

        await query(
          'DELETE FROM notifications WHERE student_id = ?',
          [studentId]
        );

        // [修正] group_members からも削除
        await query(
          'DELETE FROM group_members WHERE student_id = ?',
          [studentId]
        );

        // 学生を削除
        await query(
          'DELETE FROM students WHERE student_id = ?',
          [studentId]
        );

        // [修正] users テーブルからも削除 (関連付けられている場合)
        await query(
          'DELETE FROM users WHERE student_id = ?',
          [studentId]
        );

        return {
          success: true,
          message: '学生が削除されました'
        };
      });

      logger.info('学生削除成功', { studentId });
      return result;
    } catch (error) {
      logger.error('学生削除エラー:', error.message);
      return {
        success: false,
        message: error.message || '学生の削除に失敗しました'
      };
    }
  }
}

module.exports = StudentService;