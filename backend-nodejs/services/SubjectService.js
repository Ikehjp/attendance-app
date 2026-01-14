const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 科目管理サービス
 */
class SubjectService {
  /**
   * 科目の作成
   */
  static async createSubject(subjectData) {
    try {
      const result = await transaction(async (conn) => {
        // 科目コードの重複チェック
        const existingSubject = await query(
          'SELECT subject_code FROM subjects WHERE subject_code = ?',
          [subjectData.subject_code]
        );

        if (existingSubject.length > 0) {
          throw new Error('この科目コードは既に使用されています');
        }

        // 科目の作成
        const insertResult = await query(
          `INSERT INTO subjects (subject_code, subject_name, description, credits, is_active) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            subjectData.subject_code,
            subjectData.subject_name,
            subjectData.description || null,
            subjectData.credits || 1,
            subjectData.is_active !== undefined ? subjectData.is_active : true
          ]
        );

        return {
          success: true,
          message: '科目が作成されました',
          data: { subjectId: insertResult.insertId }
        };
      });

      logger.info('科目作成成功', { subjectCode: subjectData.subject_code });
      return result;
    } catch (error) {
      logger.error('科目作成エラー:', error.message);
      return {
        success: false,
        message: error.message || '科目の作成に失敗しました'
      };
    }
  }

  /**
   * 科目一覧の取得
   */
  static async getSubjects(search, isActive, limit, offset) {
    try {
      let sql = `
        SELECT id, subject_code, subject_name, description, credits, is_active, created_at, updated_at
        FROM subjects
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        sql += ' AND (subject_code LIKE ? OR subject_name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (isActive !== undefined) {
        sql += ' AND is_active = ?';
        params.push(isActive);
      }

      sql += ' ORDER BY subject_code';

      if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
      }

      if (offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(offset));
      }

      const subjects = await query(sql, params);

      // 総数を取得
      let countSql = 'SELECT COUNT(*) as total FROM subjects WHERE 1=1';
      const countParams = [];

      if (search) {
        countSql += ' AND (subject_code LIKE ? OR subject_name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (isActive !== undefined) {
        countSql += ' AND is_active = ?';
        countParams.push(isActive);
      }

      const countResult = await query(countSql, countParams);
      const total = countResult[0].total;

      return {
        success: true,
        data: {
          subjects,
          total,
          limit: limit ? parseInt(limit) : null,
          offset: offset ? parseInt(offset) : 0
        }
      };
    } catch (error) {
      logger.error('科目一覧取得エラー:', error.message);
      return {
        success: false,
        message: '科目一覧の取得に失敗しました'
      };
    }
  }

  /**
   * 特定科目の取得
   */
  static async getSubject(subjectId) {
    try {
      const subjects = await query(
        'SELECT * FROM subjects WHERE id = ?',
        [subjectId]
      );

      if (subjects.length === 0) {
        return {
          success: false,
          message: '科目が見つかりません'
        };
      }

      return {
        success: true,
        data: { subject: subjects[0] }
      };
    } catch (error) {
      logger.error('科目取得エラー:', error.message);
      return {
        success: false,
        message: '科目の取得に失敗しました'
      };
    }
  }

  /**
   * 科目情報の更新
   */
  static async updateSubject(subjectId, updateData) {
    try {
      const result = await transaction(async (conn) => {
        // 科目の存在確認
        const existingSubject = await query(
          'SELECT * FROM subjects WHERE id = ?',
          [subjectId]
        );

        if (existingSubject.length === 0) {
          throw new Error('科目が見つかりません');
        }

        // 科目コードの重複チェック（科目コードが変更される場合）
        if (updateData.subject_code && updateData.subject_code !== existingSubject[0].subject_code) {
          const existingCode = await query(
            'SELECT subject_code FROM subjects WHERE subject_code = ? AND id != ?',
            [updateData.subject_code, subjectId]
          );

          if (existingCode.length > 0) {
            throw new Error('この科目コードは既に使用されています');
          }
        }

        // 更新フィールドの構築
        const updateFields = [];
        const updateParams = [];

        const allowedFields = ['subject_code', 'subject_name', 'description', 'credits', 'is_active'];
        
        for (const field of allowedFields) {
          if (updateData[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateParams.push(updateData[field]);
          }
        }

        if (updateFields.length === 0) {
          throw new Error('更新するデータがありません');
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateParams.push(subjectId);

        await query(
          `UPDATE subjects SET ${updateFields.join(', ')} WHERE id = ?`,
          updateParams
        );

        return {
          success: true,
          message: '科目情報が更新されました'
        };
      });

      logger.info('科目情報更新成功', { subjectId });
      return result;
    } catch (error) {
      logger.error('科目情報更新エラー:', error.message);
      return {
        success: false,
        message: error.message || '科目情報の更新に失敗しました'
      };
    }
  }

  /**
   * 科目の削除
   */
  static async deleteSubject(subjectId) {
    try {
      const result = await transaction(async (conn) => {
        // 科目の存在確認
        const existingSubject = await query(
          'SELECT * FROM subjects WHERE id = ?',
          [subjectId]
        );

        if (existingSubject.length === 0) {
          throw new Error('科目が見つかりません');
        }

        // 関連する授業があるかチェック
        const relatedClasses = await query(
          'SELECT COUNT(*) as count FROM classes WHERE subject_id = ?',
          [subjectId]
        );

        if (relatedClasses[0].count > 0) {
          throw new Error('この科目に関連する授業が存在するため削除できません');
        }

        // 科目を削除
        await query(
          'DELETE FROM subjects WHERE id = ?',
          [subjectId]
        );

        return {
          success: true,
          message: '科目が削除されました'
        };
      });

      logger.info('科目削除成功', { subjectId });
      return result;
    } catch (error) {
      logger.error('科目削除エラー:', error.message);
      return {
        success: false,
        message: error.message || '科目の削除に失敗しました'
      };
    }
  }
}

module.exports = SubjectService;
