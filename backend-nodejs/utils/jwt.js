const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * JWT認証ユーティリティ
 */
class JWTUtil {
  /**
   * JWTトークンを生成
   */
  static generateToken(payload) {
    try {
      // JWT_EXPIRES_INを数値に変換（デフォルトは7日間 = 604800秒）
      const expiresIn = process.env.JWT_EXPIRES_IN
        ? parseInt(process.env.JWT_EXPIRES_IN, 10)
        : 604800;

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
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

  /**
   * JWTトークンを検証・デコード
   */
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'attendance-app',
        audience: 'attendance-app-client'
      });

      logger.debug('JWTトークンを検証しました', { userId: decoded.id });
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('JWTトークンの有効期限が切れています');
        throw new Error('トークンの有効期限が切れています');
      } else if (error.name === 'JsonWebTokenError') {
        logger.warn('無効なJWTトークンです');
        throw new Error('無効なトークンです');
      } else {
        logger.error('JWTトークン検証エラー:', error.message);
        throw new Error('トークンの検証に失敗しました');
      }
    }
  }

  /**
   * リクエストヘッダーからトークンを取得
   */
  static getTokenFromHeader(req) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * トークンの有効期限をチェック
   */
  static isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * トークンからペイロードを取得（検証なし）
   */
  static decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('JWTトークンデコードエラー:', error.message);
      return null;
    }
  }
}

module.exports = JWTUtil;
