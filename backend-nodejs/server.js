require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { testConnection } = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { query } = require('./config/database');

const LOG_FILE = path.join(__dirname, 'server-start.log');
fs.writeFileSync(LOG_FILE, `起動開始: ${new Date().toISOString()}\n`);

function log(msg) {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

function errorLog(msg, err) {
  console.error(msg, err);
  fs.appendFileSync(LOG_FILE, `ERROR: ${msg}\n${err.message}\n${err.stack}\n`);
}

// ▼▼▼ 自動退勤バッチ（毎日 23:59 に実行） ▼▼▼
cron.schedule('59 23 * * *', async () => {
  console.log('🕒 [自動退勤] バッチ処理を開始します...');
  try {
    // 条件: 「今日の日付」で、「退勤時刻が入っていない（またはstatusが出席のまま）」のレコードを更新
    // ここでは status が 'present' のものを 'auto_left' (自動退勤) に変更する例です
    
    const result = await query(
      `UPDATE user_attendance_records 
       SET status = 'auto_left', updated_at = NOW() 
       WHERE date = CURDATE() AND status = 'present'`
    );
    
    console.log(`✅ [自動退勤] ${result.affectedRows} 件のデータを自動退勤扱いにしました`);
  } catch (error) {
    console.error('❌ [自動退勤] エラーが発生しました', error);
  }
});

log('========================================');
log('サーバー起動開始...');
log('========================================\n');

// ルートのインポート（エラーハンドリング付き）
function loadRoute(routeName, routePath) {
  try {
    log(`✓ ルート読み込み: ${routeName} (${routePath})`);
    const route = require(routePath);

    // ExpressのRouter/Middlewareは関数であるはず
    if (typeof route !== 'function') {
      const type = typeof route;
      const msg = `ルート読み込みエラー: ${routeName} (${routePath}) は関数(Router)をエクスポートしていません。現在の型: ${type}`;
      // オブジェクトの場合は内容もログに出す（循環参照の場合は空オブジェクト {} になることが多い）
      if (type === 'object') {
        log(`  内容: ${JSON.stringify(route)}`);
      }
      throw new Error(msg);
    }
    return route;
  } catch (error) {
    errorLog(`✗ ルート読み込み失敗: ${routeName}`, error);
    throw error;
  }
}

try {
  // ▼▼▼ ここでルートを読み込みます ▼▼▼
  const authRoutes = loadRoute('Auth', './routes/auth');
  const userRoutes = loadRoute('User', './routes/users');
  const attendanceRoutes = loadRoute('Attendance', './routes/attendance');
  const studentRoutes = loadRoute('Student', './routes/students');
  const studentAttendanceRoutes = loadRoute('Student Attendance', './routes/student-attendance');
  const classRoutes = loadRoute('Class', './routes/classes');
  const subjectRoutes = loadRoute('Subject', './routes/subjects');
  const groupRoutes = loadRoute('Group', './routes/groups');
  const qrRoutes = loadRoute('QR', './routes/qr');
  const eventRoutes = loadRoute('Event', './routes/events');
  const reportRoutes = loadRoute('Report', './routes/reports');
  const notificationRoutes = loadRoute('Notification', './routes/notifications');
  const settingsRoutes = loadRoute('Settings', './routes/settings');
  const exportRoutes = loadRoute('Export', './routes/export');
  const organizationRoutes = loadRoute('Organization', './routes/organizations');
  const securityRoutes = loadRoute('Security', './routes/security');
  const absenceRequestRoutes = loadRoute('Absence Request', './routes/absence-requests');
  const approvalRoutes = loadRoute('Approval', './routes/approvals');
  const timetableRoutes = loadRoute('Timetable', './routes/timetables');
  const attendanceStatsRoutes = loadRoute('Attendance Stats', './routes/attendance-stats');
  const invitationRoutes = loadRoute('Invitation', './routes/invitations');
  const attendanceV2Routes = loadRoute('Attendance V2', './routes/attendance-v2');
  const adminRoutes = loadRoute('Admin', './routes/admin');
  const ipSettingsRoutes = loadRoute('IP Settings', './routes/ip-settings');
  
  // ★ここに移動しました★
  const icCardRoutes = loadRoute('IC Card', './routes/ic-card');

  log('\n✅ 全ルートの読み込み完了\n');

  // デバッグ: ルートオブジェクトの型を確認
  log(`Debug: authRoutes is ${typeof authRoutes}`);
  log(`Debug: adminRoutes is ${typeof adminRoutes}`);
  log(`Debug: ipSettingsRoutes is ${typeof ipSettingsRoutes}`);


  // Swaggerのセットアップ
  // const { swaggerUi, specs } = require('./config/swagger');

  const app = express();
  const PORT = process.env.PORT || 3001;

  // --- セキュリティとミドルウェア ---
  app.use(helmet());

  // プロキシ経由のリクエストを信頼（X-Forwarded-For対応）
  app.set('trust proxy', 1);

  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://192.168.12.120:3000',
      process.env.CORS_ORIGIN
    ].filter(Boolean),
    credentials: true,
    optionsSuccessStatus: 200
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // 基本的なレート制限
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 1000, // 1IPあたり1000リクエストに緩和
    message: { success: false, message: 'リクエストが多すぎます。15分後に再試行してください。' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false } // 検証を無効化
  });
  app.use('/api/', apiLimiter);

  // --- Swagger UI ---
  // app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

  // --- ルーティング ---
  app.use('/api/auth', authRoutes);
  
  // ★ここに移動しました★
  app.use('/api/ic-card', icCardRoutes);

  app.use('/api/users', userRoutes);
  app.use('/api/attendance', attendanceStatsRoutes); // 統計エンドポイント
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/student-attendance', studentAttendanceRoutes);
  app.use('/api/classes', classRoutes);
  app.use('/api/subjects', subjectRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/qr', qrRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/export', exportRoutes);
  // 新規追加: 統合型システム用のエンドポイント
  app.use('/api/organizations', organizationRoutes);
  app.use('/api/security', securityRoutes);
  app.use('/api/absence-requests', absenceRequestRoutes);
  app.use('/api/approvals', approvalRoutes);
  app.use('/api/timetables', timetableRoutes);
  app.use('/api/invitations', invitationRoutes);
  // V2 API (新スキーマ対応)
  app.use('/api/v2/attendance', attendanceV2Routes);
  // 管理者用API
  app.use('/api/admin', adminRoutes);
  app.use('/api/ip-settings', ipSettingsRoutes);


  // --- 404ハンドラ ---
  app.use((req, res, next) => {
    logger.warn('404エラー - エンドポイントが見つかりません', {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(404).json({ success: false, message: 'エンドポイントが見つかりません' });
  });

  // --- グローバルエラーハンドラ ---
  app.use(errorHandler);

  // ▼▼▼ 自動退勤バッチ（毎日 23:59 に実行） ▼▼▼
cron.schedule('59 23 * * *', async () => {
  console.log('🕒 [自動退勤] バッチ処理を開始します...');
  try {
    // 条件: 「今日の日付」で、「退勤時刻が入っていない（またはstatusが出席のまま）」のレコードを更新
    // ここでは status が 'present' のものを 'auto_left' (自動退勤) に変更する例です
    
    const result = await query(
      `UPDATE user_attendance_records 
       SET status = 'auto_left', updated_at = NOW() 
       WHERE date = CURDATE() AND status = 'present'`
    );
    
    console.log(`✅ [自動退勤] ${result.affectedRows} 件のデータを自動退勤扱いにしました`);
  } catch (error) {
    console.error('❌ [自動退勤] エラーが発生しました', error);
  }
});
  
  // --- サーバー起動 ---
  const startServer = async () => {
    try {
      // データベース接続テスト
      log('データベース接続テスト中...');
      await testConnection();
      log('✅ データベース接続成功\n');

      app.listen(PORT, () => {
        log('========================================');
        log(`🚀 サーバーが起動しました`);
        log(`   URL: http://localhost:${PORT}`);
        log(`   環境: ${process.env.NODE_ENV || 'development'}`);
        log('========================================\n');

        logger.info(`サーバーが起動しました: http://localhost:${PORT}`, {
          service: "attendance-app-backend",
          environment: process.env.NODE_ENV || 'development'
        });
      });
    } catch (error) {
      errorLog('サーバー起動に失敗しました', error);
      process.exit(1);
    }
  };

  // テスト環境でない場合のみサーバーを起動
  if (process.env.NODE_ENV !== 'test') {
    startServer();
  }

  module.exports = app;

} catch (err) {
  errorLog('初期化中に致命的なエラーが発生しました', err);
  process.exit(1);
}