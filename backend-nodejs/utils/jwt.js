const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// JWT秘密鍵のバリデーション
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  const errorMsg = '❌ CRITICAL: JWT_SECRET environment variable is not set. Please configure it in your .env file.';
  console.error(errorMsg);
  throw new Error('JWT_SECRET is required for security. Application cannot start without it.');
}

// 本番環境では秘密鍵をログに出力しない
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  logger.debug('JWT configuration loaded', { secretLength: JWT_SECRET.length });
}

class JWTUtil {
  static generateToken(payload) {
    try {
      const expiresIn = process.env.JWT_EXPIRES_IN
        ? parseInt(process.env.JWT_EXPIRES_IN, 10)
        : 604800; // 7 days in seconds

      const token = jwt.sign(
        payload,
        JWT_SECRET,
        {
          expiresIn: expiresIn,
          issuer: 'attendance-app',
          audience: 'attendance-app-client'
        }
      );

      logger.debug('JWTトークンを生成しました', { userId: payload.id, expiresIn });
      return token;
    } catch (error) {
      logger.error('JWTトークン生成エラー:', error.message);
      throw new Error('トークンの生成に失敗しました');
    }
  }

  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'attendance-app',
        audience: 'attendance-app-client'
      });
      return decoded;
    } catch (error) {
      logger.warn('トークン検証失敗:', error.message);
      throw error;
    }
  }

  static getTokenFromHeader(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
  }

  static isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }
}

module.exports = JWTUtil;