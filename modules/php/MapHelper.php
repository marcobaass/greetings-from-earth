<?php
// BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
// GreetingsFromEarth implementation : © Marco Baaß <picture@marcobaass.com>
// This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
// See http://en.boardgamearena.com/#!doc/Studio for more information.
declare(strict_types=1);

// Turns grid position into a string key for convenient comparison [x,y] → "x,y"
function cellKey(int $x, int $y): string {
    return "$x,$y";
}

// Returns the cell type at the given grid position [x,y]
function getCellType(int $x, int $y): int {
    return BERLIN_MAP[$y][$x];
}

// collect every S.Bahn cell into an array of "x,y" keys
function getSbahnCellSet(): array {
    $refs = [];

    foreach (BERLIN_MAP as $y => $row) {
        foreach ($row as $x => $cellType) {
            if ($cellType === CELL_SBAHN) {
                $refs[cellKey($x, $y)] = true;
            }
        }
    }
    return $refs;
}
