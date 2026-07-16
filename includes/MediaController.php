<?php

namespace NexaPressClassicEditor;

use app\Core\Auth;
use app\Models\Media;

/*
 * NexaPressの画像一覧をJSONで返す
 */
class MediaController
{
    /*
     * 登録可能な画像形式
     */
    private array $allowedImageTypes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];

    /*
     * 最大アップロードサイズ：100MB
     */
    private int $maxUploadSize = 104857600;

    public function index(): void
    {
        Auth::requireLogin();

        $mediaItems = array_filter(
            Media::all(),
            function (array $media): bool {
                return ($media['file_type'] ?? '') === 'image';
            }
        );

        $images = array_map(
            function (array $media): array {
                return [
                    'id' => (int)($media['id'] ?? 0),
                    'title' => (string)($media['title'] ?? ''),
                    'description' => (string)(
                        $media['description'] ?? ''
                    ),
                    'url' => public_url(
                        (string)($media['file_path'] ?? '')
                    ),
                ];
            },
            array_values($mediaItems)
        );

        header('Content-Type: application/json; charset=UTF-8');

        echo json_encode(
            ['images' => $images],
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES
        );
    }

    /*
     * 新しい画像を登録
     */
    public function upload(): void
    {
        Auth::requireLogin();

        if (
            empty($_FILES['media_file']) ||
            ($_FILES['media_file']['error'] ?? UPLOAD_ERR_NO_FILE)
                !== UPLOAD_ERR_OK
        ) {
            $this->respond(
                ['message' => '画像を選択してください。'],
                422
            );
        }

        $file = $_FILES['media_file'];
        $fileSize = (int)($file['size'] ?? 0);

        if (
            $fileSize < 1 ||
            $fileSize > $this->maxUploadSize
        ) {
            $this->respond(
                ['message' => '画像サイズは100MB以下にしてください。'],
                422
            );
        }

        $mimeType = (string)mime_content_type(
            $file['tmp_name']
        );

        if (!isset($this->allowedImageTypes[$mimeType])) {
            $this->respond(
                [
                    'message' =>
                        'JPG、PNG、GIF、WebPのみ登録できます。',
                ],
                422
            );
        }

        $uploadDirectory =
            BASE_PATH . '/public/uploads/media';

        if (
            !is_dir($uploadDirectory) &&
            !mkdir($uploadDirectory, 0755, true) &&
            !is_dir($uploadDirectory)
        ) {
            $this->respond(
                ['message' => '保存先を作成できませんでした。'],
                500
            );
        }

        $originalName = basename(
            str_replace(
                '\\',
                '/',
                (string)($file['name'] ?? '')
            )
        );

        $title = pathinfo(
            $originalName,
            PATHINFO_FILENAME
        );

        if ($title === '') {
            $title = '無題';
        }

        $extension =
            $this->allowedImageTypes[$mimeType];

        $safeFileName =
            date('YmdHis')
            . '_'
            . bin2hex(random_bytes(8))
            . '.'
            . $extension;

        $targetPath =
            $uploadDirectory . '/' . $safeFileName;

        if (
            !move_uploaded_file(
                $file['tmp_name'],
                $targetPath
            )
        ) {
            $this->respond(
                ['message' => '画像を保存できませんでした。'],
                500
            );
        }

        $user = Auth::user();

        try {
            Media::create([
                'title' => $title,
                'description' => '',
                'original_name' => $originalName,
                'file_name' => $safeFileName,
                'file_path' =>
                    'uploads/media/' . $safeFileName,
                'mime_type' => $mimeType,
                'file_size' => $fileSize,
                'file_type' => 'image',
                'user_id' => (int)($user['id'] ?? 0),
            ]);
        } catch (\Throwable $exception) {
            if (is_file($targetPath)) {
                unlink($targetPath);
            }

            $this->respond(
                ['message' => '画像情報を登録できませんでした。'],
                500
            );
        }

        $this->respond([
            'message' => '画像を登録しました。',
        ]);
    }

    /*
     * JSONを返す
     */
    private function respond(
        array $data,
        int $statusCode = 200
    ): void {
        http_response_code($statusCode);

        header(
            'Content-Type: application/json; charset=UTF-8'
        );

        echo json_encode(
            $data,
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES
        );

        exit;
    }
}