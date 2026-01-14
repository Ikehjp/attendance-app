/**
 * 授業管理サービス
 * * PHPの 'backend-php/classes/Class.php' のロジックをNode.jsに移植したものです。
 * データベース接続プールが '../config/database.js' からインポートされることを想定しています。
 */

// データベース接続プールをインポート（実際のパスに合わせてください）
// 例: const pool = require('../config/database');
// この 'pool' は 'mysql2/promise' で作成されたプールを想定しています。
const pool = require('../config/database'); // <--- このパスは環境に合わせてください

const ClassService = {

    /**
     * 授業の作成
     * @param {object} classData - 授業データ
     */
    createClass: async (classData) => {
        const { class_code, subject_id, teacher_name, room, schedule_day, start_time, end_time, semester, academic_year } = classData;

        // PHPのバリデーションに相当（コントローラー層で行うのが一般的ですが、ここでも確認）
        if (!class_code || !subject_id || !teacher_name || !schedule_day || !start_time || !end_time) {
            return { success: false, message: '必須フィールド（授業コード、科目ID、担当者名、曜日、時間）が不足しています' };
        }

        let connection;
        try {
            connection = await pool.getConnection();

            // 授業コードの重複チェック
            let [rows] = await connection.execute("SELECT id FROM classes WHERE class_code = ?", [class_code]);
            if (rows.length > 0) {
                return { success: false, message: 'この授業コードは既に使用されています' };
            }

            // 科目の存在確認
            [rows] = await connection.execute("SELECT id FROM subjects WHERE id = ?", [subject_id]);
            if (rows.length === 0) {
                return { success: false, message: '指定された科目が見つかりません' };
            }

            // 授業の作成
            const sql = `INSERT INTO classes 
                         (class_code, subject_id, teacher_name, room, schedule_day, start_time, end_time, semester, academic_year) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const [result] = await connection.execute(sql, [
                class_code,
                subject_id,
                teacher_name,
                room || null,
                schedule_day,
                start_time,
                end_time,
                semester || null,
                academic_year || null
            ]);

            return { success: true, message: '授業が作成されました', data: { id: result.insertId } };

        } catch (error) {
            console.error("ClassService.createClass エラー:", error.message);
            return { success: false, message: '授業の作成に失敗しました' };
        } finally {
            if (connection) connection.release();
        }
    },

    /**
     * 授業一覧の取得
     * @param {string} search - 検索キーワード
     * @param {number} subjectId - 科目ID
     * @param {boolean} isActive - 有効フラグ
     */
    getClasses: async (search, subjectId, isActive) => {
        let sql = `SELECT c.*, s.subject_name, s.subject_code 
                   FROM classes c 
                   JOIN subjects s ON c.subject_id = s.id`;
        const params = [];
        const conditions = [];

        try {
            if (search) {
                conditions.push("(c.class_code LIKE ? OR c.teacher_name LIKE ? OR s.subject_name LIKE ?)");
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (subjectId) {
                conditions.push("c.subject_id = ?");
                params.push(subjectId);
            }

            if (isActive !== null && isActive !== undefined) {
                conditions.push("c.is_active = ?");
                // 'true'/'false' の文字列を 1/0 に変換
                params.push(isActive === 'true' || isActive === true ? 1 : 0);
            }

            if (conditions.length > 0) {
                sql += " WHERE " + conditions.join(" AND ");
            }

            sql += " ORDER BY c.schedule_day, c.start_time";

            const [classes] = await pool.query(sql, params);
            return { success: true, data: { classes: classes } };

        } catch (error) {
            console.error("ClassService.getClasses エラー:", error.message);
            return { success: false, message: '授業一覧の取得に失敗しました' };
        }
    },

    /**
     * 特定授業の取得
     * @param {string|number} classId - 授業ID
     */
    getClass: async (classId) => {
        try {
            const sql = `SELECT c.*, s.subject_name, s.subject_code 
                         FROM classes c 
                         JOIN subjects s ON c.subject_id = s.id 
                         WHERE c.id = ?`;
            const [rows] = await pool.execute(sql, [classId]);

            if (rows.length === 0) {
                return { success: false, message: '授業が見つかりません' };
            }

            return { success: true, data: { class: rows[0] } };
        } catch (error) {
            console.error("ClassService.getClass エラー:", error.message);
            return { success: false, message: '授業情報の取得に失敗しました' };
        }
    },

    /**
     * 授業情報の更新
     * @param {string|number} classId - 授業ID
     * @param {object} updateData - 更新データ
     */
    updateClass: async (classId, updateData) => {
        let connection;
        try {
            connection = await pool.getConnection();

            // 授業の存在確認
            let [rows] = await connection.execute("SELECT * FROM classes WHERE id = ?", [classId]);
            if (rows.length === 0) {
                return { success: false, message: '授業が見つかりません' };
            }
            const existingClass = rows[0];

            // 授業コードの重複チェック（変更する場合）
            if (updateData.class_code && updateData.class_code !== existingClass.class_code) {
                [rows] = await connection.execute("SELECT id FROM classes WHERE class_code = ? AND id != ?", [updateData.class_code, classId]);
                if (rows.length > 0) {
                    return { success: false, message: 'この授業コードは既に使用されています' };
                }
            }
            
            // 科目の存在確認（変更する場合）
            if (updateData.subject_id) {
                [rows] = await connection.execute("SELECT id FROM subjects WHERE id = ?", [updateData.subject_id]);
                if (rows.length === 0) {
                    return { success: false, message: '指定された科目が見つかりません' };
                }
            }

            // 更新処理
            const updateFields = [];
            const updateParams = [];
            const allowedFields = ['class_code', 'subject_id', 'teacher_name', 'room', 'schedule_day', 'start_time', 'end_time', 'semester', 'academic_year', 'is_active'];

            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    updateFields.push(`${field} = ?`);
                    updateParams.push(updateData[field]);
                }
            }

            if (updateFields.length === 0) {
                return { success: false, message: '更新するデータがありません' };
            }

            updateFields.push('updated_at = NOW()');
            updateParams.push(classId);

            const sql = `UPDATE classes SET ${updateFields.join(', ')} WHERE id = ?`;
            await connection.execute(sql, updateParams);

            return { success: true, message: '授業情報が更新されました' };

        } catch (error) {
            console.error("ClassService.updateClass エラー:", error.message);
            return { success: false, message: '授業情報の更新に失敗しました' };
        } finally {
            if (connection) connection.release();
        }
    },

    /**
     * 授業の削除
     * @param {string|number} classId - 授業ID
     */
    deleteClass: async (classId) => {
        let connection;
        try {
            connection = await pool.getConnection();

            // 授業の存在確認
            let [rows] = await connection.execute("SELECT * FROM classes WHERE id = ?", [classId]);
            if (rows.length === 0) {
                return { success: false, message: '授業が見つかりません' };
            }

            // 関連する登録があるかチェック
            [rows] = await connection.execute("SELECT COUNT(*) as count FROM enrollments WHERE class_id = ?", [classId]);
            if (rows[0].count > 0) {
                return { success: false, message: 'この授業に登録されている学生が存在するため削除できません' };
            }

            // 授業の削除
            await connection.execute("DELETE FROM classes WHERE id = ?", [classId]);

            return { success: true, message: '授業が削除されました' };

        } catch (error) {
            console.error("ClassService.deleteClass エラー:", error.message);
            return { success: false, message: '授業の削除に失敗しました' };
        } finally {
            if (connection) connection.release();
        }
    }
};

module.exports = ClassService;