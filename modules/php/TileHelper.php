<?php
declare(strict_types=1);

/**
 * Apply a rotation to a shape
 * @param array $offsets - The offsets of the shape before rotation, mirror or anchor
 * @param int $rotation - The rotation to apply (0, 90, 180, 270)
 * @return array - The rotated shape
 */

function getShapeCells(string $tileType, int $anchorX, int $anchorY, int $rotation = 0, bool $mirror = false): array
{
    if (!isset(TILE_SHAPES[$tileType])) {
        return [];
    }

    $shape = TILE_SHAPES[$tileType];

    $effectiveRotation = $mirror ? (360 - $rotation) % 360 : $rotation;

    $rotated = applyRotation($shape, $effectiveRotation);
    $mirrored = $mirror ? applyMirror($rotated) : $rotated;

    $cells = [];
    foreach ($mirrored as $offset) {
        $cells[] = [$anchorX + $offset[0], $anchorY + $offset[1]];
    }
    return $cells;
}

function applyRotation(array $offsets, int $rotation): array { 
    $result = [];
    foreach ($offsets as $offset) {
        $dx = $offset[0];
        $dy = $offset[1];
        $newX = $dx;
        $newY = $dy;
        switch ($rotation) {
            case 0:
                break;
            case 90:
                $newX = -$dy;
                $newY = $dx;
                break;
            case 180:
                $newX = -$dx;
                $newY = -$dy;
                break;
            case 270:
                $newX = $dy;
                $newY = -$dx;
                break;
            }
        $result[] = [$newX, $newY];
    }
    return $result;
}

function applyMirror(array $offsets): array {
    $result = [];
    foreach ($offsets as $offset) {
        $result[] = [-$offset[0], $offset[1]];
    }
    return $result;
}