<?php
// api.php - Backend API Entry Point & Health Check

require_once __DIR__ . '/cors.php';

header('Content-Type: application/json; charset=UTF-8');

try {
    require_once __DIR__ . '/dbConnect.php';
    $pdo = getDbConnection();

    // Query server timestamp or simple validation
    $dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?? 'TNC';
    
    echo json_encode([
        'status'    => 'success',
        'message'   => 'Backend connected successfully!',
        'database'  => 'connected',
        'database_name' => $dbName,
        'server_time' => date('Y-m-d H:i:s'),
        'api_version' => '1.0.0'
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'   => 'error',
        'message'  => 'Backend error: ' . $e->getMessage(),
        'database' => 'disconnected'
    ]);
}
