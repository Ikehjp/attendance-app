const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * システム設定サービス
 */
class SettingsService {
  /**
   * 設定一覧の取得
   */
  static async getSettings(options = {}) {
    try {
      const { is_public, setting_key } = options;
      
      let sql = `
        SELECT setting_key, setting_value, setting_type, description, is_public, created_at, updated_at
        FROM system_settings
        WHERE 1=1
      `;
      const params = [];

      if (is_public !== undefined && is_public !== null) {
        sql += ' AND is_public = ?';
        params.push(Boolean(is_public));
      }

      if (setting_key) {
        sql += ' AND setting_key = ?';
        params.push(setting_key);
      }

      sql += ' ORDER BY setting_key ASC';

      const settings = await query(sql, params);

      // 型変換
      const formattedSettings = settings.map(setting => {
        let value = setting.setting_value;
        
        // 型に応じて値を変換
        if (setting.setting_type === 'number') {
          value = Number(value);
        } else if (setting.setting_type === 'boolean') {
          value = value === 'true' || value === '1';
        } else if (setting.setting_type === 'json') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = value;
          }
        }

        return {
          key: setting.setting_key,
          value: value,
          type: setting.setting_type,
          description: setting.description,
          isPublic: Boolean(setting.is_public),
          createdAt: setting.created_at,
          updatedAt: setting.updated_at
        };
      });

      return {
        success: true,
        data: {
          settings: formattedSettings,
          total: formattedSettings.length
        }
      };
    } catch (error) {
      logger.error('設定一覧取得エラー:', error.message);
      return {
        success: false,
        message: '設定一覧の取得に失敗しました'
      };
    }
  }

  /**
   * 特定設定の取得
   */
  static async getSetting(key, role = 'employee') {
    try {
      const settings = await query(
        'SELECT setting_key, setting_value, setting_type, description, is_public, created_at, updated_at FROM system_settings WHERE setting_key = ?',
        [key]
      );

      if (settings.length === 0) {
        return {
          success: false,
          message: '設定が見つかりません'
        };
      }

      const setting = settings[0];

      // 一般ユーザーは公開設定のみ取得可能
      if (role !== 'admin' && !setting.is_public) {
        return {
          success: false,
          message: 'この設定へのアクセス権限がありません'
        };
      }

      let value = setting.setting_value;
      
      // 型に応じて値を変換
      if (setting.setting_type === 'number') {
        value = Number(value);
      } else if (setting.setting_type === 'boolean') {
        value = value === 'true' || value === '1';
      } else if (setting.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = value;
        }
      }

      return {
        success: true,
        data: {
          setting: {
            key: setting.setting_key,
            value: value,
            type: setting.setting_type,
            description: setting.description,
            isPublic: Boolean(setting.is_public),
            createdAt: setting.created_at,
            updatedAt: setting.updated_at
          }
        }
      };
    } catch (error) {
      logger.error('設定取得エラー:', error.message);
      return {
        success: false,
        message: '設定の取得に失敗しました'
      };
    }
  }

  /**
   * 設定の作成・更新
   */
  static async createOrUpdateSetting(data) {
    try {
      const { setting_key, setting_value, setting_type = 'string', description, is_public = false } = data;

      if (!setting_key) {
        return {
          success: false,
          message: '設定キーが必要です'
        };
      }

      // 既存設定の確認
      const existing = await query(
        'SELECT setting_key FROM system_settings WHERE setting_key = ?',
        [setting_key]
      );

      let value = setting_value;
      
      // 型に応じて値を文字列に変換
      if (setting_type === 'json') {
        value = JSON.stringify(value);
      } else if (setting_type === 'boolean') {
        value = value ? 'true' : 'false';
      } else if (setting_type === 'number') {
        value = String(value);
      } else {
        value = String(value || '');
      }

      if (existing.length > 0) {
        // 更新
        await query(
          'UPDATE system_settings SET setting_value = ?, setting_type = ?, description = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
          [value, setting_type, description || null, Boolean(is_public), setting_key]
        );
      } else {
        // 作成
        await query(
          'INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES (?, ?, ?, ?, ?)',
          [setting_key, value, setting_type, description || null, Boolean(is_public)]
        );
      }

      logger.info('設定を保存しました', { key: setting_key });
      
      return {
        success: true,
        message: '設定が保存されました',
        data: {
          key: setting_key,
          value: setting_value,
          type: setting_type
        }
      };
    } catch (error) {
      logger.error('設定保存エラー:', error.message);
      return {
        success: false,
        message: '設定の保存に失敗しました'
      };
    }
  }

  /**
   * 設定の更新
   */
  static async updateSetting(key, data) {
    try {
      const { setting_value, setting_type, description, is_public } = data;

      // 設定の存在確認
      const existing = await query(
        'SELECT setting_key FROM system_settings WHERE setting_key = ?',
        [key]
      );

      if (existing.length === 0) {
        return {
          success: false,
          message: '設定が見つかりません'
        };
      }

      const updateFields = [];
      const updateValues = [];

      if (setting_value !== undefined) {
        let value = setting_value;
        
        // 型に応じて値を文字列に変換
        const currentType = setting_type || existing[0].setting_type;
        if (currentType === 'json') {
          value = JSON.stringify(value);
        } else if (currentType === 'boolean') {
          value = value ? 'true' : 'false';
        } else if (currentType === 'number') {
          value = String(value);
        } else {
          value = String(value);
        }
        
        updateFields.push('setting_value = ?');
        updateValues.push(value);
      }

      if (setting_type !== undefined) {
        updateFields.push('setting_type = ?');
        updateValues.push(setting_type);
      }

      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description || null);
      }

      if (is_public !== undefined) {
        updateFields.push('is_public = ?');
        updateValues.push(Boolean(is_public));
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          message: '更新するデータがありません'
        };
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(key);

      await query(
        `UPDATE system_settings SET ${updateFields.join(', ')} WHERE setting_key = ?`,
        updateValues
      );

      logger.info('設定を更新しました', { key });
      
      return {
        success: true,
        message: '設定が更新されました'
      };
    } catch (error) {
      logger.error('設定更新エラー:', error.message);
      return {
        success: false,
        message: '設定の更新に失敗しました'
      };
    }
  }

  /**
   * 設定の削除
   */
  static async deleteSetting(key) {
    try {
      // 設定の存在確認
      const existing = await query(
        'SELECT setting_key FROM system_settings WHERE setting_key = ?',
        [key]
      );

      if (existing.length === 0) {
        return {
          success: false,
          message: '設定が見つかりません'
        };
      }

      await query(
        'DELETE FROM system_settings WHERE setting_key = ?',
        [key]
      );

      logger.info('設定を削除しました', { key });
      
      return {
        success: true,
        message: '設定が削除されました'
      };
    } catch (error) {
      logger.error('設定削除エラー:', error.message);
      return {
        success: false,
        message: '設定の削除に失敗しました'
      };
    }
  }
}

module.exports = SettingsService;
