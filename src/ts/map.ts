const CELL_RIVER = 1
const CELL_SBAHN = 2
const CELL_MONUMENT = 8

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

export const FORBIDDEN_CELL_TYPES = new Set([CELL_RIVER, CELL_SBAHN, CELL_MONUMENT])

// Turns grid position into a string key for convenient comparison [x,y] → "x,y"
export const cellKey = (x: number, y: number) => `${x},${y}`

// Returns the cell type at the given grid position [x,y]
export const getCellType = (x: number, y: number) => {
    return BERLIN_MAP[y][x]
}

// Street art grid (4 columns × 5 rows) — mirrors BERLIN_STREET_ART_MAP in constants.inc.php
const STREET_ART_START = 0
const BERLIN_STREET_ART_MAP = [
    [10, 3, 4, 4], // y=0
    [2, 2, 3, 9],  // y=1
    [1, 8, 2, 3],  // y=2
    [5, 1, 6, 2],  // y=3
    [0, 1, 1, 7],  // y=4
]

/**
 * Street art cells the player may mark next — mirrors Game::isLegalStreetArtCell (PHP):
 * not the start cell, not yet marked, orthogonally adjacent to the start cell or a marked cell.
 */
export function getLegalStreetArtCells(completed: string[]): [number, number][] {
    const marked = new Set(completed)
    const references = new Set(completed)
    for (let y = 0; y < BERLIN_STREET_ART_MAP.length; y++) {
        for (let x = 0; x < BERLIN_STREET_ART_MAP[y].length; x++) {
            if (BERLIN_STREET_ART_MAP[y][x] === STREET_ART_START) references.add(cellKey(x, y))
        }
    }

    const legal: [number, number][] = []
    for (let y = 0; y < BERLIN_STREET_ART_MAP.length; y++) {
        for (let x = 0; x < BERLIN_STREET_ART_MAP[y].length; x++) {
            if (BERLIN_STREET_ART_MAP[y][x] === STREET_ART_START || marked.has(cellKey(x, y))) continue
            const neighbours = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
            if (neighbours.some(([nx, ny]) => references.has(cellKey(nx, ny)))) legal.push([x, y])
        }
    }
    return legal
}

// getSbahnCellSet() → Set of "x,y" for all SBAHN cells
export function getSbahnCellSet() {
    const refs = new Set<string>()
    for (let y = 0; y < BERLIN_MAP.length; y++) {
        const row = BERLIN_MAP[y]
        for (let x = 0; x < row.length; x++) {
            if (row[x] === CELL_SBAHN) {
                refs.add(cellKey(x, y))
            }
        }
    }
    return refs
}