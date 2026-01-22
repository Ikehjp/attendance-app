const db = require('../config/database');

class IcRegistrationService {
    constructor() {
        this.currentSession = null;
        this.SESSION_TIMEOUT_MS = 30000; // 30秒制限
    }

    // 1. 登録モード開始
    startRegistration(userId) {
        const now = Date.now();
        // 既存のセッションがあり、まだ有効期限内かチェック
        if (this.currentSession && this.currentSession.expiresAt > now) {
            // 同じユーザーが再試行した場合はOK
            if (this.currentSession.userId === userId) {
                return { success: true, message: "登録モードを継続します" };
            }
            // 他のユーザーが操作中の場合
            return { success: false, message: "他ユーザーが作業中です" };
        }
        
        // 新しいセッションを開始
        this.currentSession = {
            userId: userId,
            status: 'waiting',
            scannedIdm: null,
            expiresAt: now + this.SESSION_TIMEOUT_MS
        };
        console.log(`[IC登録] User ${userId} 待機開始`);
        return { success: true };
    }

    // 2. ラズパイからの通知処理（メインロジック）
    async handleScannedCard(idm) {
        const now = Date.now();

        // --- A. 登録モード中の場合（紐づけ処理） ---
        if (this.currentSession && this.currentSession.expiresAt > now && this.currentSession.status === 'waiting') {
            const existing = await db.query('SELECT id, name FROM users WHERE felica_idm = ?', [idm]);
            if (existing && existing.length > 0) {
                 return { type: 'error', message: '既に使用されているカードです' };
            }
            this.currentSession.scannedIdm = idm;
            this.currentSession.status = 'scanned';
            return { type: 'registration', message: '登録用IDとして保持しました' };
        }

        // --- B. 通常モード（出席処理） ---
        try {
            // 1. カードIDからユーザーを探す
            const users = await db.query('SELECT id, name FROM users WHERE felica_idm = ?', [idm]);

            if (!users || users.length === 0) {
                console.log(`[出席失敗] 未登録のカード: ${idm}`);
                return { type: 'error', message: '未登録のカードです' };
            }
            const user = users[0];

            // ▼▼▼ 追加: 今日の出席データが既にあるかチェック ▼▼▼
            const todayRecords = await db.query(
                'SELECT id FROM user_attendance_records WHERE user_id = ? AND date = CURDATE()',
                [user.id]
            );

            if (todayRecords && todayRecords.length > 0) {
                // 既にデータがある場合は、何もしない（またはメッセージだけ返す）
                console.log(`[出席済み] ${user.name}さんは既にタッチ済み`);
                return { type: 'attendance', message: `${user.name}さん 既に出席済みです` };
            }
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            // 2. 出席テーブルに記録する
            await db.query(
                'INSERT INTO user_attendance_records (user_id, date, status, created_at, updated_at) VALUES (?, CURDATE(), ?, NOW(), NOW())',
                [user.id, 'present'] // statusは 'present'（出席）として記録
            );

            console.log(`[出席成功] ${user.name}さんがタッチしました`);
            return { type: 'attendance', message: `${user.name}さん おはようございます` };

        } catch (error) {
            console.error("[DB Error Detail]", error);
            
            // カラム名違いのエラーだった場合のヒント
            if (error.code === 'ER_BAD_FIELD_ERROR') {
                return { type: 'error', message: 'DBエラー: カラム名が一致しません' };
            }
            if (error.code === 'ER_NO_SUCH_TABLE') {
                return { type: 'error', message: 'DBエラー: テーブルが見つかりません' };
            }

            return { type: 'error', message: 'サーバーエラー（出席保存失敗）' };
        }
    }

    // 3. 状態確認
    getSessionStatus(userId) {
        const now = Date.now();
        if (!this.currentSession || this.currentSession.expiresAt < now || this.currentSession.userId !== userId) {
            return { status: 'idle', scannedIdm: null };
        }
        return { 
            status: this.currentSession.status, 
            scannedIdm: this.currentSession.scannedIdm, 
            expiresAt: this.currentSession.expiresAt
        };
    }

    // 4. 登録確定
    async confirmRegistration(userId) {
        if (!this.currentSession || this.currentSession.userId !== userId || !this.currentSession.scannedIdm) {
            throw new Error("セッションが無効です");
        }
        const idm = this.currentSession.scannedIdm;
        // DB更新
        await db.query('UPDATE users SET felica_idm = ? WHERE id = ?', [idm, userId]);
        
        this.currentSession = null;
        return { success: true, idm: idm };
    }
}
module.exports = new IcRegistrationService();