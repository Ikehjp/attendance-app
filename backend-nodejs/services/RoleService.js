const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 役割・権限管理サービス
 */
class RoleService {
    /**
     * 管理者かどうかチェック
     * @param {Object} user - ユーザーオブジェクト
     * @returns {boolean}
     */
    static isAdmin(user) {
        return user && user.role === 'admin';
    }

    /**
     * 教員かどうかチェック
     * @param {Object} user - ユーザーオブジェクト
     * @returns {boolean}
     */
    static isTeacher(user) {
        return user && (user.role === 'teacher' || user.role === 'admin');
    }

    /**
     * 指定グループの担当教員かどうかチェック
     * @param {number} userId - ユーザーID
     * @param {number} groupId - グループID
     * @returns {Promise<boolean>}
     */
    static async isClassTeacher(userId, groupId) {
        try {
            // 管理者は常にアクセス可能
            const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
            if (users.length > 0 && users[0].role === 'admin') {
                return true;
            }

            const result = await query(
                'SELECT id FROM group_teachers WHERE group_id = ? AND user_id = ?',
                [groupId, userId]
            );
            return result.length > 0;
        } catch (error) {
            logger.error('担当教員チェックエラー:', error);
            return false;
        }
    }

    /**
     * ユーザーがアクセス可能なグループIDリストを取得
     * @param {number} userId - ユーザーID
     * @param {string} role - ユーザーロール
     * @returns {Promise<Array<number>>} グループIDの配列
     */
    static async getAccessibleGroups(userId, role) {
        try {
            if (role === 'admin') {
                // 管理者は全グループにアクセス可能
                const groups = await query('SELECT id FROM `groups`');
                return groups.map(g => g.id);
            } else if (role === 'teacher') {
                // 担当しているグループのみ
                const groups = await query(
                    'SELECT group_id FROM group_teachers WHERE user_id = ?',
                    [userId]
                );
                return groups.map(g => g.group_id);
            } else {
                // 学生/従業員は所属しているグループのみ
                const user = await query('SELECT student_id FROM users WHERE id = ?', [userId]);
                if (user.length === 0 || !user[0].student_id) return [];

                const groups = await query(
                    'SELECT group_id FROM group_members WHERE student_id = ? AND status = "active"',
                    [user[0].student_id]
                );
                return groups.map(g => g.group_id);
            }
        } catch (error) {
            logger.error('アクセス可能グループ取得エラー:', error);
            return [];
        }
    }

    /**
     * データアクセス権限チェック（汎用）
     * @param {Object} user - ユーザーオブジェクト
     * @param {string} dataType - データタイプ ('group', 'student', 'attendance' etc.)
     * @param {number|string} dataId - データID
     * @returns {Promise<boolean>}
     */
    static async canAccessData(user, dataType, dataId) {
        if (this.isAdmin(user)) return true;

        try {
            switch (dataType) {
                case 'group':
                    // グループへのアクセス権（担当教員かメンバーか）
                    if (user.role === 'teacher') {
                        return await this.isClassTeacher(user.id, dataId);
                    } else if (user.role === 'student' || user.role === 'employee') {
                        // 所属メンバーかチェック
                        if (!user.studentId) return false;
                        const member = await query(
                            'SELECT id FROM group_members WHERE group_id = ? AND student_id = ?',
                            [dataId, user.studentId]
                        );
                        return member.length > 0;
                    }
                    break;

                // 他のデータタイプも必要に応じて追加
                default:
                    return false;
            }
            return false;
        } catch (error) {
            logger.error('データアクセス権限チェックエラー:', error);
            return false;
        }
    }
}

module.exports = RoleService;
