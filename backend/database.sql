-- ============================================================================
-- DepEd Teacher Needs Analysis (TNA) & Deployment System
-- Database Schema & Initial Seed Data (MySQL / MariaDB)
-- Database: depedlapulapu_tna
-- Formula: GAP = Required - Existing
--          Needs = (GAP + Transfer_Out) - Transfer_In
-- ============================================================================

USE `depedlapulapu_tna`;

SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS `v_es_analysis`;
DROP VIEW IF EXISTS `v_jhs_totals`;
DROP VIEW IF EXISTS `v_shs_totals`;
DROP TABLE IF EXISTS `deployments`;
DROP TABLE IF EXISTS `shs_subject_needs`;
DROP TABLE IF EXISTS `shs_schools`;
DROP TABLE IF EXISTS `jhs_subject_needs`;
DROP TABLE IF EXISTS `jhs_schools`;
DROP TABLE IF EXISTS `es_schools`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. ELEMENTARY SCHOOLS (ES) TABLE
-- ============================================================================
CREATE TABLE `es_schools` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` VARCHAR(32) NOT NULL DEFAULT '',
  `school_name` VARCHAR(150) NOT NULL,
  `required` INT NOT NULL DEFAULT 0,
  `existing` INT NOT NULL DEFAULT 0,
  `transfer_out` INT NOT NULL DEFAULT 0,
  `transfer_in` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_es_school_name` (`school_name`),
  KEY `idx_es_school_id` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. JUNIOR HIGH SCHOOLS (JHS) TABLES
-- ============================================================================
CREATE TABLE `jhs_schools` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` VARCHAR(32) NOT NULL DEFAULT '',
  `school_name` VARCHAR(150) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_jhs_school_name` (`school_name`),
  KEY `idx_jhs_school_id` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jhs_subject_needs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `jhs_school_id` INT UNSIGNED NOT NULL,
  `subject` ENUM('Filipino','English','Math','Science','AralPan','TLE','MAPEH','EsP','SPED') NOT NULL,
  `required` INT NOT NULL DEFAULT 0,
  `existing` INT NOT NULL DEFAULT 0,
  `transfer_out` INT NOT NULL DEFAULT 0,
  `transfer_in` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_jhs_school_subject` (`jhs_school_id`, `subject`),
  CONSTRAINT `fk_jhs_subject_school`
    FOREIGN KEY (`jhs_school_id`) REFERENCES `jhs_schools` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. SENIOR HIGH SCHOOLS (SHS) TABLES
-- ============================================================================
CREATE TABLE `shs_schools` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` VARCHAR(32) NOT NULL DEFAULT '',
  `school_name` VARCHAR(150) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shs_school_name` (`school_name`),
  KEY `idx_shs_school_id` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shs_subject_needs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shs_school_id` INT UNSIGNED NOT NULL,
  `subject` ENUM('ABM','AralPan','English','Filipino','Math','Science','TVL-AFA','TVL-HE','TVL-IA','TVL-ICT') NOT NULL,
  `required` INT NOT NULL DEFAULT 0,
  `existing` INT NOT NULL DEFAULT 0,
  `transfer_out` INT NOT NULL DEFAULT 0,
  `transfer_in` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shs_school_subject` (`shs_school_id`, `subject`),
  CONSTRAINT `fk_shs_subject_school`
    FOREIGN KEY (`shs_school_id`) REFERENCES `shs_schools` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. DEPLOYMENT / TRANSFER RECORDS TABLE (ES, JHS, SHS)
-- ============================================================================
-- Rules:
--   * When transfer_type = 'IN':
--       - school_name receives +1 Transfer In (and for `subject` in JHS/SHS)
--   * When transfer_type = 'OUT':
--       - school_name (From School) receives +1 Transfer Out
--       - to_school_name (To School) receives +1 Transfer In
-- ============================================================================
CREATE TABLE `deployments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` ENUM('ES','JHS','SHS') NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `middle_name` VARCHAR(100) NOT NULL DEFAULT '',
  `school_name` VARCHAR(150) NOT NULL COMMENT 'Destination school if IN; From School if OUT',
  `to_school_name` VARCHAR(150) DEFAULT NULL COMMENT 'Destination school receiving Transfer In when transfer_type = OUT',
  `subject` VARCHAR(50) DEFAULT NULL COMMENT 'Subject/Track for JHS and SHS deployments',
  `current_position` VARCHAR(100) NOT NULL DEFAULT 'TEACHER I',
  `date_added` DATE NOT NULL,
  `transfer_type` ENUM('IN','OUT') NOT NULL DEFAULT 'IN',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_deploy_category` (`category`),
  KEY `idx_deploy_school` (`category`, `school_name`),
  KEY `idx_deploy_to_school` (`category`, `to_school_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. ANALYTICS VIEWS (Auto-Calculated GAP & Net Needs)
-- ============================================================================
CREATE VIEW `v_es_analysis` AS
SELECT
  `e`.`id`,
  `e`.`school_id`,
  `e`.`school_name`,
  `e`.`required`,
  `e`.`existing`,
  (`e`.`required` - `e`.`existing`) AS `gap`,
  `e`.`transfer_out`,
  `e`.`transfer_in`,
  ((`e`.`required` - `e`.`existing`) + `e`.`transfer_out` - `e`.`transfer_in`) AS `needs`
FROM `es_schools` `e`;

CREATE VIEW `v_jhs_totals` AS
SELECT
  `s`.`id`,
  `s`.`school_id`,
  `s`.`school_name`,
  COALESCE(SUM(`n`.`required`), 0) AS `total_required`,
  COALESCE(SUM(`n`.`existing`), 0) AS `total_existing`,
  COALESCE(SUM(`n`.`required` - `n`.`existing`), 0) AS `total_gap`,
  COALESCE(SUM(`n`.`transfer_out`), 0) AS `total_transfer_out`,
  COALESCE(SUM(`n`.`transfer_in`), 0) AS `total_transfer_in`,
  COALESCE(SUM((`n`.`required` - `n`.`existing`) + `n`.`transfer_out` - `n`.`transfer_in`), 0) AS `total_needs`
FROM `jhs_schools` `s`
LEFT JOIN `jhs_subject_needs` `n` ON `n`.`jhs_school_id` = `s`.`id`
GROUP BY `s`.`id`, `s`.`school_id`, `s`.`school_name`;

CREATE VIEW `v_shs_totals` AS
SELECT
  `s`.`id`,
  `s`.`school_id`,
  `s`.`school_name`,
  COALESCE(SUM(`n`.`required`), 0) AS `total_required`,
  COALESCE(SUM(`n`.`existing`), 0) AS `total_existing`,
  COALESCE(SUM(`n`.`required` - `n`.`existing`), 0) AS `total_gap`,
  COALESCE(SUM(`n`.`transfer_out`), 0) AS `total_transfer_out`,
  COALESCE(SUM(`n`.`transfer_in`), 0) AS `total_transfer_in`,
  COALESCE(SUM((`n`.`required` - `n`.`existing`) + `n`.`transfer_out` - `n`.`transfer_in`), 0) AS `total_needs`
FROM `shs_schools` `s`
LEFT JOIN `shs_subject_needs` `n` ON `n`.`shs_school_id` = `s`.`id`
GROUP BY `s`.`id`, `s`.`school_id`, `s`.`school_name`;

-- ============================================================================
-- 6. SEED DATA: ELEMENTARY SCHOOLS (ES)
-- ============================================================================
INSERT INTO `es_schools` (`id`, `school_id`, `school_name`, `required`, `existing`, `transfer_out`, `transfer_in`) VALUES
  (1,  '119964', 'Buaya ES',          55, 51, 0, 0),
  (2,  '119966', 'Babag II ES',       51, 43, 0, 0),
  (3,  '119974', 'Bagong Silang ES',  48, 49, 0, 0),
  (4,  '119968', 'Basak ES',          64, 59, 0, 0),
  (5,  '119978', 'Maribago ES',       54, 50, 0, 0),
  (6,  '119965', 'Babag I ES',        53, 59, 0, 0),
  (7,  '119984', 'Sudtonggan ES',     51, 49, 0, 0),
  (8,  '119958', 'Pajo ES',           58, 49, 0, 0),
  (9,  '119972', 'Abuno ES',          41, 40, 0, 0),
  (10, '119990', 'Talima ES',         30, 28, 0, 0),
  (11, '119970', 'Pusok ES',          74, 73, 0, 0),
  (12, '119963', 'Bankal ES',        112, 105, 0, 0),
  (13, '119983', 'Suba-Basbas ES',    54, 50, 0, 0),
  (14, '119973', 'Agus ES',           47, 42, 0, 0),
  (15, '119976', 'Buyong ES',         44, 39, 0, 0);

-- ============================================================================
-- 7. SEED DATA: JUNIOR HIGH SCHOOLS (JHS)
-- ============================================================================
INSERT INTO `jhs_schools` (`id`, `school_id`, `school_name`) VALUES
  (1, '303031', 'Abuno HS'),
  (2, '303032', 'Babag NHS'),
  (3, '303033', 'Bankal NHS'),
  (4, '303034', 'Basak Night HS'),
  (5, '303035', 'Marigondon NHS');

INSERT INTO `jhs_subject_needs` (`jhs_school_id`, `subject`, `required`, `existing`, `transfer_out`, `transfer_in`) VALUES
  -- 1. Abuno HS
  (1, 'Filipino', 4, 4, 0, 0),
  (1, 'English',  4, 4, 0, 0),
  (1, 'Math',     4, 3, 0, 0),
  (1, 'Science',  4, 4, 0, 0),
  (1, 'AralPan',  4, 4, 0, 0),
  (1, 'TLE',      4, 3, 0, 0),
  (1, 'MAPEH',    4, 4, 0, 0),
  (1, 'EsP',      4, 3, 0, 0),
  (1, 'SPED',     0, 0, 0, 0),
  -- 2. Babag NHS
  (2, 'Filipino', 20, 29, 0, 0),
  (2, 'English',  20, 23, 0, 0),
  (2, 'Math',     20, 19, 0, 0),
  (2, 'Science',  20, 19, 0, 0),
  (2, 'AralPan',  20, 17, 0, 0),
  (2, 'TLE',      20, 23, 0, 0),
  (2, 'MAPEH',    20, 21, 0, 0),
  (2, 'EsP',      20,  8, 0, 0),
  (2, 'SPED',      0,  2, 0, 0),
  -- 3. Bankal NHS
  (3, 'Filipino', 20, 18, 0, 0),
  (3, 'English',  20, 20, 0, 0),
  (3, 'Math',     20, 27, 0, 0),
  (3, 'Science',  20, 24, 0, 0),
  (3, 'AralPan',  20, 16, 0, 0),
  (3, 'TLE',      20, 16, 0, 0),
  (3, 'MAPEH',    20, 18, 0, 0),
  (3, 'EsP',      20, 16, 0, 0),
  (3, 'SPED',      0,  1, 0, 0),
  -- 4. Basak Night HS
  (4, 'Filipino', 4, 5, 0, 0),
  (4, 'English',  4, 3, 0, 0),
  (4, 'Math',     4, 4, 0, 0),
  (4, 'Science',  4, 5, 0, 0),
  (4, 'AralPan',  4, 3, 0, 0),
  (4, 'TLE',      4, 2, 0, 0),
  (4, 'MAPEH',    4, 2, 0, 0),
  (4, 'EsP',      4, 0, 0, 0),
  (4, 'SPED',     0, 0, 0, 0),
  -- 5. Marigondon NHS
  (5, 'Filipino', 30, 27, 0, 0),
  (5, 'English',  30, 27, 0, 0),
  (5, 'Math',     30, 23, 0, 0),
  (5, 'Science',  30, 21, 0, 0),
  (5, 'AralPan',  30, 19, 0, 0),
  (5, 'TLE',      30, 65, 0, 0),
  (5, 'MAPEH',    30, 17, 0, 0),
  (5, 'EsP',      30,  7, 0, 0),
  (5, 'SPED',      0,  0, 0, 0);

-- ============================================================================
-- 8. SEED DATA: SENIOR HIGH SCHOOLS (SHS)
-- ============================================================================
INSERT INTO `shs_schools` (`id`, `school_id`, `school_name`) VALUES
  (1, '340001', 'Babag SHS'),
  (2, '340002', 'Bankal SHS'),
  (3, '340003', 'Marigondon SHS');

INSERT INTO `shs_subject_needs` (`shs_school_id`, `subject`, `required`, `existing`, `transfer_out`, `transfer_in`) VALUES
  -- 1. Babag SHS
  (1, 'ABM',      1,  2, 0, 0),
  (1, 'AralPan',  8,  6, 0, 0),
  (1, 'English', 13, 15, 0, 0),
  (1, 'Filipino', 5,  9, 0, 0),
  (1, 'Math',     4,  2, 0, 0),
  (1, 'Science',  4, 11, 0, 0),
  (1, 'TVL-AFA',  7, 11, 0, 0),
  (1, 'TVL-HE',   9, 10, 0, 0),
  (1, 'TVL-IA',   4,  3, 0, 0),
  (1, 'TVL-ICT',  1,  2, 0, 0),
  -- 2. Bankal SHS
  (2, 'ABM',      1, 2, 0, 0),
  (2, 'AralPan',  7, 6, 0, 0),
  (2, 'English', 11, 7, 0, 0),
  (2, 'Filipino', 5, 3, 0, 0),
  (2, 'Math',     3, 4, 0, 0),
  (2, 'Science',  4, 7, 0, 0),
  (2, 'TVL-AFA',  8, 7, 0, 0),
  (2, 'TVL-HE',   5, 5, 0, 0),
  (2, 'TVL-IA',   4, 3, 0, 0),
  (2, 'TVL-ICT',  1, 4, 0, 0),
  -- 3. Marigondon SHS
  (3, 'ABM',      3,  3, 0, 0),
  (3, 'AralPan',  9,  6, 0, 0),
  (3, 'English', 14, 10, 0, 0),
  (3, 'Filipino', 6,  5, 0, 0),
  (3, 'Math',     4,  4, 0, 0),
  (3, 'Science',  4,  6, 0, 0),
  (3, 'TVL-AFA',  9,  6, 0, 0),
  (3, 'TVL-HE',   9,  7, 0, 0),
  (3, 'TVL-IA',   5,  3, 0, 0),
  (3, 'TVL-ICT',  3,  3, 0, 0);

