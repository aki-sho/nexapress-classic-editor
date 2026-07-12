<?php

namespace NexaPressClassicEditor;

use app\Core\Auth;
use app\Models\Media;

/*
 * NexaPressの画像一覧をJSONで返す
 */
class MediaController
{
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
}