<?php
// health.php - Comprehensive Backend & Database Health Check

require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=UTF-8');

$startTime = microtime(true);
$overallStatus = 'ok';
$httpCode = 200;

// 1. System checks
$system = [
    'php_version'  => PHP_VERSION,
    'php_sapi'     => php_sapi_name(),
    'os'           => PHP_OS,
    'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB',
    'memory_peak'  => round(memory_get_peak_usage(true) / 1024 / 1024, 2) . ' MB',
];

// 2. Environment file check
$envPath = __DIR__ . '/.env';
$envLoaded = file_exists($envPath);
$envCheck = [
    'status'     => $envLoaded ? 'up' : 'down',
    'env_exists' => $envLoaded,
    'path'       => basename($envPath)
];

// 3. Database check
$dbCheck = [
    'status'        => 'down',
    'database'      => null,
    'host'          => null,
    'latency_ms'    => null,
    'tables_count'  => 0,
    'message'       => null
];

try {
    // Load .env if function exists or load directly
    if (file_exists($envPath)) {
        require_once __DIR__ . '/dbConnect.php';
        $pdo = getDbConnection();

        $dbHost = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'localhost';
        $dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?? 'TNA';

        $dbCheck['host'] = $dbHost;
        $dbCheck['database'] = $dbName;

        // Measure query latency
        $queryStart = microtime(true);
        $ping = $pdo->query('SELECT 1')->fetchColumn();
        $queryEnd = microtime(true);
        $latencyMs = round(($queryEnd - $queryStart) * 1000, 2);

        // Fetch tables count
        $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);

        $dbCheck['status']       = ($ping == 1) ? 'up' : 'degraded';
        $dbCheck['latency_ms']   = $latencyMs;
        $dbCheck['tables_count'] = count($tables);
        $dbCheck['message']      = 'Database connected and query executed successfully.';
    } else {
        $dbCheck['message'] = '.env file not found in backend directory.';
        $overallStatus = 'error';
        $httpCode = 503;
    }
} catch (Throwable $e) {
    $dbCheck['status']  = 'down';
    $dbCheck['message'] = $e->getMessage();
    $overallStatus      = 'error';
    $httpCode           = 503;
}

if ($dbCheck['status'] !== 'up') {
    $overallStatus = 'error';
    $httpCode = 503;
}

// Compute total execution time
$totalDurationMs = round((microtime(true) - $startTime) * 1000, 2);

http_response_code($httpCode);

$response = [
    'status'       => $overallStatus,
    'status_code'  => $httpCode,
    'timestamp'    => date('c'),
    'server_time'  => date('Y-m-d H:i:s'),
    'duration_ms'  => $totalDurationMs,
    'system'       => $system,
    'checks'       => [
        'database'    => $dbCheck,
        'environment' => $envCheck,
    ]
];

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
