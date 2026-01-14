/**
 * サービス互換レイヤー
 * 新スキーマへの移行中に既存APIとの互換性を保つ
 */
const UnifiedAttendanceService = require('./UnifiedAttendanceService');
const UnifiedUserService = require('./UnifiedUserService');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 新旧スキーマの判定
 * 新テーブルが存在するかどうかで判断
 */
let useNewSchema = null;

async function checkSchemaVersion() {
    if (useNewSchema !== null) return useNewSchema;

    try {
        // attendance_records テーブルに record_type カラムがあるか確認
        const result = await query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'attendance_records' AND COLUMN_NAME = 'record_type'
    `);
        useNewSchema = result.length > 0;
        logger.info(`スキーマバージョン: ${useNewSchema ? '新' : '旧'}`);
        return useNewSchema;
    } catch (error) {
        logger.warn('スキーマバージョン判定エラー、旧スキーマとして処理:', error.message);
        useNewSchema = false;
        return false;
    }
}

/**
 * 出欠サービス互換レイヤー
 */
const AttendanceCompat = {
    /**
     * チェックイン（出勤/出席）
     */
    async checkIn(userId, options = {}) {
        const isNew = await checkSchemaVersion();

        if (isNew) {
            // 新スキーマ: organization_id が必要
            const organizationId = options.organization_id || await getOrganizationIdForUser(userId);
            return UnifiedAttendanceService.checkIn(organizationId, userId, options);
        } else {
            // 旧スキーマ: 既存の AttendanceService を使用
            const OldAttendanceService = require('./AttendanceService');
            return OldAttendanceService.checkIn(userId, options);
        }
    },

    /**
     * チェックアウト（退勤/退席）
     */
    async checkOut(userId, options = {}) {
        const isNew = await checkSchemaVersion();

        if (isNew) {
            const organizationId = options.organization_id || await getOrganizationIdForUser(userId);
            return UnifiedAttendanceService.checkOut(organizationId, userId, options);
        } else {
            const OldAttendanceService = require('./AttendanceService');
            return OldAttendanceService.checkOut(userId, options);
        }
    },

    /**
     * 日次統計取得
     */
    async getDailyStats(year, month, organizationId = null) {
        const isNew = await checkSchemaVersion();

        if (isNew) {
            const orgId = organizationId || await getDefaultOrganizationId();
            return UnifiedAttendanceService.getDailyStats(orgId, year, month);
        } else {
            const DailyStatsService = require('./DailyStatsService');
            return DailyStatsService.getDailyStats(year, month);
        }
    },

    /**
     * 月次レポート取得
     */
    async getMonthlyReport(userId, year, month, organizationId = null) {
        const isNew = await checkSchemaVersion();

        if (isNew) {
            return UnifiedAttendanceService.getMonthlyReport(userId, year, month, organizationId);
        } else {
            const AttendanceService = require('./AttendanceService');
            return AttendanceService.getMonthlyReport(userId, year, month);
        }
    },

    /**
     * 今日の出欠状況取得
     */
    async getTodayStatus(userId, organizationId = null) {
        const isNew = await checkSchemaVersion();

        if (isNew) {
            return UnifiedAttendanceService.getTodayStatus(userId, organizationId);
        } else {
            const AttendanceService = require('./AttendanceService');
            return AttendanceService.getTodayStatus(userId);
        }
    },

    /**
     * 欠席詳細取得
     */
    async getAbsenceDetails(date, organizationId = null) {
        const isNew = await checkSchemaVersion();

        if (isNew) {
            const orgId = organizationId || await getDefaultOrganizationId();
            return UnifiedAttendanceService.getAbsenceDetails(orgId, date);
        } else {
            const DailyStatsService = require('./DailyStatsService');
            return DailyStatsService.getAbsenceDetails(date);
        }
    }
};

/**
 * ユーザーサービス互換レイヤー
 */
const UserCompat = {
    /**
     * ユーザー取得（ID）
     */
    async getUserById(userId) {
        const isNew = await checkSchemaVersion();

        if (isNew) {
            return UnifiedUserService.getUserById(userId);
        } else {
            const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
            if (users.length === 0) {
                return { success: false, message: 'ユーザーが見つかりません' };
            }
            return { success: true, data: users[0] };
        }
    },

    /**
     * 学生取得（student_id）
     * 旧: students テーブルから
     * 新: users テーブルから（identifier = student_id）
     */
    async getStudentByStudentId(studentId, organizationId = null) {
        const isNew = await checkSchemaVersion();

        if (isNew) {
            const orgId = organizationId || await getDefaultOrganizationId();
            return UnifiedUserService.getUserByIdentifier(orgId, studentId);
        } else {
            // 旧スキーマ: まず users を確認、なければ students
            let users = await query(
                'SELECT * FROM users WHERE student_id = ?',
                [studentId]
            );

            if (users.length === 0) {
                users = await query(
                    'SELECT student_id as identifier, name, email, phone, grade, class_name FROM students WHERE student_id = ?',
                    [studentId]
                );
            }

            if (users.length === 0) {
                return { success: false, message: '学生が見つかりません' };
            }

            return { success: true, data: users[0] };
        }
    },

    /**
     * 学生一覧取得
     */
    async getStudents(organizationId = null, options = {}) {
        const isNew = await checkSchemaVersion();

        if (isNew) {
            const orgId = organizationId || await getDefaultOrganizationId();
            return UnifiedUserService.getStudents(orgId, options);
        } else {
            // 旧スキーマ
            const students = await query(
                `SELECT student_id as identifier, name, email, phone, grade, class_name, status 
         FROM students WHERE status = 'active' ORDER BY name`
            );
            return {
                success: true,
                data: { users: students, total: students.length }
            };
        }
    },

    /**
     * ユーザー作成
     */
    async createUser(data) {
        const isNew = await checkSchemaVersion();

        if (isNew) {
            return UnifiedUserService.createUser(data);
        } else {
            // 旧スキーマでは role によって処理を分ける
            if (data.role === 'student') {
                // students テーブルに挿入
                const result = await query(
                    `INSERT INTO students (student_id, name, email, phone, grade, class_name)
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [data.identifier, data.name, data.email, data.phone, data.grade, data.class_name]
                );
                return { success: true, data: { id: result.insertId } };
            } else {
                // users テーブルに挿入
                const bcrypt = require('bcrypt');
                const hashedPassword = await bcrypt.hash(data.password, 10);
                const result = await query(
                    `INSERT INTO users (name, email, password, role, employee_id)
           VALUES (?, ?, ?, ?, ?)`,
                    [data.name, data.email, hashedPassword, data.role, data.identifier]
                );
                return { success: true, data: { id: result.insertId } };
            }
        }
    }
};

/**
 * ヘルパー関数
 */
async function getOrganizationIdForUser(userId) {
    try {
        const isNew = await checkSchemaVersion();

        if (isNew) {
            const result = await query(
                'SELECT organization_id FROM users WHERE id = ?',
                [userId]
            );
            return result[0]?.organization_id || await getDefaultOrganizationId();
        } else {
            return await getDefaultOrganizationId();
        }
    } catch (error) {
        return await getDefaultOrganizationId();
    }
}

async function getDefaultOrganizationId() {
    try {
        const isNew = await checkSchemaVersion();
        const tableName = isNew ? 'organizations' : 'organizations';

        const result = await query(`SELECT id FROM ${tableName} LIMIT 1`);
        return result[0]?.id || 1;
    } catch (error) {
        return 1;
    }
}

/**
 * スキーマバージョンのリセット（テスト用）
 */
function resetSchemaCache() {
    useNewSchema = null;
}

module.exports = {
    AttendanceCompat,
    UserCompat,
    checkSchemaVersion,
    getOrganizationIdForUser,
    getDefaultOrganizationId,
    resetSchemaCache
};
