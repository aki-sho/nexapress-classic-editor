<?php

/*
 * クラシックエディターの配布用ZIPを作成する
 */

$projectDirectory = __DIR__;
$manifestFile = $projectDirectory . '/manifest.json';

/*
 * 必須ファイルを確認
 */
if (!is_file($manifestFile)) {
    exit("manifest.jsonが見つかりません。\n");
}

if (!class_exists(ZipArchive::class)) {
    exit("PHPのZipArchiveが使用できません。\n");
}

/*
 * manifest.jsonからバージョンを取得
 */
try {
    $manifest = json_decode(
        file_get_contents($manifestFile),
        true,
        512,
        JSON_THROW_ON_ERROR
    );
} catch (JsonException $exception) {
    exit("manifest.jsonの形式が正しくありません。\n");
}

$version = trim((string)($manifest['version'] ?? ''));

if ($version === '') {
    exit("拡張機能のバージョンが設定されていません。\n");
}

/*
 * ZIP出力先を準備
 */
$outputDirectory = $projectDirectory . '/dist';
$outputFile = $outputDirectory
    . '/classic-editor-v'
    . $version
    . '.zip';

if (!is_dir($outputDirectory)) {
    mkdir($outputDirectory, 0755, true);
}

if (is_file($outputFile)) {
    unlink($outputFile);
}

/*
 * ZIPファイルを作成
 */
$zip = new ZipArchive();

if (
    $zip->open(
        $outputFile,
        ZipArchive::CREATE | ZipArchive::OVERWRITE
    ) !== true
) {
    exit("ZIPファイルを作成できませんでした。\n");
}

/*
 * ZIP内の一番上のフォルダ名
 */
$extensionDirectory = 'classic-editor';

/*
 * ZIPへ含めないファイルとフォルダ
 */
$excludedPaths = [
    '.git',
    '.github',
    'dist',
    'build.php',
    '.gitignore',
];

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator(
        $projectDirectory,
        FilesystemIterator::SKIP_DOTS
    ),
    RecursiveIteratorIterator::LEAVES_ONLY
);

/*
 * 拡張機能のファイルをZIPへ追加
 */
foreach ($iterator as $file) {
    if (!$file->isFile()) {
        continue;
    }

    $relativePath = substr(
        $file->getPathname(),
        strlen($projectDirectory) + 1
    );

    $relativePath = str_replace(
        DIRECTORY_SEPARATOR,
        '/',
        $relativePath
    );

    $topDirectory = explode('/', $relativePath)[0];

    if (in_array($topDirectory, $excludedPaths, true)) {
        continue;
    }

    if (in_array($relativePath, $excludedPaths, true)) {
        continue;
    }

    $zipPath = $extensionDirectory
        . '/'
        . $relativePath;

    $zip->addFile(
        $file->getPathname(),
        $zipPath
    );
}

$zip->close();

echo "ZIPファイルを作成しました。\n";
echo $outputFile . "\n";