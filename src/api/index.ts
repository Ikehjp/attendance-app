/**
 * API通信層のエントリーポイント
 * すべてのAPIクライアントをここから一元管理
 */

export { attendanceApi, checkServerHealth } from './attendanceApi';
export { organizationApi } from './organizationApi';
export { groupApi } from './groupApi';
export { absenceRequestApi } from './absenceRequestApi';
export { timetableApi } from './timetableApi';
export { securityApi } from './securityApi';
export { notificationApi } from './notificationApi';
export { subjectApi } from './subjectApi';

// デフォルトエクスポート（後方互換性のため）
import { attendanceApi } from './attendanceApi';
export default attendanceApi;
