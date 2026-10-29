<?php
// index.php - Router / entrypoint

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);

if (isset($_GET['health']) || $uri === '/health') {
    require_once __DIR__ . '/health.php';
    exit;
}

require_once __DIR__ . '/api.php';
