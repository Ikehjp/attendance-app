const winston = require('winston');
const path = require('path');

// ログフォーマット
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// コンソールフォーマット
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      // [修正] メタ情報がオブジェクトの場合の対応
      try {
        metaStr = ' ' + JSON.stringify(meta);
      } catch (e) {
         metaStr = ' [Meta serialization error]';
      }
    }
    // [修正] message がオブジェクトの場合も考慮
    const msg = (typeof message === 'object') ? JSON.stringify(message) : message;
    return `${timestamp} [${level}]: ${msg}${metaStr}`;
  })
);

// ロガー設定
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
const maxSize = parseInt(process.env.LOG_MAX_SIZE) || (isProduction ? 10485760 : 5242880);
const maxFiles = parseInt(process.env.LOG_MAX_FILES) || (isProduction ? 10 : 5);

// --- [修正] コンソールトランスポートを定義 ---
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: logLevel
});

const transports = [
  // [修正] 環境（NODE_ENV）に関わらず、常にコンソールに出力
  consoleTransport
];
    
// エラーログファイル
transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'error.log'),
      level: 'error',
      maxsize: maxSize,
      maxFiles: maxFiles,
      format: logFormat
  })
);
    
// 全ログファイル
transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log'),
      maxsize: maxSize,
      maxFiles: maxFiles,
      format: logFormat
  })
);

if (isProduction) {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'info.log'),
      level: 'info',
      maxsize: maxSize,
      maxFiles: maxFiles,
      format: logFormat
    })
  );
}

const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { 
    service: 'attendance-app-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: transports,
  
  // --- [修正] 例外とリジェクトをコンソールにも出力 ---
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'exceptions.log'),
      maxsize: maxSize,
      maxFiles: maxFiles,
      format: logFormat
    }),
    consoleTransport // [追加] 例外をコンソールにも出力
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'rejections.log'),
      maxsize: maxSize,
      maxFiles: maxFiles,
      format: logFormat
    }),
    consoleTransport // [追加] リジェクトをコンソールにも出力
  ],
  
  exitOnError: false // [修正] exitOnError: !isProduction は非推奨のため false に固定
});

module.exports = logger;