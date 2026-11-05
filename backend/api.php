<?php
// api.php - DepEd TNA Backend API (Load & Sync ES, JHS, SHS, Subjects, and Deployments with MySQL)

require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

try {
    $GLOBALS['TNA_ALLOW_DB_FALLBACK'] = true;
    require_once __DIR__ . '/dbConnect.php';
    $pdo = getDbConnection();

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? ($method === 'POST' ? 'sync' : 'load');
    $localFallbackFile = __DIR__ . '/local_tna_db.json';

    // If MySQL is not running locally, fall back cleanly to local_tna_db.json (HTTP 200)
    if ($pdo === null) {
        if ($action === 'get_config') {
            $googleClientId = $_ENV['GOOGLE_CLIENT_ID'] ?? getenv('GOOGLE_CLIENT_ID') ?? '656781339160-ubbav7amej5s7lf4299nqquqkig47r52.apps.googleusercontent.com';
            echo json_encode([
                'status'           => 'success',
                'google_client_id' => $googleClientId,
            ]);
            exit;
        }

        if ($action === 'get_staff') {
            echo json_encode([
                'status' => 'success',
                'staff'  => [
                    [
                        'id'        => 1,
                        'email'     => 'johnong07242004@gmail.com',
                        'name'      => 'John Ong (Administrator)',
                        'role'      => 'Admin',
                        'avatar'    => null,
                        'createdAt' => date('Y-m-d H:i:s'),
                    ],
                    [
                        'id'        => 2,
                        'email'     => 'admin@depedlapulapu.net.ph',
                        'name'      => 'DepEd Division Admin',
                        'role'      => 'Admin',
                        'avatar'    => null,
                        'createdAt' => date('Y-m-d H:i:s'),
                    ],
                    [
                        'id'        => 3,
                        'email'     => 'staff@depedlapulapu.net.ph',
                        'name'      => 'Division Staff Officer',
                        'role'      => 'Staff Officer',
                        'avatar'    => null,
                        'createdAt' => date('Y-m-d H:i:s'),
                    ],
                ],
            ]);
            exit;
        }

        if ($action === 'add_staff' || $action === 'update_staff' || $action === 'delete_staff') {
            echo json_encode(['status' => 'success', 'message' => 'Staff authorization updated in local fallback mode.']);
            exit;
        }

        if ($action === 'login_mock') {
            http_response_code(403);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Mock sign-in is disabled. Please use authorized Google Workspace sign-in.',
            ]);
            exit;
        }
        if ($method === 'POST' && $action === 'sync') {
            $rawBody = file_get_contents('php://input');
            $payload = json_decode($rawBody ?: '{}', true);
            if (!is_array($payload)) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Invalid JSON payload']);
                exit;
            }
            file_put_contents($localFallbackFile, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            echo json_encode([
                'status'   => 'success',
                'database' => 'local_file',
                'message'  => 'Saved to local JSON database (MySQL offline).',
            ]);
            exit;
        }

        if (file_exists($localFallbackFile)) {
            $saved = json_decode(file_get_contents($localFallbackFile) ?: '{}', true);
            echo json_encode([
                'status'   => 'success',
                'database' => 'local_file',
                'isSynced' => is_array($saved) && !empty($saved),
                'data'     => is_array($saved) ? $saved : null,
            ]);
        } else {
            echo json_encode([
                'status'   => 'success',
                'database' => 'local_file',
                'isSynced' => false,
                'data'     => new stdClass(),
            ]);
        }
        exit;
    }

    // Ensure all tables exist in MySQL
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `tna_settings` (
              `setting_key` VARCHAR(64) NOT NULL,
              `setting_value` TEXT NOT NULL,
              `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (`setting_key`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `es_schools` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `school_id` VARCHAR(20) NOT NULL DEFAULT '',
              `school_name` VARCHAR(150) NOT NULL,
              `required` INT NOT NULL DEFAULT 0,
              `existing` INT NOT NULL DEFAULT 0,
              `transfer_out` INT NOT NULL DEFAULT 0,
              `transfer_in` INT NOT NULL DEFAULT 0,
              PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `jhs_schools` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `school_id` VARCHAR(20) NOT NULL DEFAULT '',
              `school_name` VARCHAR(150) NOT NULL,
              PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `jhs_subject_needs` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `jhs_school_id` INT UNSIGNED NOT NULL,
              `subject` VARCHAR(64) NOT NULL,
              `required` INT NOT NULL DEFAULT 0,
              `existing` INT NOT NULL DEFAULT 0,
              `transfer_out` INT NOT NULL DEFAULT 0,
              `transfer_in` INT NOT NULL DEFAULT 0,
              PRIMARY KEY (`id`),
              KEY `idx_jhs_school` (`jhs_school_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `shs_schools` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `school_id` VARCHAR(20) NOT NULL DEFAULT '',
              `school_name` VARCHAR(150) NOT NULL,
              PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `shs_subject_needs` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `shs_school_id` INT UNSIGNED NOT NULL,
              `subject` VARCHAR(64) NOT NULL,
              `required` INT NOT NULL DEFAULT 0,
              `existing` INT NOT NULL DEFAULT 0,
              `transfer_out` INT NOT NULL DEFAULT 0,
              `transfer_in` INT NOT NULL DEFAULT 0,
              PRIMARY KEY (`id`),
              KEY `idx_shs_school` (`shs_school_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `deployments` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `category` VARCHAR(10) NOT NULL,
              `last_name` VARCHAR(100) NOT NULL,
              `first_name` VARCHAR(100) NOT NULL,
              `middle_name` VARCHAR(100) NOT NULL DEFAULT '',
              `school_name` VARCHAR(150) NOT NULL,
              `to_school_name` VARCHAR(150) DEFAULT NULL,
              `subject` VARCHAR(64) DEFAULT NULL,
              `current_position` VARCHAR(100) NOT NULL DEFAULT 'Teacher I',
              `date_added` DATE NOT NULL,
              `transfer_type` VARCHAR(10) NOT NULL DEFAULT 'IN',
              `remarks` VARCHAR(255) DEFAULT NULL,
              PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `tna_users` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `email` VARCHAR(150) NOT NULL UNIQUE,
              `name` VARCHAR(150) NOT NULL,
              `role` VARCHAR(50) NOT NULL DEFAULT 'Admin',
              `avatar` VARCHAR(255) DEFAULT NULL,
              `google_sub` VARCHAR(100) DEFAULT NULL,
              `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // Ensure johnong07242004@gmail.com is set as primary default Administrator
        try {
            $pdo->exec("
                INSERT INTO `tna_users` (`email`, `name`, `role`)
                VALUES ('johnong07242004@gmail.com', 'John Ong (Administrator)', 'Admin')
                ON DUPLICATE KEY UPDATE `role` = 'Admin'
            ");
        } catch (Throwable $ignored) {
        }
    } catch (Throwable $ignored) {
    }

    // Auto-migrate schema updates for existing tables
    try {
        $pdo->exec("ALTER TABLE `jhs_subject_needs` MODIFY COLUMN `subject` VARCHAR(64) NOT NULL");
    } catch (Throwable $ignored) {
    }
    try {
        $pdo->exec("ALTER TABLE `shs_subject_needs` MODIFY COLUMN `subject` VARCHAR(64) NOT NULL");
    } catch (Throwable $ignored) {
    }
    try {
        $pdo->exec("ALTER TABLE `deployments` ADD COLUMN IF NOT EXISTS `remarks` VARCHAR(255) DEFAULT NULL");
    } catch (Throwable $ignored) {
        try {
            $pdo->exec("ALTER TABLE `deployments` ADD COLUMN `remarks` VARCHAR(255) DEFAULT NULL");
        } catch (Throwable $ignored2) {}
    }
    try {
        $pdo->exec("ALTER TABLE `tna_users` ADD COLUMN IF NOT EXISTS `session_token` VARCHAR(64) DEFAULT NULL");
    } catch (Throwable $ignored) {
        try {
            $pdo->exec("ALTER TABLE `tna_users` ADD COLUMN `session_token` VARCHAR(64) DEFAULT NULL");
        } catch (Throwable $ignored2) {}
    }

    // -------------------------------------------------------------------------
    // Auth & Staff Management Endpoints
    // -------------------------------------------------------------------------
    if ($action === 'get_config') {
        $googleClientId = $_ENV['GOOGLE_CLIENT_ID'] ?? getenv('GOOGLE_CLIENT_ID') ?? '656781339160-ubbav7amej5s7lf4299nqquqkig47r52.apps.googleusercontent.com';
        echo json_encode([
            'status'           => 'success',
            'google_client_id' => $googleClientId,
        ]);
        exit;
    }

    if ($action === 'login_mock') {
        http_response_code(403);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Mock sign-in is permanently disabled. Please use authorized Google Workspace sign-in.',
        ]);
        exit;
    }

    if ($action === 'login_google') {
        $rawBody = file_get_contents('php://input');
        $payload = json_decode($rawBody ?: '{}', true);
        $credential = $payload['credential'] ?? '';
        if (!$credential) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Missing Google credential token']);
            exit;
        }

        // Decode JWT payload
        $parts = explode('.', $credential);
        if (count($parts) >= 2) {
            $jsonStr = base64_decode(str_pad(strtr($parts[1], '-_', '+/'), strlen($parts[1]) % 4, '=', STR_PAD_RIGHT));
            $tokenData = json_decode($jsonStr, true) ?: [];

            // Token Security Validations
            $googleClientId = $_ENV['GOOGLE_CLIENT_ID'] ?? getenv('GOOGLE_CLIENT_ID') ?? '';
            if ($googleClientId && isset($tokenData['aud']) && $tokenData['aud'] !== $googleClientId) {
                http_response_code(401);
                echo json_encode(['status' => 'error', 'message' => 'Security Error: Token audience does not match configured Google Client ID.']);
                exit;
            }

            if (isset($tokenData['exp']) && (int)$tokenData['exp'] < (time() - 300)) {
                http_response_code(401);
                echo json_encode(['status' => 'error', 'message' => 'Security Error: Google token has expired. Please sign in again.']);
                exit;
            }

            $iss = $tokenData['iss'] ?? '';
            if ($iss && !in_array($iss, ['accounts.google.com', 'https://accounts.google.com'], true)) {
                http_response_code(401);
                echo json_encode(['status' => 'error', 'message' => 'Security Error: Invalid token issuer.']);
                exit;
            }

            $email = strtolower(trim((string)($tokenData['email'] ?? '')));
            $name = htmlspecialchars(trim((string)($tokenData['name'] ?? $email ?? 'DepEd User')), ENT_QUOTES, 'UTF-8');
            $avatar = filter_var($tokenData['picture'] ?? null, FILTER_VALIDATE_URL) ? $tokenData['picture'] : null;
            $sub = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)($tokenData['sub'] ?? ''));

            if ($email && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                // Check if user exists and is authorized in tna_users
                $stmtCheck = $pdo->prepare("SELECT * FROM `tna_users` WHERE LOWER(`email`) = :email LIMIT 1");
                $stmtCheck->execute([':email' => $email]);
                $existingUser = $stmtCheck->fetch();

                $totalUsers = (int)$pdo->query("SELECT COUNT(*) FROM `tna_users`")->fetchColumn();

                // If tna_users is empty, the first Google user becomes the primary Admin
                if (!$existingUser && $totalUsers === 0) {
                    $stmtUser = $pdo->prepare("
                        INSERT INTO `tna_users` (`email`, `name`, `role`, `avatar`, `google_sub`)
                        VALUES (:email, :name, 'Admin', :avatar, :sub)
                    ");
                    $stmtUser->execute([
                        ':email'  => $email,
                        ':name'   => $name,
                        ':avatar' => $avatar,
                        ':sub'    => $sub,
                    ]);
                    $existingUser = [
                        'id'       => $pdo->lastInsertId(),
                        'name'     => $name,
                        'email'    => $email,
                        'role'     => 'Admin',
                        'avatar'   => $avatar,
                    ];
                } else if (!$existingUser) {
                    // Not authorized by Division Admin!
                    http_response_code(403);
                    echo json_encode([
                        'status'  => 'error',
                        'message' => "Access Denied: The account ({$email}) is not authorized by the Division Admin. Please contact an administrator to grant access.",
                    ]);
                    exit;
                }

                // Generate secure random session token
                $sessionToken = bin2hex(random_bytes(32));
                try {
                    $stmtUp = $pdo->prepare("UPDATE `tna_users` SET `name` = :name, `avatar` = :avatar, `google_sub` = :sub, `session_token` = :tok WHERE `id` = :id");
                    $stmtUp->execute([
                        ':name'   => $name,
                        ':avatar' => $avatar,
                        ':sub'    => $sub,
                        ':tok'    => $sessionToken,
                        ':id'     => $existingUser['id'],
                    ]);
                } catch (Throwable $ignored) {}

                echo json_encode([
                    'status' => 'success',
                    'token'  => $sessionToken,
                    'user'   => [
                        'id'       => (string)$existingUser['id'],
                        'name'     => $existingUser['name'] ?: $name,
                        'email'    => $existingUser['email'],
                        'role'     => $existingUser['role'] ?: 'Staff Officer',
                        'avatar'   => $avatar ?: ($existingUser['avatar'] ?? null),
                        'provider' => 'google',
                    ],
                ]);
                exit;
            }
        }

        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid Google token payload']);
        exit;
    }

    // -------------------------------------------------------------------------
    // Staff Authorization Management (Admin only)
    // -------------------------------------------------------------------------
    if ($action === 'get_staff') {
        $staffRows = $pdo->query("SELECT `id`, `email`, `name`, `role`, `avatar`, `created_at`, `updated_at` FROM `tna_users` ORDER BY `role` ASC, `name` ASC")->fetchAll();
        $staff = array_map(function ($s) {
            return [
                'id'        => (int)$s['id'],
                'email'     => (string)$s['email'],
                'name'      => (string)$s['name'],
                'role'      => (string)$s['role'],
                'avatar'    => $s['avatar'] ? (string)$s['avatar'] : null,
                'createdAt' => (string)$s['created_at'],
                'updatedAt' => (string)$s['updated_at'],
            ];
        }, $staffRows);
        echo json_encode([
            'status' => 'success',
            'staff'  => $staff,
        ]);
        exit;
    }

    if ($action === 'add_staff') {
        $rawBody = file_get_contents('php://input');
        $payload = json_decode($rawBody ?: '{}', true);
        $email = strtolower(trim((string)($payload['email'] ?? '')));
        $name = trim((string)($payload['name'] ?? ''));
        $role = ($payload['role'] ?? 'Staff Officer') === 'Admin' ? 'Admin' : 'Staff Officer';

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Please provide a valid email address.']);
            exit;
        }
        if (!$name) {
            $name = explode('@', $email)[0];
        }

        try {
            $stmt = $pdo->prepare("
                INSERT INTO `tna_users` (`email`, `name`, `role`)
                VALUES (:email, :name, :role)
                ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`)
            ");
            $stmt->execute([':email' => $email, ':name' => $name, ':role' => $role]);
            echo json_encode([
                'status'  => 'success',
                'message' => "Staff member {$name} ({$email}) authorized as {$role}.",
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to authorize staff: ' . $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'update_staff') {
        $rawBody = file_get_contents('php://input');
        $payload = json_decode($rawBody ?: '{}', true);
        $id = (int)($payload['id'] ?? 0);
        $name = trim((string)($payload['name'] ?? ''));
        $role = ($payload['role'] ?? 'Staff Officer') === 'Admin' ? 'Admin' : 'Staff Officer';

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid staff ID.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("UPDATE `tna_users` SET `name` = :name, `role` = :role WHERE `id` = :id");
            $stmt->execute([':name' => $name, ':role' => $role, ':id' => $id]);
            echo json_encode(['status' => 'success', 'message' => 'Staff authorization updated successfully.']);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'delete_staff') {
        $rawBody = file_get_contents('php://input');
        $payload = json_decode($rawBody ?: '{}', true);
        $id = (int)($payload['id'] ?? 0);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid staff ID.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM `tna_users` WHERE `id` = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(['status' => 'success', 'message' => 'User authorization revoked.']);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    if ($method === 'POST' && $action === 'sync') {
        $rawBody = file_get_contents('php://input');
        $payload = json_decode($rawBody ?: '{}', true);

        if (!is_array($payload)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid JSON payload']);
            exit;
        }

        try {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
        } catch (Throwable $ignored) {}

        $pdo->beginTransaction();

        try {
            // 1. Save dynamic subjects if provided
            $stmtSetting = $pdo->prepare("
                INSERT INTO `tna_settings` (`setting_key`, `setting_value`)
                VALUES (:k, :v)
                ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`)
            ");
            if (isset($payload['schoolYear']) && is_string($payload['schoolYear']) && trim($payload['schoolYear']) !== '') {
                $stmtSetting->execute([
                    ':k' => 'school_year',
                    ':v' => trim($payload['schoolYear']),
                ]);
            }
            if (isset($payload['jhsSubjects']) && is_array($payload['jhsSubjects'])) {
                $stmtSetting->execute([
                    ':k' => 'jhs_subjects',
                    ':v' => json_encode(array_values($payload['jhsSubjects'])),
                ]);
            }
            if (isset($payload['shsSubjects']) && is_array($payload['shsSubjects'])) {
                $stmtSetting->execute([
                    ':k' => 'shs_subjects',
                    ':v' => json_encode(array_values($payload['shsSubjects'])),
                ]);
            }

            // 2. Sync ES records (fresh replacement of es_schools)
            if (isset($payload['esRecords']) && is_array($payload['esRecords'])) {
                $pdo->exec("DELETE FROM `es_schools`");
                $stmtEs = $pdo->prepare("
                    INSERT INTO `es_schools` (`school_id`, `school_name`, `required`, `existing`, `transfer_out`, `transfer_in`)
                    VALUES (:school_id, :school_name, :required, :existing, :transfer_out, :transfer_in)
                    ON DUPLICATE KEY UPDATE
                      `school_id` = VALUES(`school_id`),
                      `required` = VALUES(`required`),
                      `existing` = VALUES(`existing`),
                      `transfer_out` = VALUES(`transfer_out`),
                      `transfer_in` = VALUES(`transfer_in`)
                ");
                foreach ($payload['esRecords'] as $r) {
                    $name = trim((string)($r['schoolName'] ?? ''));
                    if ($name === '') continue;
                    $stmtEs->execute([
                        ':school_id'    => trim((string)($r['schoolId'] ?? '')),
                        ':school_name'  => $name,
                        ':required'     => (int)round((float)($r['required'] ?? 0)),
                        ':existing'     => (int)round((float)($r['existing'] ?? 0)),
                        ':transfer_out' => (int)round((float)($r['transferOut'] ?? 0)),
                        ':transfer_in'  => (int)round((float)($r['transferIn'] ?? 0)),
                    ]);
                }
            }

            // 3. Sync JHS records (fresh replacement of jhs_schools & jhs_subject_needs)
            if (isset($payload['jhsRecords']) && is_array($payload['jhsRecords'])) {
                $pdo->exec("DELETE FROM `jhs_subject_needs`");
                $pdo->exec("DELETE FROM `jhs_schools`");

                $stmtJhsSchool = $pdo->prepare("
                    INSERT INTO `jhs_schools` (`school_id`, `school_name`)
                    VALUES (:school_id, :school_name)
                ");
                $stmtJhsSubj = $pdo->prepare("
                    INSERT INTO `jhs_subject_needs` (`jhs_school_id`, `subject`, `required`, `existing`, `transfer_out`, `transfer_in`)
                    VALUES (:jhs_school_id, :subject, :required, :existing, :transfer_out, :transfer_in)
                ");

                $jhsSubjects = isset($payload['jhsSubjects']) && is_array($payload['jhsSubjects'])
                    ? $payload['jhsSubjects']
                    : ['Filipino', 'English', 'Math', 'Science', 'AralPan', 'TLE', 'MAPEH', 'EsP', 'SPED'];

                $seenJhs = [];
                foreach ($payload['jhsRecords'] as $r) {
                    $name = trim((string)($r['schoolName'] ?? ''));
                    $key = strtolower($name);
                    if ($name === '' || isset($seenJhs[$key])) continue;
                    $seenJhs[$key] = true;

                    $stmtJhsSchool->execute([
                        ':school_id'   => trim((string)($r['schoolId'] ?? '')),
                        ':school_name' => $name,
                    ]);
                    $schoolDbId = (int)$pdo->lastInsertId();

                    foreach ($jhsSubjects as $subj) {
                        $stmtJhsSubj->execute([
                            ':jhs_school_id' => $schoolDbId,
                            ':subject'       => (string)$subj,
                            ':required'      => (int)round((float)($r['required'][$subj] ?? 0)),
                            ':existing'      => (int)round((float)($r['existing'][$subj] ?? 0)),
                            ':transfer_out'  => (int)round((float)($r['transferOut'][$subj] ?? 0)),
                            ':transfer_in'   => (int)round((float)($r['transferIn'][$subj] ?? 0)),
                        ]);
                    }
                }
            }

            // 4. Sync SHS records (fresh replacement of shs_schools & shs_subject_needs)
            if (isset($payload['shsRecords']) && is_array($payload['shsRecords'])) {
                $pdo->exec("DELETE FROM `shs_subject_needs`");
                $pdo->exec("DELETE FROM `shs_schools`");

                $stmtShsSchool = $pdo->prepare("
                    INSERT INTO `shs_schools` (`school_id`, `school_name`)
                    VALUES (:school_id, :school_name)
                ");
                $stmtShsSubj = $pdo->prepare("
                    INSERT INTO `shs_subject_needs` (`shs_school_id`, `subject`, `required`, `existing`, `transfer_out`, `transfer_in`)
                    VALUES (:shs_school_id, :subject, :required, :existing, :transfer_out, :transfer_in)
                ");

                $shsSubjects = isset($payload['shsSubjects']) && is_array($payload['shsSubjects'])
                    ? $payload['shsSubjects']
                    : ['ABM', 'AralPan', 'English', 'Filipino', 'MAPEH', 'Math', 'Science', 'TVL-AFA', 'TVL-HE', 'TVL-IA', 'TVL-ICT'];

                $seenShs = [];
                foreach ($payload['shsRecords'] as $r) {
                    $name = trim((string)($r['schoolName'] ?? ''));
                    $key = strtolower($name);
                    if ($name === '' || isset($seenShs[$key])) continue;
                    $seenShs[$key] = true;

                    $stmtShsSchool->execute([
                        ':school_id'   => trim((string)($r['schoolId'] ?? '')),
                        ':school_name' => $name,
                    ]);
                    $schoolDbId = (int)$pdo->lastInsertId();

                    foreach ($shsSubjects as $subj) {
                        $stmtShsSubj->execute([
                            ':shs_school_id' => $schoolDbId,
                            ':subject'       => (string)$subj,
                            ':required'      => (int)round((float)($r['required'][$subj] ?? 0)),
                            ':existing'      => (int)round((float)($r['existing'][$subj] ?? 0)),
                            ':transfer_out'  => (int)round((float)($r['transferOut'][$subj] ?? 0)),
                            ':transfer_in'   => (int)round((float)($r['transferIn'][$subj] ?? 0)),
                        ]);
                    }
                }
            }

            // 5. Sync Deployments
            if (isset($payload['deploymentRecords']) && is_array($payload['deploymentRecords'])) {
                $pdo->exec("DELETE FROM `deployments`");

                $hasRemarks = false;
                try {
                    $cols = $pdo->query("SHOW COLUMNS FROM `deployments` LIKE 'remarks'")->fetchAll();
                    $hasRemarks = !empty($cols);
                } catch (Throwable $e) {}

                if ($hasRemarks) {
                    $stmtDep = $pdo->prepare("
                        INSERT INTO `deployments` (
                            `category`, `last_name`, `first_name`, `middle_name`,
                            `school_name`, `to_school_name`, `subject`,
                            `current_position`, `date_added`, `transfer_type`, `remarks`
                        ) VALUES (
                            :category, :last_name, :first_name, :middle_name,
                            :school_name, :to_school_name, :subject,
                            :current_position, :date_added, :transfer_type, :remarks
                        )
                    ");
                } else {
                    $stmtDep = $pdo->prepare("
                        INSERT INTO `deployments` (
                            `category`, `last_name`, `first_name`, `middle_name`,
                            `school_name`, `to_school_name`, `subject`,
                            `current_position`, `date_added`, `transfer_type`
                        ) VALUES (
                            :category, :last_name, :first_name, :middle_name,
                            :school_name, :to_school_name, :subject,
                            :current_position, :date_added, :transfer_type
                        )
                    ");
                }

                foreach ($payload['deploymentRecords'] as $d) {
                    $dateAdded = trim((string)($d['dateAdded'] ?? ''));
                    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateAdded)) {
                        $dateAdded = date('Y-m-d');
                    }
                    $params = [
                        ':category'         => (string)($d['category'] ?? 'ES'),
                        ':last_name'        => trim((string)($d['lastName'] ?? '')),
                        ':first_name'       => trim((string)($d['firstName'] ?? '')),
                        ':middle_name'      => trim((string)($d['middleName'] ?? '')),
                        ':school_name'      => trim((string)($d['schoolName'] ?? '')),
                        ':to_school_name'   => !empty($d['toSchoolName']) ? trim((string)$d['toSchoolName']) : null,
                        ':subject'          => !empty($d['subject']) ? trim((string)$d['subject']) : null,
                        ':current_position' => trim((string)($d['currentPosition'] ?? 'TEACHER I')),
                        ':date_added'       => $dateAdded,
                        ':transfer_type'    => ($d['transferType'] ?? 'IN') === 'OUT' ? 'OUT' : 'IN',
                    ];
                    if ($hasRemarks) {
                        $params[':remarks'] = !empty($d['remarks']) ? trim((string)$d['remarks']) : null;
                    }
                    $stmtDep->execute($params);
                }
            }

            // Mark in tna_settings that user data has been synced
            $stmtSetting->execute([
                ':k' => 'is_synced',
                ':v' => '1',
            ]);

            $pdo->commit();

            try {
                $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
            } catch (Throwable $ignored) {}

            echo json_encode([
                'status'  => 'success',
                'message' => 'All TNA records synced to MySQL database.',
            ]);
            exit;
        } catch (Throwable $txErr) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            try {
                $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
            } catch (Throwable $ignored) {}

            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Database Sync Failed: ' . $txErr->getMessage(),
                'file'    => basename($txErr->getFile()) . ':' . $txErr->getLine(),
            ]);
            exit;
        }
    }

    // Default / GET action=load: Read all records from MySQL
    $settings = [];
    try {
        $rows = $pdo->query("SELECT `setting_key`, `setting_value` FROM `tna_settings`")->fetchAll();
        foreach ($rows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
    } catch (Throwable $ignored) {
    }

    $schoolYear  = isset($settings['school_year']) && trim($settings['school_year']) !== ''
        ? trim($settings['school_year'])
        : '2025–2026';
    $jhsSubjects = isset($settings['jhs_subjects']) ? json_decode($settings['jhs_subjects'], true) : null;
    $shsSubjects = isset($settings['shs_subjects']) ? json_decode($settings['shs_subjects'], true) : null;
    // Load ES
    $esRows = $pdo->query("SELECT * FROM `es_schools` ORDER BY `id` ASC")->fetchAll();
    $esRecords = array_map(function ($r) {
        return [
            'id'          => (string)$r['id'],
            'schoolId'    => (string)$r['school_id'],
            'schoolName'  => (string)$r['school_name'],
            'required'    => (int)$r['required'],
            'existing'    => (int)$r['existing'],
            'transferOut' => (int)$r['transfer_out'],
            'transferIn'  => (int)$r['transfer_in'],
        ];
    }, $esRows);

    // Load JHS
    $jhsSchoolRows = $pdo->query("SELECT * FROM `jhs_schools` ORDER BY `id` ASC")->fetchAll();
    $jhsNeedRows   = $pdo->query("SELECT * FROM `jhs_subject_needs`")->fetchAll();
    $jhsNeedsBySchool = [];
    foreach ($jhsNeedRows as $nr) {
        $sid = (int)$nr['jhs_school_id'];
        $jhsNeedsBySchool[$sid][$nr['subject']] = $nr;
    }
    $jhsRecords = array_map(function ($s) use ($jhsNeedsBySchool) {
        $sid = (int)$s['id'];
        $subMap = $jhsNeedsBySchool[$sid] ?? [];
        $req = [];
        $exist = [];
        $tout = [];
        $tin = [];
        foreach ($subMap as $subj => $vals) {
            $req[$subj]   = (int)$vals['required'];
            $exist[$subj] = (int)$vals['existing'];
            $tout[$subj]  = (int)$vals['transfer_out'];
            $tin[$subj]   = (int)$vals['transfer_in'];
        }
        return [
            'id'          => (string)$s['id'],
            'schoolId'    => (string)$s['school_id'],
            'schoolName'  => (string)$s['school_name'],
            'required'    => $req,
            'existing'    => $exist,
            'transferOut' => $tout,
            'transferIn'  => $tin,
        ];
    }, $jhsSchoolRows);

    // Load SHS
    $shsSchoolRows = $pdo->query("SELECT * FROM `shs_schools` ORDER BY `id` ASC")->fetchAll();
    $shsNeedRows   = $pdo->query("SELECT * FROM `shs_subject_needs`")->fetchAll();
    $shsNeedsBySchool = [];
    foreach ($shsNeedRows as $nr) {
        $sid = (int)$nr['shs_school_id'];
        $shsNeedsBySchool[$sid][$nr['subject']] = $nr;
    }
    $shsRecords = array_map(function ($s) use ($shsNeedsBySchool) {
        $sid = (int)$s['id'];
        $subMap = $shsNeedsBySchool[$sid] ?? [];
        $req = [];
        $exist = [];
        $tout = [];
        $tin = [];
        foreach ($subMap as $subj => $vals) {
            $req[$subj]   = (int)$vals['required'];
            $exist[$subj] = (int)$vals['existing'];
            $tout[$subj]  = (int)$vals['transfer_out'];
            $tin[$subj]   = (int)$vals['transfer_in'];
        }
        return [
            'id'          => (string)$s['id'],
            'schoolId'    => (string)$s['school_id'],
            'schoolName'  => (string)$s['school_name'],
            'required'    => $req,
            'existing'    => $exist,
            'transferOut' => $tout,
            'transferIn'  => $tin,
        ];
    }, $shsSchoolRows);

    // Load Deployments
    $depRows = $pdo->query("SELECT * FROM `deployments` ORDER BY `id` ASC")->fetchAll();
    $deploymentRecords = array_map(function ($d) {
        return [
            'id'              => (string)$d['id'],
            'category'        => (string)$d['category'],
            'lastName'        => (string)$d['last_name'],
            'firstName'       => (string)$d['first_name'],
            'middleName'      => (string)$d['middle_name'],
            'schoolName'      => (string)$d['school_name'],
            'toSchoolName'    => $d['to_school_name'] ? (string)$d['to_school_name'] : null,
            'subject'         => $d['subject'] ? (string)$d['subject'] : null,
            'currentPosition' => (string)$d['current_position'],
            'dateAdded'       => (string)$d['date_added'],
            'transferType'    => (string)$d['transfer_type'],
            'remarks'         => $d['remarks'] ? (string)$d['remarks'] : null,
        ];
    }, $depRows);

    $dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?? 'depedlapulapu_tna';
    $hasDbRecords = (!empty($esRecords) || !empty($jhsRecords) || !empty($shsRecords));
    $isSynced = ($settings['is_synced'] ?? '0') === '1' || $hasDbRecords;

    echo json_encode([
        'status'        => 'success',
        'message'       => 'Backend connected successfully!',
        'database'      => 'connected',
        'database_name' => $dbName,
        'server_time'   => date('Y-m-d H:i:s'),
        'api_version'   => '1.7.0',
        'isSynced'      => $isSynced,
        'data'          => [
            'schoolYear'        => $schoolYear,
            'jhsSubjects'       => $jhsSubjects,
            'shsSubjects'       => $shsSubjects,
            'esRecords'         => $esRecords,
            'jhsRecords'        => $jhsRecords,
            'shsRecords'        => $shsRecords,
            'deploymentRecords' => $deploymentRecords,
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'   => 'error',
        'message'  => 'Backend error: ' . $e->getMessage(),
        'database' => 'disconnected',
    ]);
}
