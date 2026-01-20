const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// ▼▼▼ 修正: 共通の秘密鍵を定義（ここが全ての基準です） ▼▼▼
const SECRET_KEY = 'your_jwt_secret_key_change_in_production';

class JWTUtil {
  static generateToken(payload) {
    try {
      const expiresIn = process.env.JWT_EXPIRES_IN
        ? parseInt(process.env.JWT_EXPIRES_IN, 10)
        : 604800;

      // ▼▼▼ 追加: ここで「実際に使う鍵」をコンソールに表示！ ▼▼▼
      console.log("🔑 [DEBUG] 出席アプリが署名に使う鍵:", SECRET_KEY); 
      // ▲▲▲ 追加ここまで ▲▲▲

      const token = jwt.sign(
        payload,
        SECRET_KEY, 
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

  // ... (verifyTokenなどはそのままでOK) ...
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, SECRET_KEY, {
        issuer: 'attendance-app',
        audience: 'attendance-app-client'
      });
      return decoded;
    } catch (error) {
      // 省略
      throw error;
    }
  }
  
  // ... (getTokenFromHeaderなどはそのままでOK) ...
  static getTokenFromHeader(req) {
      // 省略
      const authHeader = req.headers.authorization;
      if (!authHeader) return null;
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
      return parts[1];
  }

  static isTokenExpired(token) {
      // 省略
      try {
          const decoded = jwt.decode(token);
          if (!decoded || !decoded.exp) return true;
          const currentTime = Math.floor(Date.now() / 1000);
          return decoded.exp < currentTime;
      } catch (error) { return true; }
  }
}

module.exports = JWTUtil;