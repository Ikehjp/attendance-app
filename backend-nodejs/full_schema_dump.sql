-- Database Schema Dump
-- Generated at: 2025-12-02T04:57:12.582Z

SET FOREIGN_KEY_CHECKS = 0;

-- Table structure for table `absence_requests`
DROP TABLE IF EXISTS `absence_requests`;
CREATE TABLE `absence_requests` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '逕ｳ隲紀D',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '蟄ｦ逕櫑D',
  `class_session_id` int DEFAULT NULL COMMENT '謗域･ｭ繧ｻ繝?す繝ｧ繝ｳID?育音螳壽肢讌ｭ縺ｮ蝣ｴ蜷茨ｼ',
  `request_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '申請種別',
  `request_date` date NOT NULL COMMENT '逕ｳ隲句ｯｾ雎｡譌･',
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '逅?罰',
  `attachment_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '豺ｻ莉倥ヵ繧｡繧､繝ｫURL',
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '繧ｹ繝??繧ｿ繧ｹ',
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '謠仙?譌･譎',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '譖ｴ譁ｰ譌･譎',
  PRIMARY KEY (`id`),
  KEY `class_session_id` (`class_session_id`),
  KEY `idx_student` (`student_id`),
  KEY `idx_status` (`status`),
  KEY `idx_request_date` (`request_date`),
  KEY `idx_request_type` (`request_type`),
  CONSTRAINT `absence_requests_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `absence_requests_ibfk_2` FOREIGN KEY (`class_session_id`) REFERENCES `class_sessions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='谺?蟶ｭ繝ｻ驕?綾螻顔筏隲九ユ繝ｼ繝悶Ν';

-- Table structure for table `allowed_ip_ranges`
DROP TABLE IF EXISTS `allowed_ip_ranges`;
CREATE TABLE `allowed_ip_ranges` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'IP遽?峇ID',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'IP遽?峇蜷搾ｼ亥ｭｦ譬｡Wi-Fi縲∵悽遉ｾ繝阪ャ繝医Ρ繝ｼ繧ｯ縺ｪ縺ｩ?',
  `ip_start` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '髢句ｧ紀P繧｢繝峨Ξ繧ｹ??Pv4/IPv6蟇ｾ蠢懶ｼ',
  `ip_end` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邨ゆｺ?P繧｢繝峨Ξ繧ｹ??Pv4/IPv6蟇ｾ蠢懶ｼ',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '隱ｬ譏',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '譛牙柑繝輔Λ繧ｰ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '菴懈?譌･譎',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '譖ｴ譁ｰ譌･譎',
  PRIMARY KEY (`id`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='險ｱ蜿ｯIP繧｢繝峨Ξ繧ｹ遽?峇繝??繝悶Ν';

-- Table structure for table `audit_logs`
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ログID',
  `user_id` int DEFAULT NULL COMMENT '操作したユーザーのID (システムによる操作はNULL)',
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作種別 (CREATE, UPDATE, DELETE, LOGINなど)',
  `table_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '対象テーブル名',
  `record_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '対象レコードID',
  `old_values` json DEFAULT NULL COMMENT '変更前の値',
  `new_values` json DEFAULT NULL COMMENT '変更後の値',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IPアドレス',
  `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT 'ユーザーエージェント',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作日時',
  PRIMARY KEY (`id`),
  KEY `idx_user_action` (`user_id`,`action`),
  KEY `idx_table_record` (`table_name`,`record_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='監査ログテーブル';

-- Table structure for table `class_sessions`
DROP TABLE IF EXISTS `class_sessions`;
CREATE TABLE `class_sessions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '謗域･ｭ繧ｻ繝?す繝ｧ繝ｳID',
  `timetable_id` int NOT NULL COMMENT '譎る俣蜑ｲID',
  `subject_id` int NOT NULL COMMENT '遘醍岼ID',
  `class_date` date NOT NULL COMMENT '謗域･ｭ譌･',
  `period_number` int NOT NULL COMMENT '譎る剞??1髯舌??2髯舌↑縺ｩ?',
  `start_time` time NOT NULL COMMENT '髢句ｧ区凾蛻ｻ',
  `end_time` time NOT NULL COMMENT '邨ゆｺ?凾蛻ｻ',
  `room` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '謨吝ｮ､',
  `teacher_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '諡?ｽ捺蕗蜩｡蜷',
  `is_cancelled` tinyint(1) DEFAULT '0' COMMENT '莨題ｬ帙ヵ繝ｩ繧ｰ',
  `cancellation_reason` text COLLATE utf8mb4_unicode_ci COMMENT '莨題ｬ帷炊逕ｱ',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT '蛯呵?',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '菴懈?譌･譎',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '譖ｴ譁ｰ譌･譎',
  PRIMARY KEY (`id`),
  KEY `subject_id` (`subject_id`),
  KEY `idx_timetable` (`timetable_id`),
  KEY `idx_class_date` (`class_date`),
  KEY `idx_period` (`period_number`),
  KEY `idx_is_cancelled` (`is_cancelled`),
  CONSTRAINT `class_sessions_ibfk_1` FOREIGN KEY (`timetable_id`) REFERENCES `timetables` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_sessions_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='謗域･ｭ繧ｻ繝?す繝ｧ繝ｳ繝??繝悶Ν?亥?句挨縺ｮ謗域･ｭ蝗橸ｼ';

-- Table structure for table `classes`
DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '授業ID',
  `class_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '授業コード',
  `subject_id` int NOT NULL COMMENT '科目ID',
  `teacher_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '担当教員名',
  `room` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '教室',
  `schedule_day` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '曜日',
  `start_time` time NOT NULL COMMENT '開始時間',
  `end_time` time NOT NULL COMMENT '終了時間',
  `semester` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '学期',
  `academic_year` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '年度',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '有効フラグ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_code` (`class_code`),
  KEY `subject_id` (`subject_id`),
  KEY `idx_class_code` (`class_code`),
  KEY `idx_schedule` (`schedule_day`,`start_time`),
  KEY `idx_semester_year` (`semester`,`academic_year`),
  CONSTRAINT `classes_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授業管理テーブル';

-- Table structure for table `detailed_attendance_records`
DROP TABLE IF EXISTS `detailed_attendance_records`;
CREATE TABLE `detailed_attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '記録ID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生ID',
  `class_id` int NOT NULL COMMENT '授業ID',
  `attendance_date` date NOT NULL COMMENT '出欠日',
  `status` enum('present','absent','late','excused') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '出欠状態',
  `check_in_time` datetime DEFAULT NULL COMMENT '出席時刻',
  `check_out_time` datetime DEFAULT NULL COMMENT '退席時刻',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT '備考',
  `created_by` int DEFAULT NULL COMMENT '記録者ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_class_date` (`student_id`,`class_id`,`attendance_date`),
  KEY `created_by` (`created_by`),
  KEY `idx_student_attendance` (`student_id`,`attendance_date`),
  KEY `idx_class_attendance` (`class_id`,`attendance_date`),
  KEY `idx_attendance_date` (`attendance_date`),
  CONSTRAINT `detailed_attendance_records_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `detailed_attendance_records_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detailed_attendance_records_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='詳細な出欠記録テーブル（科目別）';

-- Table structure for table `enrollments`
DROP TABLE IF EXISTS `enrollments`;
CREATE TABLE `enrollments` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '登録ID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生ID',
  `class_id` int NOT NULL COMMENT '授業ID',
  `enrollment_date` date NOT NULL COMMENT '登録日',
  `status` enum('enrolled','dropped','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'enrolled' COMMENT '登録状態',
  `grade` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '成績',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_class` (`student_id`,`class_id`),
  KEY `idx_student_enrollment` (`student_id`,`status`),
  KEY `idx_class_enrollment` (`class_id`,`status`),
  CONSTRAINT `enrollments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `enrollments_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生の科目登録テーブル';

-- Table structure for table `event_participants`
DROP TABLE IF EXISTS `event_participants`;
CREATE TABLE `event_participants` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '参加者ID',
  `event_id` int NOT NULL COMMENT 'イベントID',
  `user_id` int NOT NULL COMMENT 'ユーザーID',
  `status` enum('pending','accepted','declined') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '参加ステータス',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_user` (`event_id`,`user_id`),
  KEY `idx_event_id` (`event_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `event_participants_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='イベント参加者テーブル';

-- Table structure for table `events`
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'イベントID',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'イベントタイトル',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'イベント説明',
  `start_date` datetime NOT NULL COMMENT '開始日時',
  `end_date` datetime DEFAULT NULL COMMENT '終了日時',
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '場所',
  `created_by` int NOT NULL COMMENT '作成者ID',
  `is_public` tinyint(1) DEFAULT '0' COMMENT '公開フラグ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  KEY `idx_start_date` (`start_date`),
  KEY `idx_end_date` (`end_date`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_is_public` (`is_public`),
  KEY `idx_date_range` (`start_date`,`end_date`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='イベントテーブル';

-- Table structure for table `group_members`
DROP TABLE IF EXISTS `group_members`;
CREATE TABLE `group_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `student_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invited_by` int DEFAULT NULL,
  `status` enum('pending','accepted','declined','active','inactive','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'メンバーのステータス: pending=招待中, accepted/active=参加済, declined/rejected=辞退',
  `joined_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_student` (`group_id`,`student_id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_status` (`status`),
  KEY `fk_group_members_invited_by` (`invited_by`),
  CONSTRAINT `fk_group_members_group_id` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_group_members_invited_by` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_group_members_student_id` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `group_teachers`
DROP TABLE IF EXISTS `group_teachers`;
CREATE TABLE `group_teachers` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '諡?ｽ的D',
  `group_id` int NOT NULL COMMENT '繧ｰ繝ｫ繝ｼ繝悠D',
  `user_id` int NOT NULL COMMENT '繝ｦ繝ｼ繧ｶ繝ｼID?域蕗蜩｡?',
  `role` enum('main','assistant') COLLATE utf8mb4_unicode_ci DEFAULT 'main' COMMENT '諡?ｽ鍋ｨｮ蛻･?井ｸｻ諡?ｽ?/蜑ｯ諡?ｽ難ｼ',
  `assigned_at` date NOT NULL COMMENT '蜑ｲ繧雁ｽ薙※譌･',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '菴懈?譌･譎',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '譖ｴ譁ｰ譌･譎',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_teacher` (`group_id`,`user_id`),
  KEY `idx_group` (`group_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_role` (`role`),
  CONSTRAINT `group_teachers_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_teachers_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='繧ｰ繝ｫ繝ｼ繝玲球蠖捺蕗蜩｡繝??繝悶Ν';

-- Table structure for table `groups`
DROP TABLE IF EXISTS `groups`;
CREATE TABLE `groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'グループアイコン（絵文字またはURL）',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_UNIQUE` (`name`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_groups_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `notifications`
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  `user_id` int DEFAULT NULL COMMENT '通知対象のユーザーID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '通知対象の学生ID',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知タイトル',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知メッセージ',
  `type` enum('attendance','grade','general','alert') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知タイプ',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium' COMMENT '優先度',
  `is_read` tinyint(1) DEFAULT '0' COMMENT '既読フラグ',
  `read_at` timestamp NULL DEFAULT NULL COMMENT '既読日時',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (`id`),
  KEY `idx_user_notifications` (`user_id`,`is_read`),
  KEY `idx_student_notifications` (`student_id`,`is_read`),
  KEY `idx_type_priority` (`type`,`priority`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知テーブル';

-- Table structure for table `organizations`
DROP TABLE IF EXISTS `organizations`;
CREATE TABLE `organizations` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '邨?ｹ祢D',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邨?ｹ泌錐?亥ｭｦ譬｡蜷?/莨夂､ｾ蜷搾ｼ',
  `type` enum('school','company') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邨?ｹ皮ｨｮ蛻･',
  `address` text COLLATE utf8mb4_unicode_ci COMMENT '菴乗園',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '髮ｻ隧ｱ逡ｪ蜿ｷ',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '莉｣陦ｨ繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '菴懈?譌･譎',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '譖ｴ譁ｰ譌･譎',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邨?ｹ疲ュ蝣ｱ繝??繝悶Ν';

-- Table structure for table `qr_codes`
DROP TABLE IF EXISTS `qr_codes`;
CREATE TABLE `qr_codes` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'QR繧ｳ繝ｼ繝迂D',
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'QR繧ｳ繝ｼ繝画枚蟄怜?',
  `location_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '蝣ｴ謇?蜷搾ｼ域蕗螳､蜷阪?∝?蜿｣縺ｪ縺ｩ?',
  `location_description` text COLLATE utf8mb4_unicode_ci COMMENT '蝣ｴ謇?縺ｮ隱ｬ譏',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '譛牙柑繝輔Λ繧ｰ',
  `created_by` int NOT NULL COMMENT '菴懈?閠?D?育ｮ｡逅???ｼ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '菴懈?譌･譎',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '譖ｴ譁ｰ譌･譎',
  `expires_at` timestamp NULL DEFAULT NULL COMMENT '譛牙柑譛滄剞',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `created_by` (`created_by`),
  KEY `idx_code` (`code`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_location` (`location_name`),
  CONSTRAINT `qr_codes_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='QR繧ｳ繝ｼ繝臥匱陦檎ｮ｡逅?ユ繝ｼ繝悶Ν';

-- Table structure for table `request_approvals`
DROP TABLE IF EXISTS `request_approvals`;
CREATE TABLE `request_approvals` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '謇ｿ隱巧D',
  `request_id` int NOT NULL COMMENT '逕ｳ隲紀D',
  `approver_id` int NOT NULL COMMENT '謇ｿ隱崎??D?域蕗蜩｡縺ｾ縺溘?邂｡逅???ｼ',
  `action` enum('approve','reject') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '謇ｿ隱阪い繧ｯ繧ｷ繝ｧ繝ｳ',
  `comment` text COLLATE utf8mb4_unicode_ci COMMENT '繧ｳ繝｡繝ｳ繝',
  `approved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '謇ｿ隱肴律譎',
  PRIMARY KEY (`id`),
  KEY `idx_request` (`request_id`),
  KEY `idx_approver` (`approver_id`),
  KEY `idx_approved_at` (`approved_at`),
  CONSTRAINT `request_approvals_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `absence_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `request_approvals_ibfk_2` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='謇ｿ隱咲ｮ｡逅?ユ繝ｼ繝悶Ν';

-- Table structure for table `scan_logs`
DROP TABLE IF EXISTS `scan_logs`;
CREATE TABLE `scan_logs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '繧ｹ繧ｭ繝｣繝ｳ繝ｭ繧ｰID',
  `qr_code_id` int NOT NULL COMMENT 'QR繧ｳ繝ｼ繝迂D',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '蟄ｦ逕櫑D',
  `scanned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '繧ｹ繧ｭ繝｣繝ｳ譌･譎',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '繧ｹ繧ｭ繝｣繝ｳ蜈オP繧｢繝峨Ξ繧ｹ',
  `is_allowed` tinyint(1) NOT NULL COMMENT 'IP險ｱ蜿ｯ繝輔Λ繧ｰ',
  `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT '繝ｦ繝ｼ繧ｶ繝ｼ繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝',
  `result` enum('success','ip_denied','invalid_qr','error') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '繧ｹ繧ｭ繝｣繝ｳ邨先棡',
  `error_message` text COLLATE utf8mb4_unicode_ci COMMENT '繧ｨ繝ｩ繝ｼ繝｡繝?そ繝ｼ繧ｸ',
  PRIMARY KEY (`id`),
  KEY `idx_qr_code` (`qr_code_id`),
  KEY `idx_student` (`student_id`),
  KEY `idx_scanned_at` (`scanned_at`),
  KEY `idx_result` (`result`),
  CONSTRAINT `scan_logs_ibfk_1` FOREIGN KEY (`qr_code_id`) REFERENCES `qr_codes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scan_logs_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='QR繧ｹ繧ｭ繝｣繝ｳ繝ｭ繧ｰ繝??繝悶Ν';

-- Table structure for table `schedule_templates`
DROP TABLE IF EXISTS `schedule_templates`;
CREATE TABLE `schedule_templates` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '繝?Φ繝励Ξ繝ｼ繝?D',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '繝?Φ繝励Ξ繝ｼ繝亥錐',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '隱ｬ譏',
  `template_data` json NOT NULL COMMENT '繝?Φ繝励Ξ繝ｼ繝医ョ繝ｼ繧ｿ??SON蠖｢蠑擾ｼ',
  `created_by` int NOT NULL COMMENT '菴懈?閠?D',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '菴懈?譌･譎',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '譖ｴ譁ｰ譌･譎',
  PRIMARY KEY (`id`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `schedule_templates_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='譎る俣蜑ｲ繝?Φ繝励Ξ繝ｼ繝医ユ繝ｼ繝悶Ν';

-- Table structure for table `student_attendance_records`
DROP TABLE IF EXISTS `student_attendance_records`;
CREATE TABLE `student_attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '記録ID',
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生ID',
  `timestamp` datetime NOT NULL COMMENT '記録日時',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (`id`),
  KEY `idx_student_timestamp` (`student_id`,`timestamp`),
  CONSTRAINT `student_attendance_records_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生の出欠記録テーブル（シンプル版）';

-- Table structure for table `students`
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生ID (学籍番号など)',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生名',
  `card_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ICカードIDなど',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'メールアドレス',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '電話番号',
  `grade` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '学年',
  `class_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'クラス名',
  `enrollment_date` date DEFAULT NULL COMMENT '入学日',
  `status` enum('active','inactive','graduated','suspended') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '学生の状態',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`student_id`),
  UNIQUE KEY `card_id` (`card_id`),
  UNIQUE KEY `card_id_UNIQUE` (`card_id`),
  KEY `idx_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_grade_class` (`grade`,`class_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生情報テーブル（拡張版）';

-- Table structure for table `subjects`
DROP TABLE IF EXISTS `subjects`;
CREATE TABLE `subjects` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '科目ID',
  `subject_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '科目コード',
  `subject_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '科目名',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '科目概要',
  `credits` int DEFAULT '1' COMMENT '単位数',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '有効フラグ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject_code` (`subject_code`),
  KEY `idx_subject_code` (`subject_code`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='科目管理テーブル';

-- Table structure for table `system_settings`
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '設定ID',
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '設定キー',
  `setting_value` text COLLATE utf8mb4_unicode_ci COMMENT '設定値',
  `setting_type` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string' COMMENT '値の型',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '設定の説明',
  `is_public` tinyint(1) DEFAULT '0' COMMENT 'クライアント側に公開可能か',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `idx_setting_key` (`setting_key`),
  KEY `idx_is_public` (`is_public`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='システム設定テーブル';

-- Table structure for table `timetables`
DROP TABLE IF EXISTS `timetables`;
CREATE TABLE `timetables` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '譎る俣蜑ｲID',
  `group_id` int NOT NULL COMMENT '繧ｰ繝ｫ繝ｼ繝悠D',
  `academic_year` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '蟷ｴ蠎ｦ?井ｾ?: 2024?',
  `semester` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '蟄ｦ譛滂ｼ亥燕譛溘?∝ｾ梧悄縺ｪ縺ｩ?',
  `start_date` date NOT NULL COMMENT '髢句ｧ区律',
  `end_date` date NOT NULL COMMENT '邨ゆｺ?律',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '譛牙柑繝輔Λ繧ｰ',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '菴懈?譌･譎',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '譖ｴ譁ｰ譌･譎',
  PRIMARY KEY (`id`),
  KEY `idx_group` (`group_id`),
  KEY `idx_academic_year` (`academic_year`),
  KEY `idx_semester` (`semester`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `timetables_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='譎る俣蜑ｲ繝??繝悶Ν?亥ｹｴ髢薙せ繧ｱ繧ｸ繝･繝ｼ繝ｫ?';

-- Table structure for table `user_attendance_records`
DROP TABLE IF EXISTS `user_attendance_records`;
CREATE TABLE `user_attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '記録ID',
  `user_id` int NOT NULL COMMENT 'ユーザーID',
  `date` date NOT NULL COMMENT '出欠日',
  `status` enum('present','absent','late','early_departure') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状態',
  `check_in_time` datetime DEFAULT NULL COMMENT '出勤時刻',
  `check_out_time` datetime DEFAULT NULL COMMENT '退勤時刻',
  `reason` text COLLATE utf8mb4_unicode_ci COMMENT '理由 (遅刻・早退・欠席など)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`,`date`),
  KEY `idx_user_date` (`user_id`,`date`),
  KEY `idx_date` (`date`),
  CONSTRAINT `user_attendance_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='従業員の出欠記録テーブル';

-- Table structure for table `users`
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ユーザーID',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '氏名',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'メールアドレス',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ハッシュ化されたパスワード',
  `employee_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部署',
  `role` enum('admin','employee','teacher','student') COLLATE utf8mb4_unicode_ci DEFAULT 'employee',
  `last_role_update` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  `reset_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `employee_id` (`employee_id`),
  KEY `idx_email` (`email`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_student_id` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザー情報テーブル';

SET FOREIGN_KEY_CHECKS = 1;
