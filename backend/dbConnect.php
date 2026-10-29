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

// Load .env from the same directory
loadEnv(__DIR__ . '/.env');

// Retrieve database credentials
$host     = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'localhost';
$dbName   = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?? 'tna';
$user     = $_ENV['DB_USER'] ?? getenv('DB_USER') ?? 'root';
$password = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?? '';
$charset  = 'utf8mb4';

// Data Source Name
$dsn = "mysql:host={$host};dbname={$dbName};charset={$charset}";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $password, $options);

    // Auto-heal / Ensure required columns exist on sheets table across any hosting
    try {
        $sheetsCheck = $pdo->query("SHOW COLUMNS FROM sheets LIKE 'column_types_json'");
        if ($sheetsCheck && $sheetsCheck->rowCount() === 0) {
            $pdo->exec("ALTER TABLE sheets ADD COLUMN column_types_json JSON NULL AFTER columns_json");
        }
        $optionsCheck = $pdo->query("SHOW COLUMNS FROM sheets LIKE 'column_options_json'");
        if ($optionsCheck && $optionsCheck->rowCount() === 0) {
            $pdo->exec("ALTER TABLE sheets ADD COLUMN column_options_json TEXT NULL AFTER column_types_json");
        }
    } catch (\Throwable $ignored) {
    }
} catch (PDOException $e) {
    // If run from CLI, print error; otherwise, return a 500 JSON response
    if (php_sapi_name() === 'cli') {
        echo "Database connection failed: " . $e->getMessage() . PHP_EOL;
        exit(1);
    } else {
        http_response_code(500);
        header('Access-Control-Allow-Origin: *');
        header('Content-Type: application/json');
        echo json_encode([
            'status'  => 'error',
            'message' => 'Database connection failed: ' . $e->getMessage()
        ]);
        exit;
    }
}

// Function to get the PDO instance
function getDbConnection(): PDO
{
    global $pdo;
    return $pdo;
}

// If directly executed via CLI (php dbConnect.php), confirm connection
if (php_sapi_name() === 'cli' && realpath($argv[0] ?? '') === realpath(__FILE__)) {
    echo "Database connection successful to '{$dbName}' on '{$host}'!" . PHP_EOL;
}
