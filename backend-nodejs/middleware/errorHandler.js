const logger = require('../utils/logger');

/**
 * [完全版] エラーハンドラーミドルウェア
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 構造化されたエラーログ
  const errorLog = {
    message: err.message,
    stack: err.stack,
    code: err.code,
    name: err.name,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null,
    timestamp: new Date().toISOString()
  };

  logger.error('エラーが発生しました', errorLog);

  // MySQLエラー
  if (err.code === 'ER_DUP_ENTRY') {
    const message = '重複したデータが存在します';
    error = { message, statusCode: 400, code: 'DUPLICATE_ENTRY' };
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    const message = 'データベース接続エラー';
    error = { message, statusCode: 500, code: 'DB_CONNECTION_ERROR' };
  }
  if (err.code === 'ETIMEDOUT') {
    const message = 'データベース接続がタイムアウトしました';
    error = { message, statusCode: 500, code: 'DB_TIMEOUT' };
  }

  // JWTエラー
  if (err.name === 'JsonWebTokenError') {
    const message = '無効なトークンです';
    error = { message, statusCode: 401, code: 'INVALID_TOKEN' };
  }
  if (err.name === 'TokenExpiredError') {
    const message = 'トークンの有効期限が切れています';
    error = { message, statusCode: 401, code: 'TOKEN_EXPIRED' };
  }

  // バリデーションエラー
  if (err.name === 'ValidationError' || Array.isArray(err.errors)) {
    const message = err.errors?.map(e => e.msg || e.message).join(', ') || '入力データにエラーがあります';
    error = { message, statusCode: 400, code: 'VALIDATION_ERROR', errors: err.errors };
  }
  
  // 権限エラー
  if (err.message && err.message.includes('権限')) {
    error = { message: err.message, statusCode: 403, code: 'FORBIDDEN' };
  }

  // デフォルトエラー
  const statusCode = error.statusCode || 500;
  const message = error.message || 'サーバーエラーが発生しました';
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';

  // 本番環境では詳細なスタックトレースを隠す
  const stackTrace = process.env.NODE_ENV === 'production' ? null : err.stack;

  res.status(statusCode).json({
    success: false,
    message,
    code: errorCode,
    stack: stackTrace, // 開発環境でのみ表示
    errors: error.errors || null // バリデーションエラーの詳細
  });
};

// [重要] 関数をそのままエクスポート
module.exports = errorHandler;