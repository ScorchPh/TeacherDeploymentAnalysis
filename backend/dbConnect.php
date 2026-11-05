<?php

// Function to load .env variables
function loadEnv(string $filePath): void
{
    if (!file_exists($filePath)) {
        throw new Exception(".env file not found at: " . $filePath);
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);

        // Skip comments and empty lines
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        // Split key and value
        if (str_contains($line, '=')) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            // Strip surrounding single or double quotes
            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
            putenv("{$key}={$value}");
        }
    }
}

// Load .env from the same directory or parent/backend directory
$envCandidates = [
    __DIR__ . '/.env',
    dirname(__DIR__) . '/.env',
    __DIR__ . '/backend/.env',
    dirname(__DIR__) . '/backend/.env',
];
$envLoaded = false;
foreach ($envCandidates as $candidate) {
    if (file_exists($candidate)) {
        loadEnv($candidate);
        $envLoaded = true;
        break;
    }
}
if (!$envLoaded) {
    loadEnv(__DIR__ . '/.env');
}

// Retrieve database credentials
$host     = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'localhost';
$dbName   = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?? 'tna';
$user     = $_ENV['DB_USER'] ?? getenv('DB_USER') ?? 'root';
$password = $_ENV['DB_PASSWORD'] ?? $_ENV['DB_PASS'] ?? getenv('DB_PASSWORD') ?? getenv('DB_PASS') ?? '';
$charset  = 'utf8mb4';

// Data Source Name
$dsn = "mysql:host={$host};dbname={$dbName};charset={$charset}";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

$pdo = null;
try {
    $pdo = new PDO($dsn, $user, $password, $options);
} catch (PDOException $firstErr) {
    // Fallback 1: Try depedlapulapu_tna if DB_NAME in .env was set to TNA on Plesk hosting
    if ($dbName !== 'depedlapulapu_tna') {
        try {
            $fallbackDb = 'depedlapulapu_tna';
            $fallbackDsn = "mysql:host={$host};dbname={$fallbackDb};charset={$charset}";
            $pdo = new PDO($fallbackDsn, $user, $password, $options);
            $dbName = $fallbackDb;
            $_ENV['DB_NAME'] = $dbName;
        } catch (PDOException $ignored) {
        }
    }

    // Fallback 2: Auto-create database if MySQL server is reachable but DB does not exist yet
    if ($pdo === null) {
        try {
            $serverPdo = new PDO("mysql:host={$host};charset={$charset}", $user, $password, $options);
            $safeDb = preg_replace('/[^a-zA-Z0-9_]/', '', $dbName) ?: 'TNA';
            $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$safeDb}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo = new PDO("mysql:host={$host};dbname={$safeDb};charset={$charset}", $user, $password, $options);
            $dbName = $safeDb;
            $_ENV['DB_NAME'] = $dbName;
        } catch (PDOException $ignored) {
        }
    }

    if ($pdo === null && empty($GLOBALS['TNA_ALLOW_DB_FALLBACK'])) {
        if (php_sapi_name() === 'cli') {
            echo "Database connection failed: " . $firstErr->getMessage() . PHP_EOL;
            exit(1);
        } else {
            http_response_code(500);
            header('Access-Control-Allow-Origin: *');
            header('Content-Type: application/json');
            echo json_encode([
                'status'  => 'error',
                'message' => 'Database connection failed: ' . $firstErr->getMessage()
            ]);
            exit;
        }
    }
}

// Function to get the PDO instance
function getDbConnection(): ?PDO
{
    global $pdo;
    return $pdo;
}

// If directly executed via CLI (php dbConnect.php), confirm connection
if (php_sapi_name() === 'cli' && realpath($argv[0] ?? '') === realpath(__FILE__)) {
    echo "Database connection successful to '{$dbName}' on '{$host}'!" . PHP_EOL;
}
