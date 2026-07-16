<?php

/*
 * NexaPressのフック機能が使用できない場合は終了
 */
if (!function_exists('add_action')) {
    return;
}

/*
 * メディア一覧用コントローラーを読み込む
 */
require_once __DIR__ . '/includes/MediaController.php';

/*
 * メディア画像一覧用のURLを登録
 */
if (
    isset($router) &&
    $router instanceof \app\Core\Router
) {
    $router->get(
        '/admin/extensions/classic-editor/media',
        'NexaPressClassicEditor\MediaController@index'
    );

    $router->post(
        '/admin/extensions/classic-editor/media/upload',
        'NexaPressClassicEditor\MediaController@upload'
    );
}

/*
 * 管理画面で使用するCSSを読み込む
 */
add_action('admin_head', function (): void {
    $cssFiles = [
        __DIR__ . '/assets/css/editor.css',
        __DIR__ . '/assets/css/toolbar.css',
        __DIR__ . '/assets/css/modes.css',
        __DIR__ . '/assets/css/fullscreen.css',
        __DIR__ . '/assets/css/media.css',
        __DIR__ . '/assets/css/html-templates.css',
    ];

    foreach ($cssFiles as $cssFile) {
        if (!is_file($cssFile)) {
            continue;
        }

        echo '<style>';
        readfile($cssFile);
        echo '</style>';
    }
});

/*
 * 管理画面で使用するJavaScriptを読み込む
 */
add_action('admin_footer', function (): void {
    /*
     * JavaScriptへメディア一覧URLを渡す
     */
    $config = [
        'mediaUrl' => url(
            'admin/extensions/classic-editor/media'
        ),

        'mediaUploadUrl' => url(
            'admin/extensions/classic-editor/media/upload'
        ),
    ];

    echo '<script>';
    echo 'window.NexaPressClassicEditorConfig = ';

    echo json_encode(
        $config,
        JSON_UNESCAPED_SLASHES |
        JSON_HEX_TAG |
        JSON_HEX_AMP |
        JSON_HEX_APOS |
        JSON_HEX_QUOT
    );

    echo ';</script>';

    /*
     * 依存関係があるため、この順番で読み込む
     */
    $jsFiles = [
        __DIR__ . '/assets/js/sanitizer.js',
        __DIR__ . '/assets/js/selection.js',
        __DIR__ . '/assets/js/toolbar.js',
        __DIR__ . '/assets/js/modes.js',
        __DIR__ . '/assets/js/link.js',
        __DIR__ . '/assets/js/fullscreen.js',
        __DIR__ . '/assets/js/media.js',
        __DIR__ . '/assets/js/template.js',
        __DIR__ . '/assets/js/html-template-data.js',
        __DIR__ . '/assets/js/html-templates.js',
        __DIR__ . '/assets/js/main.js',
    ];

    foreach ($jsFiles as $jsFile) {
        if (!is_file($jsFile)) {
            continue;
        }

        echo '<script>';
        readfile($jsFile);
        echo '</script>';
    }
});