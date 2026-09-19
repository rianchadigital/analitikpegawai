<?php
/**
 * Google Spreadsheet Sync Proxy for Hostinger Apache/PHP Environment
 * Puskesmas Kepulauan Seribu Selatan
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$spreadsheetId = isset($_GET['spreadsheetId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['spreadsheetId']) : '1ykpLnIE8305uphJMvXOdPuwb8T_mkQsnw8GOmByLFko';
$gid = isset($_GET['gid']) ? preg_replace('/[^0-9]/', '', $_GET['gid']) : '1900197277';

$gvizUrl = "https://docs.google.com/spreadsheets/d/{$spreadsheetId}/gviz/tq?tqx=out:csv&gid={$gid}";

$csvData = false;

// Try cURL first
if (function_exists('curl_init')) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $gvizUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $csvData = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        $csvData = false;
    }
}

// Fallback to file_get_contents if cURL failed
if (!$csvData && ini_get('allow_url_fopen')) {
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n",
            'timeout' => 20
        ]
    ];
    $context = stream_context_create($opts);
    $csvData = @file_get_contents($gvizUrl, false, $context);
}

if (!$csvData || strlen($csvData) < 100) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Gagal mengambil data dari Google Spreadsheet via PHP cURL/stream.'
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'csv' => $csvData,
    'timestamp' => date('Y-m-d H:i:s')
]);
