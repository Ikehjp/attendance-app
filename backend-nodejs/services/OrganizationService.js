const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 組織管理サービス
 */
class OrganizationService {
    /**
     * 組織情報を取得
     * @param {number} orgId - 組織ID
     * @returns {Promise<Object>} 組織情報
     */
    static async getOrganization(orgId) {
        try {
            const sql = `
        SELECT 
          id, name, type, address, phone, email, 
          student_join_code,
          created_at, updated_at
        FROM organizations
        WHERE id = ?
      `;

            const results = await query(sql, [orgId]);

            if (results.length === 0) {
                throw new Error('組織が見つかりません');
            }

            return results[0];
        } catch (error) {
            logger.error('組織情報取得エラー:', error);
            throw error;
        }
    }

    /**
     * すべての組織一覧を取得
     * @returns {Promise<Array>} 組織一覧
     */
    static async getAllOrganizations() {
        try {
            const sql = `
        SELECT 
          id, name, type, address, phone, email, 
          created_at, updated_at
        FROM organizations
        ORDER BY created_at DESC
      `;

            return await query(sql);
        } catch (error) {
            logger.error('組織一覧取得エラー:', error);
            throw error;
        }
    }

    /**
     * 組織情報を更新（管理者のみ）
     * @param {number} orgId - 組織ID
     * @param {Object} data - 更新データ
     * @returns {Promise<Object>} 更新された組織情報
     */
    static async updateOrganization(orgId, data) {
        try {
            const { name, type, address, phone, email } = data;

            // 更新可能なフィールドのみを抽出
            const updateFields = [];
            const updateValues = [];

            if (name !== undefined) {
                updateFields.push('name = ?');
                updateValues.push(name);
            }
            if (type !== undefined) {
                updateFields.push('type = ?');
                updateValues.push(type);
            }
            if (address !== undefined) {
                updateFields.push('address = ?');
                updateValues.push(address);
            }
            if (phone !== undefined) {
                updateFields.push('phone = ?');
                updateValues.push(phone);
            }
            if (email !== undefined) {
                updateFields.push('email = ?');
                updateValues.push(email);
            }

            if (updateFields.length === 0) {
                throw new Error('更新するフィールドがありません');
            }

            updateValues.push(orgId);

            const sql = `
        UPDATE organizations
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

            await query(sql, updateValues);

            // 更新後のデータを取得
            return await this.getOrganization(orgId);
        } catch (error) {
            logger.error('組織情報更新エラー:', error);
            throw error;
        }
    }

    /**
     * 新しい組織を作成
     * @param {Object} data - 組織データ
     * @returns {Promise<Object>} 作成された組織情報
     */
    static async createOrganization(data) {
        try {
            const { name, type, address, phone, email } = data;

            if (!name || !type) {
                throw new Error('組織名と種別は必須です');
            }

            const sql = `
        INSERT INTO organizations (name, type, address, phone, email)
        VALUES (?, ?, ?, ?, ?)
      `;

            const result = await query(sql, [name, type, address, phone, email]);

            return await this.getOrganization(result.insertId);
        } catch (error) {
            logger.error('組織作成エラー:', error);
            throw error;
        }
    }

    /**
     * 組織を削除（管理者のみ）
     * @param {number} orgId - 組織ID
     * @returns {Promise<boolean>} 削除成功フラグ
     */
    static async deleteOrganization(orgId) {
        try {
            const sql = 'DELETE FROM organizations WHERE id = ?';
            await query(sql, [orgId]);

            return true;
        } catch (error) {
            logger.error('組織削除エラー:', error);
            throw error;
        }
    }

    /**
     * 組織の統計情報を取得
     * @param {number} orgId - 組織ID
     * @returns {Promise<Object>} 統計情報
     */
    static async getOrganizationStats(orgId) {
        try {
            // グループ数を取得
            const groupCountSql = `
        SELECT COUNT(*) as count
        FROM \`groups\`
        WHERE is_active = TRUE
      `;
            const groupCount = await query(groupCountSql);

            // 学生数を取得（グループメンバー経由）
            const studentCountSql = `
        SELECT COUNT(DISTINCT gm.student_id) as count
        FROM group_members gm
        JOIN \`groups\` g ON gm.group_id = g.id
        WHERE gm.status = 'active'
      `;
            const studentCount = await query(studentCountSql);

            // 教員数を取得（グループ担当教員経由）
            const teacherCountSql = `
        SELECT COUNT(DISTINCT gt.user_id) as count
        FROM group_teachers gt
        JOIN \`groups\` g ON gt.group_id = g.id
      `;
            const teacherCount = await query(teacherCountSql);

            return {
                totalGroups: groupCount[0].count,
                totalStudents: studentCount[0].count,
                totalTeachers: teacherCount[0].count
            };
        } catch (error) {
            logger.error('組織統計情報取得エラー:', error);
            throw error;
        }
    }
}

module.exports = OrganizationService;
