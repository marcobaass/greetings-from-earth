<?php

// Cell type constants
const CELL_EMPTY        = 0;
const CELL_RIVER        = 1;
const CELL_SBAHN        = 2;
const CELL_MUSTSEE      = 3;
const CELL_COLLECTION   = 4;
const CELL_CURRYWURST   = 5;
const CELL_ESCOOTER     = 6;
const CELL_GRAFFITI     = 7;
const CELL_MONUMENT     = 8;
const CELL_UFO          = 9;

// Tile type constants
const TILE_I4  = 'I4';   // straight 4-square
const TILE_U5  = 'U5';   // U-shape 5-square
const TILE_L4  = 'L4';   // L-shape 4-square
const TILE_T4  = 'T4';   // T-shape 4-square
const TILE_SZ4 = 'SZ4';  // S/Z-shape 4-square
const TILE_L5  = 'L5';   // L-shape 5-square

// Dice wheel — roll => [option A, option B]
const DICE_WHEEL = [
    1 => [TILE_I4,  TILE_U5],
    2 => [TILE_U5,  TILE_L4],
    3 => [TILE_L4,  TILE_T4],
    4 => [TILE_SZ4, TILE_T4],
    5 => [TILE_L5,  TILE_SZ4],
    6 => [TILE_L5,  TILE_I4],
];

// Tile shapes — array of [dx, dy] offsets from anchor cell
// All tiles can be rotated and mirrored by the player
const TILE_SHAPES = [
    TILE_I4  => [[0,0],[1,0],[2,0],[3,0]],
    TILE_U5  => [[0,0],[1,0],[2,0],[0,1],[2,1]],
    TILE_L4  => [[0,0],[0,1],[0,2],[1,2]],
    TILE_T4  => [[0,0],[1,0],[2,0],[1,1]],
    TILE_SZ4 => [[0,0],[1,0],[1,1],[2,1]],
    TILE_L5  => [[0,0],[0,1],[0,2],[0,3],[1,3]],
];

// Berlin map — 18 columns x 13 rows, top-left = (0,0)
const BERLIN_MAP = [
    [4,0,0,3,3,3,0,0,2,7,0,4,0,0,0,5,0,4], // y=0
    [0,5,0,0,0,6,0,0,0,0,0,0,0,0,3,0,0,0], // y=1
    [6,1,1,1,0,1,0,1,1,1,1,1,6,0,3,3,3,6], // y=2
    [0,0,4,0,0,8,0,9,0,0,8,1,1,0,0,0,3,0], // y=3
    [7,0,0,0,7,0,0,0,0,0,0,7,1,0,8,0,0,0], // y=4
    [2,0,0,0,0,0,3,0,4,1,0,0,0,0,0,0,0,2], // y=5
    [0,0,8,9,0,3,3,0,0,0,0,5,1,1,0,3,0,0], // y=6
    [0,0,0,0,3,3,3,7,0,8,0,7,0,1,1,3,0,6], // y=7
    [5,0,0,0,0,0,0,0,0,0,0,0,4,0,9,3,1,1], // y=8
    [0,0,0,6,0,8,0,0,4,0,5,0,0,0,0,3,0,1], // y=9
    [9,3,0,0,0,0,0,1,0,0,0,0,0,0,7,0,0,0], // y=10
    [3,1,3,7,0,4,0,0,0,0,6,3,3,3,0,0,0,3], // y=11
    [0,3,0,0,0,0,0,7,2,0,0,3,3,3,0,5,0,3], // y=12
];

// Must-see clusters — groups of cells that must all be covered to score
const BERLIN_MUSTSEE_CLUSTERS = [
    'A' => [[3,0],[4,0],[5,0]],
    'B' => [[14,1],[14,2],[15,2],[16,2],[16,3]],
    'C' => [[6,5],[5,6],[6,6],[4,7],[5,7],[6,7]],
    'F' => [[15,6],[15,7],[15,8],[15,9]],
    'G' => [[1,10],[0,11],[2,11],[1,12]],
    'H' => [[11,11],[12,11],[13,11],[11,12],[12,12],[13,12]],
    'I' => [[17,11],[17,12]],
];

// Must-see scoring track — points per cluster completed (in order)
const BERLIN_MUSTSEE_SCORES = [5, 10, 10, 15, 15, 20, 20];

// Monument scoring track — points per monument surrounded (in order)
const BERLIN_MONUMENT_SCORES = [1, 1, 2, 2, 3, 3];

// Collection ball scoring track — 2 points each, up to 8 balls
const BERLIN_COLLECTION_SCORES = [2, 2, 2, 2, 2, 2, 2, 2];

// Collection ball scoring track — 2 points each, up to 8 balls
const BERLIN_UFO_SCORES = [0, 20, 0, 40];

// TODO: add the scoring for Street Art

// S-Bahn start positions — players can start adjacent to any of these
const BERLIN_SBAHN_POSITIONS = [
    [8,0], [0,5], [17,5], [8,12]
];

// Game length
const TOTAL_ROUNDS = 14;