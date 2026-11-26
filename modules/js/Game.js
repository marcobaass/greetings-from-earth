const CELL_RIVER = 1;
const CELL_SBAHN = 2;
const CELL_MONUMENT = 8;
const BERLIN_MAP = [
    [4, 0, 0, 3, 3, 3, 0, 0, 2, 7, 0, 4, 0, 0, 0, 5, 0, 4], // y=0
    [0, 5, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0], // y=1
    [6, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 6, 0, 3, 3, 3, 6], // y=2
    [0, 0, 4, 0, 0, 8, 0, 9, 0, 0, 8, 1, 1, 0, 0, 0, 3, 0], // y=3
    [7, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 7, 1, 0, 8, 0, 0, 0], // y=4
    [2, 0, 0, 0, 0, 0, 3, 0, 4, 1, 0, 0, 0, 0, 0, 0, 0, 2], // y=5
    [0, 0, 8, 9, 0, 3, 3, 0, 0, 0, 0, 5, 1, 1, 0, 3, 0, 0], // y=6
    [0, 0, 0, 0, 3, 3, 3, 7, 0, 8, 0, 7, 0, 1, 1, 3, 0, 6], // y=7
    [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 9, 3, 1, 1], // y=8
    [0, 0, 0, 6, 0, 8, 0, 0, 4, 0, 5, 0, 0, 0, 0, 3, 0, 1], // y=9
    [9, 3, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0], // y=10
    [3, 1, 3, 7, 0, 4, 0, 0, 0, 0, 6, 3, 3, 3, 0, 0, 0, 3], // y=11
    [0, 3, 0, 0, 0, 0, 0, 7, 2, 0, 0, 3, 3, 3, 0, 5, 0, 3], // y=12
];
const FORBIDDEN_CELL_TYPES = new Set([CELL_RIVER, CELL_SBAHN, CELL_MONUMENT]);
// Turns grid position into a string key for convenient comparison [x,y] → "x,y"
const cellKey = (x, y) => `${x},${y}`;
// Returns the cell type at the given grid position [x,y]
const getCellType = (x, y) => {
    return BERLIN_MAP[y][x];
};
// Street art grid (4 columns × 5 rows) — mirrors BERLIN_STREET_ART_MAP in constants.inc.php
const STREET_ART_START = 0;
const BERLIN_STREET_ART_MAP = [
    [10, 3, 4, 4], // y=0
    [2, 2, 3, 9], // y=1
    [1, 8, 2, 3], // y=2
    [5, 1, 6, 2], // y=3
    [0, 1, 1, 7], // y=4
];
/**
 * Street art cells the player may mark next — mirrors Game::isLegalStreetArtCell (PHP):
 * not the start cell, not yet marked, orthogonally adjacent to the start cell or a marked cell.
 */
function getLegalStreetArtCells(completed) {
    const marked = new Set(completed);
    const references = new Set(completed);
    for (let y = 0; y < BERLIN_STREET_ART_MAP.length; y++) {
        for (let x = 0; x < BERLIN_STREET_ART_MAP[y].length; x++) {
            if (BERLIN_STREET_ART_MAP[y][x] === STREET_ART_START)
                references.add(cellKey(x, y));
        }
    }
    const legal = [];
    for (let y = 0; y < BERLIN_STREET_ART_MAP.length; y++) {
        for (let x = 0; x < BERLIN_STREET_ART_MAP[y].length; x++) {
            if (BERLIN_STREET_ART_MAP[y][x] === STREET_ART_START || marked.has(cellKey(x, y)))
                continue;
            const neighbours = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
            if (neighbours.some(([nx, ny]) => references.has(cellKey(nx, ny))))
                legal.push([x, y]);
        }
    }
    return legal;
}
// getSbahnCellSet() → Set of "x,y" for all SBAHN cells
function getSbahnCellSet() {
    const refs = new Set();
    for (let y = 0; y < BERLIN_MAP.length; y++) {
        const row = BERLIN_MAP[y];
        for (let x = 0; x < row.length; x++) {
            if (row[x] === CELL_SBAHN) {
                refs.add(cellKey(x, y));
            }
        }
    }
    return refs;
}

// Tile shapes — array of [dx, dy] offsets from anchor cell
// All tiles can be rotated and mirrored by the player
const TILE_SHAPES = {
    I4: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0]
    ],
    U5: [
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1],
        [2, 1]
    ],
    L4: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 2]
    ],
    T4: [
        [0, 0],
        [1, 0],
        [2, 0],
        [1, 1]
    ],
    SZ4: [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1]
    ],
    T5: [
        [0, 0],
        [0, 1],
        [-1, 2],
        [0, 2],
        [1, 2]
    ],
    I1: [[0, 0]],
    I2: [
        [0, 0],
        [1, 0]
    ],
    L3: [
        [0, 0],
        [0, 1],
        [1, 1]
    ],
    SQR6: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 0],
        [1, 1],
        [1, 2]
    ]
};
// Rotation/mirror pivot per tile — must be one of the tile's own offsets
const TILE_PIVOTS = {
    I4: [1, 0],
    U5: [1, 0],
    L4: [0, 1],
    T4: [1, 0],
    SZ4: [1, 1],
    T5: [0, 1],
    I1: [0, 0],
    I2: [0, 0],
    L3: [0, 1],
    SQR6: [0, 1]
};
/**
 * Must match PHP: eScooter grants I4 and Curry Sausage I2 (checkBonusTilesFromCells),
 * Street Art rewards grant the other shapes (STREET_ART_REWARDS).
 */
function getBonusSource(tileType) {
    if (tileType === "I4")
        return "escooter";
    if (tileType === "I2")
        return "currywurst";
    return "streetart";
}
/** Server anchor (offset [0,0]) for a tile whose pivot cell sits at pivotX/pivotY */
function pivotToAnchor(tileType, pivotX, pivotY, rotation = 0, mirror = false) {
    const shape = TILE_SHAPES[tileType];
    if (!shape)
        return [pivotX, pivotY];
    const [px, py] = TILE_PIVOTS[tileType] ?? [0, 0];
    const index = Math.max(0, shape.findIndex(([dx, dy]) => dx === px && dy === py));
    const [tx, ty] = getShapeCells(tileType, 0, 0, rotation, mirror)[index];
    return [pivotX - tx, pivotY - ty];
}
function getShapeCellsAroundPivot(tileType, pivotX, pivotY, rotation = 0, mirror = false) {
    const [ax, ay] = pivotToAnchor(tileType, pivotX, pivotY, rotation, mirror);
    return getShapeCells(tileType, ax, ay, rotation, mirror);
}
// Order: rotate, then mirror — must match PHP
function getShapeCells(tileType, anchorX, anchorY, rotation = 0, mirror = false) {
    if (!tileType || !TILE_SHAPES[tileType])
        return [];
    const shape = TILE_SHAPES[tileType];
    const effectiveRotation = mirror ? (360 - rotation) % 360 : rotation;
    const rotated = applyRotation(shape, effectiveRotation);
    const mirrored = mirror ? applyMirror(rotated) : rotated;
    return mirrored.map(([dx, dy]) => [anchorX + dx, anchorY + dy]);
}
function applyRotation(offsets, rotation = 0) {
    return offsets.map(([dx, dy]) => {
        let newX = dx;
        let newY = dy;
        switch (rotation) {
            case 0:
                break;
            case 90:
                newX = -dy;
                newY = dx;
                break;
            case 180:
                newX = -dx;
                newY = -dy;
                break;
            case 270:
                newX = dy;
                newY = -dx;
                break;
            default:
                break;
        }
        return [newX, newY];
    });
}
function applyMirror(offsets) {
    return offsets.map(([dx, dy]) => [-dx, dy]);
}
function isInsideGrid(cells) {
    return cells.every(([x, y]) => x >= 0 && x <= 17 && y >= 0 && y <= 12);
}
function computeTileShift(cells) {
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    let shiftX = 0;
    let shiftY = 0;
    if (minX < 0)
        shiftX = -minX;
    else if (maxX > 17)
        shiftX = 17 - maxX;
    if (minY < 0)
        shiftY = -minY;
    else if (maxY > 12)
        shiftY = 12 - maxY;
    return [shiftX, shiftY];
}
function cellsToOutlinePath(cells) {
    const set = new Set(cells.map(([x, y]) => `${x},${y}`));
    let d = "";
    for (const [x, y] of cells) {
        if (!set.has(`${x},${y - 1}`)) {
            d += squiggleEdge(x, y, x + 1, y);
        }
        if (!set.has(`${x + 1},${y}`)) {
            d += squiggleEdge(x + 1, y, x + 1, y + 1);
        }
        if (!set.has(`${x},${y + 1}`)) {
            d += squiggleEdge(x + 1, y + 1, x, y + 1);
        }
        if (!set.has(`${x - 1},${y}`)) {
            d += squiggleEdge(x, y + 1, x, y);
        }
    }
    return d.trim();
}
/** Deterministic offset ~[-amp, amp] for an edge */
function edgeNudge(ax, ay, bx, by, amp = 0.04) {
    const n = Math.sin(ax * 12.9898 + ay * 78.233 + bx * 37.719 + by * 9.123) * 43758.5453;
    const r = n - Math.floor(n); // 0..1
    return (r - 0.5) * 2 * amp;
}
function squiggleEdge(ax, ay, bx, by) {
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    // perpendicular to (bx-ax, by-ay); for unit axis edges this has length 1
    const px = -(by - ay);
    const py = bx - ax;
    const t = edgeNudge(ax, ay, bx, by);
    return `M ${ax} ${ay} L ${mx + px * t} ${my + py * t} L ${bx} ${by} `;
}
/** Square viewBox `box` cells wide with the shape centred in it */
function centredViewBox(shape, box) {
    const xs = shape.map(([x]) => x);
    const ys = shape.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const width = Math.max(...xs) + 1 - minX;
    const height = Math.max(...ys) + 1 - minY;
    return `${minX - (box - width) / 2} ${minY - (box - height) / 2} ${box} ${box}`;
}
/** Tile outline for the tile tray — stroked in currentColor, so the CSS picks white or dark per button colour */
function tileTraySvg(tileType) {
    const shape = getShapeCells(tileType, 0, 0, 0, false);
    return `<svg viewBox="${centredViewBox(shape, 4.4)}" xmlns="http://www.w3.org/2000/svg"><path class="gfe-tray-tile-outline" d="${cellsToOutlinePath(shape)}"/></svg>`;
}
function tileLogHtml(tileType) {
    const shape = getShapeCells(tileType, 0, 0, 0, false);
    const outline = cellsToOutlinePath(shape);
    return `<span class="gfe-log-tile" title="${tileType}"><svg width="24" height="24" viewBox="${centredViewBox(shape, 4)}" xmlns="http://www.w3.org/2000/svg"><path d="${outline}" fill="none" stroke="#1a1a1a" stroke-width="0.25"/></svg></span>`;
}

const TOTAL_ROUNDS = 14;
/** Checks if the tile overlaps with the covered cells
 * @param tileCells - The cells of the tile to check for overlap
 * @param coveredCells - The cells that are already covered
 * @returns true if the tile overlaps with the covered cells, false otherwise
 */
function overlapsCoveredCells(tileCells, coveredCells) {
    const list = (Array.isArray(coveredCells) ? coveredCells : Object.values(coveredCells ?? {}));
    const covered = new Set(list.map((cell) => cellKey(Number(cell.x), Number(cell.y))));
    return tileCells.some(([x, y]) => covered.has(cellKey(x, y)));
}
function orthogonalNeighbors(x, y) {
    return [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1]
    ];
}
function touchesAny(tileCells, referenceSet) {
    return tileCells.some(([x, y]) => orthogonalNeighbors(x, y).some(([nx, ny]) => referenceSet.has(cellKey(nx, ny))));
}
function getLastPlacedTileCells(playerState) {
    if (playerState.has_started == 0)
        return [];
    if (playerState.last_x == null || playerState.last_y == null || playerState.last_tile_type == null)
        return [];
    return getShapeCells(playerState.last_tile_type, Number(playerState.last_x), Number(playerState.last_y), Number(playerState.last_rotation), Number(playerState.last_mirror) === 1);
}
function isPlacementLegal(tileCells, gamedatas) {
    if (!isInsideGrid(tileCells))
        return false;
    let referenceSet;
    //check for S-Bahn cells, monuments and rivers
    if (tileCells.some(([x, y]) => FORBIDDEN_CELL_TYPES.has(getCellType(x, y))))
        return false;
    //check for already covered cells
    if (overlapsCoveredCells(tileCells, gamedatas.coveredCells))
        return false;
    //check for reference set
    if (gamedatas.playerState.has_started == 0) {
        referenceSet = getSbahnCellSet();
    }
    else {
        const lastCells = getLastPlacedTileCells(gamedatas.playerState);
        referenceSet = new Set([...getSbahnCellSet(), ...lastCells.map(([x, y]) => cellKey(x, y))]);
    }
    return touchesAny(tileCells, referenceSet);
}
function buildReferenceSet(hasStarted, lastCells) {
    if (!hasStarted)
        return getSbahnCellSet();
    return new Set([...getSbahnCellSet(), ...lastCells.map(([x, y]) => cellKey(x, y))]);
}
function isHypotheticalI1Legal(x, y, covered, references) {
    if (!isInsideGrid([[x, y]]))
        return false;
    if (FORBIDDEN_CELL_TYPES.has(getCellType(x, y)))
        return false;
    if (covered.has(cellKey(x, y)))
        return false;
    return orthogonalNeighbors(x, y).some(([nx, ny]) => references.has(cellKey(nx, ny)));
}
function collectLegalI1Moves(covered, hasStarted, lastCells) {
    const references = buildReferenceSet(hasStarted, lastCells);
    const seen = new Set();
    const moves = [];
    for (const refKey of references) {
        const [rx, ry] = refKey.split(",").map(Number);
        for (const [nx, ny] of orthogonalNeighbors(rx, ry)) {
            const nKey = cellKey(nx, ny);
            if (seen.has(nKey))
                continue;
            seen.add(nKey);
            if (isHypotheticalI1Legal(nx, ny, covered, references)) {
                moves.push([nx, ny]);
            }
        }
    }
    return moves;
}
function i1SurvivalMemoKey(depth, covered, hasStarted, lastCells) {
    const coverKeys = [...covered].sort();
    const lastKeys = lastCells.map(([x, y]) => cellKey(x, y)).sort();
    return `${depth}|${hasStarted ? 1 : 0}|${lastKeys.join(";")}|${coverKeys.join(";")}`;
}
function canSurviveRemainingRoundsWithI1(depth, covered, hasStarted, lastCells, memo) {
    if (depth <= 0)
        return true;
    const key = i1SurvivalMemoKey(depth, covered, hasStarted, lastCells);
    const cached = memo.get(key);
    if (cached !== undefined)
        return cached;
    for (const [nx, ny] of collectLegalI1Moves(covered, hasStarted, lastCells)) {
        const nextCovered = new Set(covered);
        nextCovered.add(cellKey(nx, ny));
        if (canSurviveRemainingRoundsWithI1(depth - 1, nextCovered, true, [[nx, ny]], memo)) {
            memo.set(key, true);
            return true;
        }
    }
    memo.set(key, false);
    return false;
}
/**
 * True if an I1-only path exists for every remaining round after the current one.
 */
function canI1BePlaced(gamedatas) {
    const depth = TOTAL_ROUNDS - Number(gamedatas.currentRound);
    if (!Number.isFinite(depth) || depth <= 0)
        return true;
    const coveredList = (Array.isArray(gamedatas.coveredCells) ? gamedatas.coveredCells : Object.values(gamedatas.coveredCells ?? {}));
    const covered = new Set(coveredList.map((cell) => cellKey(Number(cell.x), Number(cell.y))));
    const hasStarted = Number(gamedatas.playerState.has_started) !== 0;
    const lastCells = hasStarted ? getLastPlacedTileCells(gamedatas.playerState) : [];
    return canSurviveRemainingRoundsWithI1(depth, covered, hasStarted, lastCells, new Map());
}
/**
 * Empty cells adjacent to S-Bahn (and last tile once started)
 * where an I1 could be placed — used as placement-hint markers.
 */
function getLegalPlacementHintCells(gamedatas) {
    if (!gamedatas.playerState)
        return [];
    const coveredList = (Array.isArray(gamedatas.coveredCells) ? gamedatas.coveredCells : Object.values(gamedatas.coveredCells ?? {}));
    const covered = new Set(coveredList.map((cell) => cellKey(Number(cell.x), Number(cell.y))));
    const hasStarted = Number(gamedatas.playerState.has_started) !== 0;
    const lastCells = hasStarted ? getLastPlacedTileCells(gamedatas.playerState) : [];
    return collectLegalI1Moves(covered, hasStarted, lastCells);
}

/**
 * Own tooltip markup: BGA's default help tooltip (addTooltip) top-aligns a one-word text next to its "?" icon.
 * Here the "?" badge and the text are centred to each other (see .gfe-tray-tooltip in CSS).
 */
function tooltipHtml(text) {
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<div class="gfe-tray-tooltip"><span class="gfe-tray-tooltip-icon">?</span><span>${escaped}</span></div>`;
}
/**
 * Tile choices shown directly above the current player's board (instead of in the action bar).
 * It only ever holds tiles the player can pick right now — otherwise it is empty.
 * Only the current player's board has a tray, so every method is a no-op for spectators.
 */
class TileTray {
    constructor(gameui) {
        this.gameui = gameui;
    }
    get element() {
        return document.getElementById("gfe-tile-tray");
    }
    /** Replace the tray content with clickable tiles. Each group (dice/bonus, always available) is spaced apart. */
    render(groups, onPick) {
        const tray = this.element;
        if (!tray)
            return;
        this.clear();
        const tooltips = [];
        groups.forEach((choices, groupIndex) => {
            if (choices.length === 0)
                return;
            const groupEl = document.createElement("div");
            groupEl.className = "gfe-tile-tray-group";
            choices.forEach(({ tile, kind, tooltip }, index) => {
                const button = document.createElement("button");
                button.type = "button";
                button.id = `gfe-tray-tile-${groupIndex}-${index}`;
                button.className = `gfe-tray-tile gfe-tray-tile-${kind}`;
                button.dataset.tile = tile;
                button.setAttribute("aria-pressed", "false");
                button.innerHTML = tileTraySvg(tile);
                button.addEventListener("click", () => {
                    this.select(button);
                    onPick(tile);
                });
                groupEl.appendChild(button);
                tooltips.push([button.id, tooltip]);
            });
            tray.appendChild(groupEl);
        });
        // BGA tooltips attach by id, so the buttons have to be in the page first
        tooltips.forEach(([id, tooltip]) => this.gameui.addTooltipHtml(id, tooltipHtml(tooltip)));
    }
    /** Highlight the tile that was picked up — tracked per button, since the same tile type can appear twice */
    select(button) {
        const tray = this.element;
        if (!tray)
            return;
        tray.querySelectorAll(".gfe-tray-tile").forEach((other) => {
            const selected = other === button;
            other.classList.toggle("gfe-tray-tile-selected", selected);
            other.setAttribute("aria-pressed", String(selected));
        });
    }
    /** Nothing to pick right now. The tray keeps its height (see CSS), so the board doesn't jump. */
    clear() {
        const tray = this.element;
        if (!tray)
            return;
        tray.querySelectorAll(".gfe-tray-tile").forEach((button) => this.gameui.removeTooltip(button.id));
        tray.replaceChildren();
    }
}

/** Distance (in cells) from the pivot centre to the control buttons */
const RING_RADIUS = 3.2;
const GRID_COLS = 18;
const GRID_ROWS = 13;
class PlaceTile {
    cleanUpPreview(grid) {
        grid.querySelectorAll(".gfe-cell-preview").forEach((el) => {
            el.classList.remove("gfe-cell-preview");
            el.classList.remove("gfe-cell-preview-valid");
            el.classList.remove("gfe-cell-preview-illegal");
        });
        grid.querySelectorAll(".gfe-cell-anchor").forEach((el) => {
            el.classList.remove("gfe-cell-anchor");
        });
        document.getElementById(`gfe-tiles-layer-${this.bga.players.getCurrentPlayerId()}`)?.querySelector("#gfe-preview-crosshair")?.remove();
        grid.querySelectorAll(".gfe-tile-button").forEach((el) => {
            el.remove();
        });
    }
    clearLegalHints(grid) {
        grid.querySelectorAll(".gfe-cell-legal-hint").forEach((el) => {
            el.classList.remove("gfe-cell-legal-hint");
        });
    }
    showLegalHints(grid) {
        this.clearLegalHints(grid);
        const cells = getLegalPlacementHintCells(this.bga.gameui.gamedatas);
        for (const [x, y] of cells) {
            grid.querySelector(`.gfe-cell[data-x="${x}"][data-y="${y}"]`)?.classList.add("gfe-cell-legal-hint");
        }
    }
    /**
     * After refresh: resume street art, bonus, or End turn if this turn is already in progress.
     */
    restoreInProgressTurn(isCurrentPlayerActive) {
        const ps = this.bga.gameui.gamedatas.playerState;
        const pending = JSON.parse(String(ps.pending_bonus_tiles || "[]"));
        const streetArtPending = Number(ps.street_art_pending);
        const cells = JSON.parse(String(ps.cells_this_turn || "[]"));
        this.pendingTiles = pending;
        if (!isCurrentPlayerActive)
            return false;
        if (streetArtPending > 0) {
            this.showStreetArtChoose();
            return true;
        }
        if (this.pendingTiles.length > 0) {
            this.showBonusButtons(this.pendingTiles);
            return true;
        }
        if (cells.length > 0) {
            this.showConfirmEndTurn();
            return true;
        }
        return false;
    }
    resetPlacementState() {
        this.followingMouse = false;
        this.tileSelected = null;
        this.pivotX = null;
        this.pivotY = null;
        this.rotation = 0;
        this.mirror = false;
    }
    /** Street art grid back to passive: no click handler, no legal highlights */
    hideStreetArtChoose() {
        const playerId = this.bga.players.getCurrentPlayerId();
        const streetArtGrid = document.getElementById(`gfe-street-art-choose-${playerId}`);
        if (!streetArtGrid)
            return;
        streetArtGrid.classList.remove("gfe-street-art-choose-interactive");
        streetArtGrid.removeEventListener("click", this.onStreetArtClick);
        streetArtGrid.querySelectorAll(".gfe-street-art-legal").forEach((el) => el.classList.remove("gfe-street-art-legal"));
    }
    cleanupActivePlayer() {
        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if (grid) {
            this.cleanUpPreview(grid);
            grid.classList.remove("gfe-play-grid-interactive");
            grid.removeEventListener("click", this.onGridClick);
            grid.removeEventListener("mousemove", this.onMouseMove);
            this.clearLegalHints(grid);
        }
        this.hideStreetArtChoose();
        this.tileTray.clear();
        // forgets which tile player picked up and where
        this.resetPlacementState();
    }
    /**
     * Shows a preview of the tile on the grid
     * @param grid The grid element to show the preview on
     * @param tileType The type of tile to show the preview for
     * @param pivotX The x coordinate of the tile's pivot cell
     * @param pivotY The y coordinate of the tile's pivot cell
     */
    showPreview(grid, tileType, pivotX, pivotY) {
        let cells = getShapeCellsAroundPivot(tileType, pivotX, pivotY, this.rotation, this.mirror);
        // Only nudge onto the board while dragging; pinned rotate/mirror must not jump
        if (!isInsideGrid(cells) && this.followingMouse) {
            const [shiftX, shiftY] = computeTileShift(cells);
            pivotX += shiftX;
            pivotY += shiftY;
            cells = getShapeCellsAroundPivot(tileType, pivotX, pivotY, this.rotation, this.mirror);
        }
        this.pivotX = pivotX;
        this.pivotY = pivotY;
        this.cleanUpPreview(grid);
        const layer = document.getElementById(`gfe-tiles-layer-${this.bga.players.getCurrentPlayerId()}`);
        const legal = isPlacementLegal(cells, this.bga.gameui.gamedatas);
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("id", "gfe-preview-crosshair");
        const fill = legal ? "rgba(0, 128, 0, 0.35)" : "rgba(255, 0, 0, 0.35)";
        cells.forEach(([x, y]) => {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", String(x));
            rect.setAttribute("y", String(y));
            rect.setAttribute("width", "1");
            rect.setAttribute("height", "1");
            rect.setAttribute("fill", fill);
            rect.setAttribute("stroke", "none");
            group.appendChild(rect);
        });
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", cellsToOutlinePath(cells));
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#1a1a1a");
        path.setAttribute("stroke-width", "0.08");
        group.appendChild(path);
        const cx = pivotX + 0.5;
        const cy = pivotY + 0.5;
        if (!this.followingMouse) {
            const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            ring.setAttribute("cx", String(cx));
            ring.setAttribute("cy", String(cy));
            ring.setAttribute("r", String(RING_RADIUS));
            ring.setAttribute("fill", "none");
            ring.setAttribute("stroke", "#1362a5");
            ring.setAttribute("stroke-width", "0.08");
            ring.setAttribute("stroke-dasharray", "0.01 0.25");
            ring.setAttribute("stroke-linecap", "round");
            group.appendChild(ring);
        }
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(cx));
        circle.setAttribute("cy", String(cy));
        circle.setAttribute("r", "0.25");
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", "#1a1a1a");
        circle.setAttribute("stroke-width", "0.08");
        group.appendChild(circle);
        const h = document.createElementNS("http://www.w3.org/2000/svg", "line");
        h.setAttribute("x1", String(cx - 0.3));
        h.setAttribute("y1", String(cy));
        h.setAttribute("x2", String(cx + 0.3));
        h.setAttribute("y2", String(cy));
        h.setAttribute("stroke", "#1a1a1a");
        h.setAttribute("stroke-width", "0.08");
        group.appendChild(h);
        const v = document.createElementNS("http://www.w3.org/2000/svg", "line");
        v.setAttribute("x1", String(cx));
        v.setAttribute("y1", String(cy - 0.3));
        v.setAttribute("x2", String(cx));
        v.setAttribute("y2", String(cy + 0.3));
        v.setAttribute("stroke", "#1a1a1a");
        v.setAttribute("stroke-width", "0.08");
        group.appendChild(v);
        layer.appendChild(group);
        // cells.forEach(([x, y]) => {
        //   const cellElement = grid.querySelector(`.gfe-cell[data-x="${x}"][data-y="${y}"]`);
        //   if (cellElement) {
        //     cellElement.classList.add("gfe-cell-preview");
        //     cellElement.classList.add(legal ? "gfe-cell-preview-valid" : "gfe-cell-preview-illegal");
        //   }
        // });
        const anchorEl = grid.querySelector(`.gfe-cell[data-x="${pivotX}"][data-y="${pivotY}"]`);
        if (anchorEl) {
            anchorEl.classList.add("gfe-cell-anchor");
        }
        if (!this.placeTileArgs)
            return;
        // While dragging the ring would chase the cursor — only show it once pinned
        if (!this.followingMouse) {
            this.addButtonsForTile(legal, grid);
        }
    }
    /**
     * Fixed control ring centred on the pivot cell — it only moves with the arrow buttons,
     * never when the tile rotates or mirrors.
     */
    addButtonsForTile(legal, grid) {
        if (!this.tileSelected || this.pivotX == null || this.pivotY == null)
            return;
        const centerX = this.pivotX + 0.5;
        const centerY = this.pivotY + 0.5;
        const diagonal = RING_RADIUS / Math.SQRT2;
        const addButton = (label, title, dx, dy, onClick, enabled = true) => {
            const button = document.createElement("button");
            button.className = "gfe-tile-button";
            button.textContent = label;
            button.title = title;
            button.disabled = !enabled;
            button.style.left = `${((centerX + dx) / GRID_COLS) * 100}%`;
            button.style.top = `${((centerY + dy) / GRID_ROWS) * 100}%`;
            button.addEventListener("click", (e) => {
                e.stopPropagation();
                if (!this.tileSelected || this.pivotX == null || this.pivotY == null)
                    return;
                onClick();
            });
            grid.appendChild(button);
            return button;
        };
        const redraw = () => this.showPreview(grid, this.tileSelected, this.pivotX, this.pivotY);
        const canMove = (stepX, stepY) => isInsideGrid(getShapeCellsAroundPivot(this.tileSelected, this.pivotX + stepX, this.pivotY + stepY, this.rotation, this.mirror));
        const move = (stepX, stepY) => {
            if (!canMove(stepX, stepY))
                return;
            this.pivotX += stepX;
            this.pivotY += stepY;
            redraw();
        };
        addButton("↑", _("Move up"), 0, -RING_RADIUS, () => move(0, -1), canMove(0, -1));
        addButton("↓", _("Move down"), 0, RING_RADIUS, () => move(0, 1), canMove(0, 1));
        addButton("←", _("Move left"), -RING_RADIUS, 0, () => move(-1, 0), canMove(-1, 0));
        addButton("→", _("Move right"), RING_RADIUS, 0, () => move(1, 0), canMove(1, 0));
        addButton("↻", _("Rotate clockwise"), -diagonal, -diagonal, () => {
            this.rotation = (this.rotation + 90) % 360;
            redraw();
        });
        addButton("↺", _("Rotate counterclockwise"), diagonal, -diagonal, () => {
            this.rotation = (this.rotation + 270) % 360;
            redraw();
        });
        addButton("↔", _("Mirror"), -diagonal, diagonal, () => {
            this.mirror = !this.mirror;
            this.rotation = (360 - this.rotation) % 360;
            redraw();
        });
        const confirmButton = addButton("✔", _("Confirm"), diagonal, diagonal, () => {
            const tile = this.tileSelected;
            const cells = getShapeCellsAroundPivot(tile, this.pivotX, this.pivotY, this.rotation, this.mirror);
            if (!isPlacementLegal(cells, this.bga.gameui.gamedatas))
                return;
            // Server works with the tile's [0,0] offset as anchor, not the pivot
            const [x, y] = pivotToAnchor(tile, this.pivotX, this.pivotY, this.rotation, this.mirror);
            const action = this.pendingTiles.length > 0 ? "actPlaceBonusTile" : "actPlaceTile";
            this.bga.actions.performAction(action, {
                tileType: tile,
                x,
                y,
                rotation: this.rotation,
                mirror: this.mirror
            });
        }, legal);
        confirmButton.classList.add("gfe-tile-button-confirm");
    }
    selectTile(tile, grid) {
        this.followingMouse = true;
        this.tileSelected = tile;
        this.pivotX = 0;
        this.pivotY = 0;
        this.rotation = 0;
        this.mirror = false;
        grid.classList.add("gfe-play-grid-interactive");
        this.showPreview(grid, tile, 0, 0);
    }
    /**
     * Fill the tray above my board with the tiles I can pick right now: this turn's dice tiles
     * (or the bonus tiles during a bonus step) plus the always-available I1/I2.
     * Rendered once per step — never on mouse move.
     */
    showTileChoices() {
        if (!this.placeTileArgs)
            return;
        // Bonus tiles show where they came from: name (hover) and colour from the sheet
        const bonusNames = {
            escooter: _("eScooter"),
            currywurst: _("Curry Sausage"),
            streetart: _("Street Art")
        };
        const mainChoices = this.pendingTiles.length > 0
            ? this.pendingTiles.map((tile) => {
                const source = getBonusSource(tile);
                return { tile, kind: source, tooltip: bonusNames[source] };
            })
            : this.placeTileArgs.tileOptions.map((tile) => ({ tile, kind: "dice", tooltip: _("This turn") }));
        const alwaysChoices = this.placeTileArgs.alwaysAvailableTiles.map((tile) => ({ tile, kind: "always", tooltip: _("Always available") }));
        this.tileTray.render([mainChoices, alwaysChoices], (tile) => {
            const grid = document.getElementById(`gfe-play-grid-${this.bga.players.getCurrentPlayerId()}`);
            if (grid)
                this.selectTile(tile, grid);
        });
    }
    /** The action bar only keeps instructions and global actions */
    renderStatusButtons() {
        this.bga.statusBar.removeActionButtons();
        this.addUndoButtonIfPossible();
    }
    setCanUndo(value) {
        this.canUndo = value;
    }
    addUndoButtonIfPossible() {
        if (!this.canUndo)
            return;
        this.bga.statusBar.addActionButton(_("Undo last"), () => {
            this.bga.actions.performAction("actUndoLast", {});
        }, { color: "secondary" });
        this.bga.statusBar.addActionButton(_("Undo all"), () => {
            this.bga.actions.performAction("actUndo", {});
        }, { color: "alert" });
    }
    showBonusButtons(pendingTiles) {
        this.pendingTiles = pendingTiles;
        if (this.isStuckWithNoLegalI1()) {
            this.showEndJourneyUi();
            return;
        }
        this.resetPlacementState();
        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if (!grid)
            return;
        this.hideStreetArtChoose();
        this.cleanUpPreview(grid);
        this.showLegalHints(grid);
        // street art step removes the grid handler — put it back so bonus tiles can be positioned
        grid.removeEventListener("click", this.onGridClick);
        grid.removeEventListener("mousemove", this.onMouseMove);
        grid.addEventListener("click", this.onGridClick);
        grid.addEventListener("mousemove", this.onMouseMove);
        this.bga.statusBar.setTitle(_("${you} must place your bonus tile on the map"));
        this.showTileChoices();
        this.renderStatusButtons();
    }
    clearPendingTiles() {
        this.pendingTiles = [];
        this.awaitingEndTurn = false;
    }
    showStreetArtChoose() {
        this.clearPendingTiles();
        this.resetPlacementState();
        this.tileTray.clear();
        const playerId = this.bga.players.getCurrentPlayerId();
        const streetArtGrid = document.getElementById(`gfe-street-art-choose-${playerId}`);
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if (grid) {
            this.cleanUpPreview(grid);
            grid.classList.remove("gfe-play-grid-interactive");
            grid.removeEventListener("click", this.onGridClick);
            grid.removeEventListener("mousemove", this.onMouseMove);
            this.clearLegalHints(grid);
        }
        if (!streetArtGrid)
            return;
        this.bga.statusBar.setTitle(_("${you} must mark a street art bonus"));
        this.renderStatusButtons();
        // Highlight only the cells the player may actually mark (same rule as the server)
        streetArtGrid.querySelectorAll(".gfe-street-art-legal").forEach((el) => el.classList.remove("gfe-street-art-legal"));
        const completed = JSON.parse(String(this.bga.gameui.gamedatas.playerState.street_art_completed || "[]"));
        for (const [x, y] of getLegalStreetArtCells(completed)) {
            streetArtGrid.querySelector(`.gfe-street-art-choose-cell[data-x="${x}"][data-y="${y}"]`)?.classList.add("gfe-street-art-legal");
        }
        streetArtGrid.removeEventListener("click", this.onStreetArtClick);
        streetArtGrid.classList.add("gfe-street-art-choose-interactive");
        streetArtGrid.addEventListener("click", this.onStreetArtClick);
    }
    /**
     * Placement finished — only Undo or End turn (does not advance round by itself).
     */
    isStuckWithNoLegalI1() {
        if (!this.placeTileArgs?.hasLegalI1MoveByPlayer)
            return false;
        const myId = this.bga.players.getCurrentPlayerId();
        const map = this.placeTileArgs.hasLegalI1MoveByPlayer;
        const value = map[String(myId)] ?? map[myId];
        return value === false;
    }
    showEndJourneyUi() {
        this.tileTray.clear();
        this.bga.statusBar.removeActionButtons();
        this.bga.statusBar.setTitle(_("No legal placement left — your journey ends here"));
        this.bga.statusBar.addActionButton(_("End journey"), () => {
            this.bga.actions.performAction("actEndJourney", {});
        });
    }
    showConfirmEndTurn() {
        this.clearPendingTiles();
        this.resetPlacementState();
        this.awaitingEndTurn = true;
        this.tileTray.clear();
        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if (grid) {
            this.cleanUpPreview(grid);
            grid.classList.remove("gfe-play-grid-interactive");
            grid.removeEventListener("click", this.onGridClick);
            grid.removeEventListener("mousemove", this.onMouseMove);
            this.clearLegalHints(grid);
        }
        this.hideStreetArtChoose();
        this.bga.statusBar.removeActionButtons();
        // Forecast disabled — always allow End turn; End journey handles no-I1.
        // const canSurvive = this.canSurviveRemaining ?? canI1BePlaced(this.bga.gameui.gamedatas);
        // if (canSurvive) {
        this.bga.statusBar.setTitle(this.canUndo ? _("${you} may undo or end your turn") : _("${you} must end your turn"));
        this.bga.statusBar.addActionButton(_("End turn"), () => {
            this.bga.actions.performAction("actEndTurn", {});
        });
        // } else {
        //   this.bga.statusBar.setTitle(_("${you} cannot reach the end of the game with this placement — please undo"));
        // }
        this.addUndoButtonIfPossible();
    }
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
        this.tileSelected = null;
        this.placeTileArgs = null;
        /** Grid cell of the tile's pivot — rotate/mirror happen around it and the button ring is centred on it */
        this.pivotX = null;
        this.pivotY = null;
        this.pendingTiles = [];
        /** Client flag: placement done, waiting for End turn / Undo */
        this.awaitingEndTurn = false;
        /** True only after a change this turn that can be reverted */
        this.canUndo = false;
        /** Server forecast: I1 path exists for remaining rounds. null = recompute locally. */
        this.canSurviveRemaining = null;
        this.followingMouse = false;
        this.onGridClick = (event) => {
            const cell = event.target;
            if (!this.tileSelected)
                return;
            if (!(cell instanceof HTMLElement) || !cell.classList.contains("gfe-cell"))
                return;
            const playerId = this.bga.players.getCurrentPlayerId();
            const grid = document.getElementById(`gfe-play-grid-${playerId}`);
            if (!grid)
                return;
            let x = Number(cell.dataset.x);
            let y = Number(cell.dataset.y);
            if (isNaN(x) || isNaN(y))
                return;
            // Pinned: click the current shape to pick up and drag again
            if (!this.followingMouse && this.pivotX != null && this.pivotY != null) {
                const pinnedCells = getShapeCellsAroundPivot(this.tileSelected, this.pivotX, this.pivotY, this.rotation, this.mirror);
                if (pinnedCells.some(([cx, cy]) => cx === x && cy === y)) {
                    this.followingMouse = true;
                    this.showPreview(grid, this.tileSelected, this.pivotX, this.pivotY);
                    return;
                }
            }
            // Pin the pivot at the clicked cell (allowed even if illegal — ✔ stays gated)
            const cells = getShapeCellsAroundPivot(this.tileSelected, x, y, this.rotation, this.mirror);
            if (!isInsideGrid(cells)) {
                const [shiftX, shiftY] = computeTileShift(cells);
                x += shiftX;
                y += shiftY;
            }
            this.followingMouse = false;
            this.showPreview(grid, this.tileSelected, x, y);
        };
        this.onMouseMove = (event) => {
            if (!this.followingMouse)
                return;
            if (!this.tileSelected)
                return;
            const cell = event.target;
            if (!(cell instanceof HTMLElement) || !cell.classList.contains("gfe-cell"))
                return;
            const x = Number(cell.dataset.x);
            const y = Number(cell.dataset.y);
            if (isNaN(x) || isNaN(y))
                return;
            if (x === this.pivotX && y === this.pivotY)
                return;
            const playerId = this.bga.players.getCurrentPlayerId();
            const grid = document.getElementById(`gfe-play-grid-${playerId}`);
            if (!grid)
                return;
            this.showPreview(grid, this.tileSelected, x, y);
        };
        this.onStreetArtClick = (event) => {
            const cell = event.target;
            if (!(cell instanceof HTMLElement) || !cell.classList.contains("gfe-street-art-choose-cell"))
                return;
            // only highlighted cells are clickable — no server round trip / error for illegal ones
            if (!cell.classList.contains("gfe-street-art-legal"))
                return;
            const x = Number(cell.dataset.x);
            const y = Number(cell.dataset.y);
            if (isNaN(x) || isNaN(y))
                return;
            this.bga.actions.performAction("actChooseStreetArt", {
                x: x,
                y: y
            });
        };
        this.rotation = 0;
        this.mirror = false;
        this.tileTray = new TileTray(bga.gameui);
    }
    onEnteringState(args, isCurrentPlayerActive) {
        this.placeTileArgs = args;
        // Only tiles I can actually pick are shown — the steps below fill the tray when that's the case
        this.tileTray.clear();
        if (isCurrentPlayerActive && this.isStuckWithNoLegalI1()) {
            this.showEndJourneyUi();
            return;
        }
        // After refresh: only allow Undo if this turn already has changes
        if (!this.canUndo) {
            const ps = this.bga.gameui.gamedatas.playerState;
            const cells = JSON.parse(String(ps.cells_this_turn || "[]"));
            const pending = JSON.parse(String(ps.pending_bonus_tiles || "[]"));
            this.canUndo = cells.length > 0 || pending.length > 0 || Number(ps.street_art_pending) > 0;
        }
        document.querySelectorAll(".gfe-dice-indicator").forEach((el) => {
            el.className = "gfe-dice-indicator";
            el.classList.add(`gfe-dice-${args.diceRoll}`);
        });
        if (isCurrentPlayerActive && this.awaitingEndTurn) {
            this.showConfirmEndTurn();
            return;
        }
        this.awaitingEndTurn = false;
        if (this.restoreInProgressTurn(isCurrentPlayerActive)) {
            return;
        }
        this.pendingTiles = [];
        this.bga.statusBar.setTitle(isCurrentPlayerActive ? _("${you} must place your tile on the map") : _("Other players are placing their tile..."));
        if (isCurrentPlayerActive) {
            const playerId = this.bga.players.getCurrentPlayerId();
            const grid = document.getElementById(`gfe-play-grid-${playerId}`);
            if (!grid)
                return;
            this.showLegalHints(grid);
            grid.removeEventListener("click", this.onGridClick);
            grid.removeEventListener("mousemove", this.onMouseMove);
            grid.addEventListener("click", this.onGridClick);
            grid.addEventListener("mousemove", this.onMouseMove);
            this.showTileChoices();
            this.renderStatusButtons();
        }
    }
    onLeavingState(args, isCurrentPlayerActive) {
        this.awaitingEndTurn = false;
        this.canUndo = false;
        this.cleanupActivePlayer();
        this.placeTileArgs = null;
    }
    onPlayerActivationChange(args, isCurrentPlayerActive) {
        this.placeTileArgs = args;
        if (!isCurrentPlayerActive) {
            this.canUndo = false;
            this.awaitingEndTurn = false;
            this.bga.statusBar.removeActionButtons();
            this.cleanupActivePlayer();
            this.bga.statusBar.setTitle(_("Other players are placing their tile..."));
            return;
        }
        this.onEnteringState(args, true);
    }
    resetAfterUndo() {
        this.clearPendingTiles();
        this.resetPlacementState();
        this.awaitingEndTurn = false;
        this.canUndo = false;
        this.canSurviveRemaining = null;
        if (!this.placeTileArgs)
            return;
        this.onEnteringState(this.placeTileArgs, true);
    }
    setCanSurviveRemaining(value) {
        this.canSurviveRemaining = value;
    }
    setHasLegalI1Move(value) {
        if (!this.placeTileArgs)
            return;
        const myId = this.bga.players.getCurrentPlayerId();
        this.placeTileArgs.hasLegalI1MoveByPlayer = {
            ...this.placeTileArgs.hasLegalI1MoveByPlayer,
            [String(myId)]: !!value
        };
    }
    clearCanSurviveRemaining() {
        this.canSurviveRemaining = null;
    }
}

class PlaceBonus {
    cleanUpPreview(grid) {
        grid.querySelectorAll(".gfe-cell-preview").forEach((el) => {
            el.classList.remove("gfe-cell-preview");
            el.classList.remove("gfe-cell-preview-valid");
            el.classList.remove("gfe-cell-preview-illegal");
        });
    }
    showPreview(grid, tileType, anchorX, anchorY) {
        let cells = getShapeCells(tileType, anchorX, anchorY, this.rotation, this.mirror);
        if (!isInsideGrid(cells)) {
            const [shiftX, shiftY] = computeTileShift(cells);
            anchorX += shiftX;
            anchorY += shiftY;
            cells = getShapeCells(tileType, anchorX, anchorY, this.rotation, this.mirror);
        }
        this.anchorX = anchorX;
        this.anchorY = anchorY;
        this.cleanUpPreview(grid);
        const legal = isPlacementLegal(cells, this.bga.gameui.gamedatas);
        cells.forEach(([x, y]) => {
            const cellElement = grid.querySelector(`.gfe-cell[data-x="${x}"][data-y="${y}"]`);
            if (cellElement) {
                cellElement.classList.add("gfe-cell-preview");
                cellElement.classList.add(legal ? "gfe-cell-preview-valid" : "gfe-cell-preview-illegal");
            }
        });
        if (!this.placeBonusArgs)
            return;
        this.updateActionButtons(legal, grid);
    }
    updateActionButtons(legal, grid) {
        this.bga.statusBar.removeActionButtons();
        if (!this.placeBonusArgs)
            return;
        this.placeBonusArgs.pendingTiles.forEach((tile) => {
            this.bga.statusBar.addActionButton(tile, () => {
                this.tileSelected = tile;
                this.anchorX = 0;
                this.anchorY = 0;
                this.rotation = 0;
                this.mirror = false;
                this.showPreview(grid, tile, 0, 0);
            });
        });
    }
    resetPlacementState() {
        this.tileSelected = null;
        this.anchorX = null;
        this.anchorY = null;
        this.rotation = 0;
        this.mirror = false;
    }
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
        this.tileSelected = null;
        this.placeBonusArgs = null;
        this.anchorX = null;
        this.anchorY = null;
        this.rotation = 0;
        this.mirror = false;
        this.onGridClick = (event) => {
            const cell = event.target;
            if (!this.tileSelected)
                return;
            if (!(cell instanceof HTMLElement) || !cell.classList.contains("gfe-cell"))
                return;
            const playerId = this.bga.players.getCurrentPlayerId();
            const grid = document.getElementById(`gfe-play-grid-${playerId}`);
            if (!grid)
                return;
            this.anchorX = Number(cell.dataset.x);
            this.anchorY = Number(cell.dataset.y);
            if (isNaN(this.anchorX) || isNaN(this.anchorY))
                return;
            this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
        };
    }
    onEnteringState(args, isCurrentPlayerActive) {
        this.bga.statusBar.setTitle(isCurrentPlayerActive ? _("${you} must place your bonus tile on the map") : _("Other players are placing their bonus tile..."));
        this.placeBonusArgs = args;
        if (isCurrentPlayerActive) {
            const playerId = this.bga.players.getCurrentPlayerId();
            const grid = document.getElementById(`gfe-play-grid-${playerId}`);
            if (!grid)
                return;
            grid.removeEventListener("click", this.onGridClick);
            grid.classList.add("gfe-play-grid-interactive");
            grid.addEventListener("click", this.onGridClick);
            this.updateActionButtons(false, grid);
        }
    }
    onLeavingState(args, isCurrentPlayerActive) {
        this.cleanupActivePlayer();
        this.placeBonusArgs = null;
    }
    cleanupActivePlayer() {
        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if (!grid)
            return;
        // remove valid/invalid indicators
        this.cleanUpPreview(grid);
        grid.classList.remove("gfe-play-grid-interactive");
        grid.removeEventListener("click", this.onGridClick);
        // forgets which tile player picked up and where
        this.resetPlacementState();
    }
    onPlayerActivationChange(args, isCurrentPlayerActive) {
        if (!isCurrentPlayerActive) {
            this.bga.statusBar.removeActionButtons();
            this.cleanupActivePlayer();
            this.bga.statusBar.setTitle(_("Other players are placing their bonus tile..."));
            return;
        }
        this.onEnteringState(args, true);
    }
}

/*
To use the BGA libs, add `import { BgaAnimations, BgaCards } from "./libs";` in the files using them.

To get the latest typing files (that you would save at the root of your game), read the lib doc and see the demo, go to:
https://en.doc.boardgamearena.com/BgaAnimations
https://en.doc.boardgamearena.com/BgaCards
*/
/*
import type { BgaAnimations as BgaAnimationsType } from "../../bga-animations";
import type { BgaCards as BgaCardsType } from "../../bga-cards";

const BgaAnimations: typeof BgaAnimationsType = await globalThis.importEsmLib('bga-animations', '1.x');
const BgaCards: typeof BgaCardsType = await globalThis.importEsmLib('bga-cards', '1.x');

export { BgaAnimations, BgaCards };
*/
const BgaZoom = await globalThis.importEsmLib("bga-zoom", "1.x");

class Game {
    constructor(bga) {
        /** Last known scribble counts — animate only when a count increases */
        this.scribbleCounts = new Map();
        this.bga = bga;
        this.bga.gameui.bgaFormatText = (log, args) => this.bgaFormatText(log, args);
        // Register state classes — names must match PHP state class names
        this.placeTile = new PlaceTile(this, bga);
        this.placeBonus = new PlaceBonus(this, bga);
        this.bga.states.register("PlaceTile", this.placeTile);
        this.bga.states.register("PlaceBonus", this.placeBonus);
    }
    // ===== RENDERING =====
    /**
     * Hand-drawn circle. With `outline`, a wider dark stroke is drawn underneath so bright
     * colours (yellow, spring green, …) stay visible on the light map.
     */
    renderScribbleCircle(animate = false, color = "black", outline = false) {
        const cls = `gfe-scribble-circle ${animate ? "gfe-circle-draw" : ""}`;
        const path = (stroke, width) => `<path
              class="${cls}"
              fill="none"
              stroke="${stroke}"
              stroke-width="${width}"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M 27.189 195.683 C 30.061 131.618 94.099 84.3 117.657 68.019 C 140.551 52.197 213.962 25.065 280.326 36.589 C 395.932 56.664 426.688 110.248 442.969 138.089 C 490.779 219.846 479.422 338.99 437.633 396.353 C 370.052 489.119 283.113 479.008 177.507 461.765 C 134.745 454.134 75.723 435.929 52.6 350.834 C 42.992 317.513 51.203 254.43 68.837 228.121"
            />`;
        return `<svg viewBox="0 0 500 500">
            ${outline ? path("#1a1a1a", 74) : ""}
            ${path(color, 50)}
          </svg>`;
    }
    /** True only when this track already had a known count and it went up (skips first paint / same-count redraws). */
    shouldAnimateScribble(key, count) {
        const prev = this.scribbleCounts.get(key);
        this.scribbleCounts.set(key, count);
        return prev !== undefined && count > prev;
    }
    /** Player's BGA colour as CSS hex (BGA stores it without "#") */
    getPlayerColor(playerId) {
        const color = this.gamedatas.players[playerId]?.color;
        return color ? `#${color}` : "black";
    }
    /** True for bright colours (yellow, spring green, …) that need a dark outline to stay readable */
    isLightColor(hex) {
        const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
        if (!m)
            return false;
        const [r, g, b] = m.slice(1).map((c) => parseInt(c, 16));
        // > 150 catches yellow, orange, spring green and hot pink from the player colour list
        return 0.299 * r + 0.587 * g + 0.114 * b > 150;
    }
    renderRoundTracker(playerId, round) {
        const roundTracker = document.getElementById(`gfe-round-tracker-${playerId}`);
        if (!roundTracker || round === 0)
            return;
        const ROUNDS_POSITIONS = [
            { top: 55.2, left: 1.2 },
            { top: 45.2, left: 8.1 },
            { top: 37.2, left: 15.2 },
            { top: 45.2, left: 24 },
            { top: 48, left: 30.6 },
            { top: 50, left: 37 },
            { top: 51.8, left: 43 },
            { top: 25.3, left: 52.2 },
            { top: 17, left: 58.6 },
            { top: 8.7, left: 65.3 },
            { top: 2.7, left: 71.3 },
            { top: 3.7, left: 79.3 },
            { top: 14.5, left: 85.6 },
            { top: 26.9, left: 91.9 }
        ];
        const animateLast = this.shouldAnimateScribble(`${playerId}-round`, round);
        const playerColor = this.getPlayerColor(playerId);
        const outline = this.isLightColor(playerColor);
        roundTracker.innerHTML = "";
        for (let i = 0; i < round; i++) {
            roundTracker.innerHTML += `<div class="gfe-round-tracker-circle" style="top: ${ROUNDS_POSITIONS[i].top}%; left: ${ROUNDS_POSITIONS[i].left}%">${this.renderScribbleCircle(animateLast && i === round - 1, playerColor, outline)}</div>`;
        }
    }
    renderCoveredCells(playerId, coveredCells) {
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if (!grid)
            return;
        const cells = Array.isArray(coveredCells) ? coveredCells : Object.values(coveredCells);
        for (const { x, y } of cells) {
            grid.querySelector(`.gfe-cell[data-x="${x}"][data-y="${y}"]`)?.classList.add("gfe-cell-placed");
        }
    }
    renderMonumentCollectionTrack(playerId, monumentCount, collectionCount, monumentScore, collectionScore, monumentCollectionScore) {
        const track = document.getElementById(`gfe-monument-collection-track-${playerId}`);
        if (!track)
            return;
        const monumentScoreString = monumentScore.toString();
        const collectionScoreString = collectionScore.toString();
        const monumentCollectionScoreString = monumentCollectionScore.toString();
        const animateMonument = this.shouldAnimateScribble(`${playerId}-monument`, monumentCount);
        const animateCollection = this.shouldAnimateScribble(`${playerId}-collection`, collectionCount);
        track.innerHTML = "";
        for (let i = 0; i < monumentCount; i++) {
            track.innerHTML += `<div class="gfe-monument-track-circle" data-index="${i}" style="top: ${17.4 + i * 0.56}%; left: ${11.3 + i * 10.86}%">${this.renderScribbleCircle(animateMonument && i === monumentCount - 1)}</div>`;
        }
        track.innerHTML += `<div class="gfe-monument-score"><p class="gfe-track-score">${monumentScoreString}</p></div>`;
        for (let i = 0; i < collectionCount; i++) {
            track.innerHTML += `<div class="gfe-collection-track-circle" data-index="${i}" style="top: ${55 + i * 0.515}%; left: ${11.2 + i * 7.8}%">${this.renderScribbleCircle(animateCollection && i === collectionCount - 1)}</div>`;
        }
        track.innerHTML += `<div class="gfe-collection-score"><p class="gfe-track-score">${collectionScoreString}</p></div>`;
        track.innerHTML += `<div class="gfe-monument-collection-score"><p class="gfe-track-score">${monumentCollectionScoreString}</p></div>`;
    }
    renderMustSeeUfoTrack(playerId, ufoCount, mustseeCount, mustseeScore, ufoScore, monumentCollectionScore, streetArtScore) {
        const track = document.getElementById(`gfe-ufo-mustsee-track-${playerId}`);
        if (!track)
            return;
        const mustseeScoreString = mustseeScore.toString();
        const ufoScoreString = ufoScore.toString();
        const monumentCollectionScoreString = monumentCollectionScore.toString();
        const streetArtScoreString = streetArtScore.toString();
        const animateMustsee = this.shouldAnimateScribble(`${playerId}-mustsee`, mustseeCount);
        const animateUfo = this.shouldAnimateScribble(`${playerId}-ufo`, ufoCount);
        track.innerHTML = "";
        for (let i = 0; i < mustseeCount; i++) {
            const pair = Math.floor(i / 2);
            const top = i % 2 === 0 ? 11.9 + pair * -1.7 : 29.2 + pair * -0.35;
            const left = (i % 2 === 0 ? 14.5 : 19.7) + pair * 10.2;
            track.innerHTML += `<div class="gfe-mustsee-track-circle" data-index="${i}" style="top: ${top}%; left: ${left}%">${this.renderScribbleCircle(animateMustsee && i === mustseeCount - 1)}</div>`;
        }
        track.innerHTML += `<div class="gfe-mustsee-score"><p class="gfe-track-score-orange">${mustseeScoreString}</p></div>`;
        for (let i = 0; i < ufoCount; i++) {
            track.innerHTML += `<div class="gfe-ufo-track-circle" data-index="${i}" style="top: ${59 + i * -0.315}%; left: ${15.2 + i * 9.8}%">${this.renderScribbleCircle(animateUfo && i === ufoCount - 1)}</div>`;
        }
        track.innerHTML += `<div class="gfe-ufo-score"><p class="gfe-track-score-orange">${ufoScoreString}</p></div>`;
        track.innerHTML += `<div class="gfe-total-score"><p class="gfe-track-score-gray">${Number(ufoScoreString) + Number(mustseeScoreString) + Number(monumentCollectionScoreString) + Number(streetArtScoreString)}</p></div>`;
    }
    renderStreetArtTrack(playerId, completedKeys, streetArtScore) {
        const streetArtGridEl = document.getElementById(`gfe-street-art-choose-${playerId}`);
        const streetArtScoreEl = document.getElementById(`gfe-street-art-score-${playerId}`);
        if (!streetArtGridEl)
            return;
        const streetArtScoreString = streetArtScore.toString();
        const animateLast = this.shouldAnimateScribble(`${playerId}-streetart`, completedKeys.length);
        // Clear previous marks (needed for undo / full rebuild)
        streetArtGridEl.querySelectorAll(".gfe-street-art-choose-cell").forEach((cell) => {
            cell.classList.remove("gfe-street-art-marked");
            cell.querySelector("svg")?.remove();
        });
        completedKeys.forEach((cell, index) => {
            const [x, y] = cell.split(",");
            if (isNaN(Number(x)) || isNaN(Number(y)))
                return;
            const cellEl = streetArtGridEl.querySelector(`.gfe-street-art-choose-cell[data-x="${Number(x)}"][data-y="${Number(y)}"]`);
            if (!cellEl)
                return;
            cellEl.classList.add("gfe-street-art-marked");
            cellEl.insertAdjacentHTML("beforeend", this.renderScribbleCircle(animateLast && index === completedKeys.length - 1));
        });
        if (streetArtScoreEl) {
            streetArtScoreEl.innerHTML = `<p class="gfe-track-score-blue">${streetArtScoreString}</p>`;
        }
    }
    drawTileOnSVG(playerId, tileType, anchorX, anchorY, rotation, mirror, isLastTile = false) {
        const tilesLayerEl = document.getElementById(`gfe-tiles-layer-${playerId}`);
        if (!tilesLayerEl)
            return;
        const cells = getShapeCells(tileType, anchorX, anchorY, rotation, mirror);
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.classList.add("gfe-tile");
        // optional: data-tile-type, etc.
        cells.forEach(([x, y]) => {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", String(x));
            rect.setAttribute("y", String(y));
            rect.setAttribute("width", "1");
            rect.setAttribute("height", "1");
            rect.classList.add("gfe-tile-cell");
            group.appendChild(rect);
        });
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", cellsToOutlinePath(cells));
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#1a1a1a");
        path.setAttribute("stroke-width", "0.08");
        path.classList.add("gfe-tile-outline");
        group.appendChild(path);
        tilesLayerEl.appendChild(group);
        if (isLastTile) {
            group.classList.add("gfe-tile-last");
        }
    }
    // ===== GAME SETUP =====
    // This is called when the game is setup
    setup(gamedatas) {
        this.gamedatas = gamedatas;
        // Round info sits above my own board, so it takes my colour (spectators: black)
        const roundInfoColor = this.getPlayerColor(this.bga.players.getCurrentPlayerId());
        const roundInfoClasses = this.isLightColor(roundInfoColor) ? "gfe-text-outline" : "";
        // Set up the game area
        this.bga.gameArea.getElement().insertAdjacentHTML("beforeend", `
            <div id="gfe-game-area">
                <div id="gfe-round-info" class="${roundInfoClasses}" style="color: ${roundInfoColor}">
                    Round: <span id="gfe-round">${gamedatas.currentRound}</span> / 14
                </div>
                <div id="gfe-player-boards"></div>
            </div>
        `);
        const LOCAL_STORAGE_ZOOM_KEY = "gfe-zoom";
        new BgaZoom.Manager({
            element: document.getElementById("gfe-game-area"),
            localStorageKey: LOCAL_STORAGE_ZOOM_KEY,
            zoomControls: {
                color: "black"
            },
            zoomLevels: [1, 1.5, 2],
            defaultZoomLevel: 1,
            autoZoom: { expectedWidth: 900, minZoomLevel: 0.5 }
        });
        // Set up player boards
        const myId = this.bga.players.getCurrentPlayerId();
        const orderedPlayerIds = [myId, ...gamedatas.playerorder.map((id) => Number(id)).filter((id) => id !== myId)];
        orderedPlayerIds.forEach((playerId) => {
            const player = gamedatas.players[playerId];
            if (!player)
                return;
            // Tile choices sit directly above my own board (filled by PlaceTile), not in the action bar
            const tileTrayHtml = playerId === myId ? `<div id="gfe-tile-tray" class="gfe-tile-tray"></div>` : "";
            const playerColor = this.getPlayerColor(playerId);
            const nameClasses = `gfe-player-name${this.isLightColor(playerColor) ? " gfe-text-outline" : ""}`;
            document.getElementById("gfe-player-boards").insertAdjacentHTML("beforeend", `
                <div id="gfe-board-${playerId}" class="gfe-player-board">
                    <strong class="${nameClasses}" style="color: ${playerColor}">${player.name}</strong>
                    ${tileTrayHtml}
                    <div id="gfe-sheet-${playerId}" class="gfe-sheet">
                        <div id="gfe-play-grid-${playerId}" class="gfe-play-grid"></div>
                        <svg id="gfe-tiles-layer-${playerId}" class="gfe-tiles-layer" viewBox="0 0 18 13" preserveAspectRatio="none"></svg>
                        <div id="gfe-dice-roll-${playerId}" class="gfe-dice-indicator gfe-dice-${gamedatas.diceRoll}"></div>
                        <div id="gfe-monument-collection-track-${playerId}" class="gfe-monument-collection-track"></div>
                        <div id="gfe-ufo-mustsee-track-${playerId}" class="gfe-ufo-mustsee-track"></div>
                        <div id="gfe-street-art-score-${playerId}" class="gfe-street-art-score"></div>
                        <div id="gfe-street-art-choose-${playerId}" class="gfe-street-art-choose"></div>
                        <div id="gfe-round-tracker-${playerId}" class="gfe-round-tracker"></div>
                    </div>
                </div>
            `);
            // Theme URL is reliable when CSS is minified/served from another path
            const sheetEl = document.getElementById(`gfe-sheet-${playerId}`);
            if (sheetEl) {
                sheetEl.style.backgroundImage = `url(${g_gamethemeurl}img/berlin_map.jpg)`;
            }
            // Set up player's play grid
            const playGridEl = document.getElementById(`gfe-play-grid-${playerId}`);
            if (playGridEl) {
                let cellsHTML = "";
                for (let y = 0; y < 13; y++) {
                    for (let x = 0; x < 18; x++) {
                        cellsHTML += `<div class="gfe-cell" data-x="${x}" data-y="${y}"></div>`;
                    }
                }
                playGridEl.innerHTML = cellsHTML;
            }
            // Set up street art grid
            const streetArtGridEl = document.getElementById(`gfe-street-art-choose-${playerId}`);
            if (streetArtGridEl) {
                let cellsHTML = "";
                for (let y = 0; y < 5; y++) {
                    for (let x = 0; x < 4; x++) {
                        cellsHTML += `<div class="gfe-street-art-choose-cell" data-x="${x}" data-y="${y}"></div>`;
                    }
                }
                streetArtGridEl.innerHTML = cellsHTML;
            }
        });
        // Set up tracks and covered cells
        Object.keys(gamedatas.players).forEach((pId) => {
            this.renderRoundTracker(Number(pId), gamedatas.currentRound);
        });
        const boards = gamedatas.playerBoards ?? {};
        for (const [playerIdStr, board] of Object.entries(boards)) {
            const playerId = Number(playerIdStr);
            const layer = document.getElementById(`gfe-tiles-layer-${playerId}`);
            if (layer)
                layer.innerHTML = "";
            const placements = this.normalizePlacements(board.placements);
            for (const p of placements) {
                const isLast = Number(p.x) === Number(board.last_x) &&
                    Number(p.y) === Number(board.last_y) &&
                    p.tile_type === board.last_tile_type &&
                    Number(p.rotation) === Number(board.last_rotation) &&
                    Number(p.mirror) === Number(board.last_mirror);
                this.drawTileOnSVG(playerId, p.tile_type, Number(p.x), Number(p.y), Number(p.rotation), Number(p.mirror) === 1, isLast);
            }
            const monument = Array.isArray(board.monument_completed)
                ? board.monument_completed
                : JSON.parse(String(board.monument_completed || "[]"));
            const mustsee = Array.isArray(board.mustsee_completed)
                ? board.mustsee_completed
                : JSON.parse(String(board.mustsee_completed || "[]"));
            const streetArt = Array.isArray(board.street_art_completed)
                ? board.street_art_completed
                : JSON.parse(String(board.street_art_completed || "[]"));
            this.renderMonumentCollectionTrack(playerId, monument.length, board.collection_count, board.monument_score, board.collection_score, board.monument_collection_score);
            this.renderMustSeeUfoTrack(playerId, board.ufo_count, mustsee.length, board.mustsee_score, board.ufo_score, board.monument_collection_score, board.street_art_score);
            this.renderStreetArtTrack(playerId, streetArt, board.street_art_score);
        }
        this.setupNotifications();
    }
    setupNotifications() {
        this.bga.notifications.setupPromiseNotifications({});
    }
    bgaFormatText(log, args) {
        try {
            if (log && args && !args.processed) {
                args.processed = true;
                if (args.tile_label) {
                    args.tile_label = tileLogHtml(String(args.tile_label));
                }
            }
        }
        catch (e) {
            console.error("bgaFormatText", log, args, e);
        }
        return { log, args };
    }
    async notif_newRound(args) {
        this.placeTile.clearPendingTiles();
        this.placeTile.setCanUndo(false);
        const ps = this.bga.gameui.gamedatas.playerState;
        ps.cells_this_turn = "[]";
        ps.pending_bonus_tiles = "[]";
        ps.pending_bonus_slots = 0;
        ps.street_art_pending = 0;
        this.bga.gameui.gamedatas.currentRound = args.round;
        Object.keys(this.bga.gameui.gamedatas.players).forEach((pId) => {
            this.renderRoundTracker(Number(pId), args.round);
        });
        const roundEl = document.getElementById("gfe-round");
        if (roundEl)
            roundEl.textContent = String(args.round);
        const boards = args.playerBoards ?? {};
        for (const [playerIdStr, board] of Object.entries(boards)) {
            const playerId = Number(playerIdStr);
            const layer = document.getElementById(`gfe-tiles-layer-${playerId}`);
            if (layer)
                layer.innerHTML = "";
            const placements = this.normalizePlacements(board.placements);
            for (const p of placements) {
                const isLast = Number(p.x) === Number(board.last_x) &&
                    Number(p.y) === Number(board.last_y) &&
                    p.tile_type === board.last_tile_type &&
                    Number(p.rotation) === Number(board.last_rotation) &&
                    Number(p.mirror) === Number(board.last_mirror);
                this.drawTileOnSVG(playerId, p.tile_type, Number(p.x), Number(p.y), Number(p.rotation), Number(p.mirror) === 1, isLast);
            }
            const monument = Array.isArray(board.monument_completed)
                ? board.monument_completed
                : JSON.parse(String(board.monument_completed || "[]"));
            const mustsee = Array.isArray(board.mustsee_completed)
                ? board.mustsee_completed
                : JSON.parse(String(board.mustsee_completed || "[]"));
            const streetArt = Array.isArray(board.street_art_completed)
                ? board.street_art_completed
                : JSON.parse(String(board.street_art_completed || "[]"));
            this.renderMonumentCollectionTrack(playerId, monument.length, board.collection_count, board.monument_score, board.collection_score, board.monument_collection_score);
            this.renderMustSeeUfoTrack(playerId, board.ufo_count, mustsee.length, board.mustsee_score, board.ufo_score, board.monument_collection_score, board.street_art_score);
            this.renderStreetArtTrack(playerId, streetArt, board.street_art_score);
        }
    }
    // ===== Helper functions =====
    normalizeCoveredCells(coveredCells) {
        const list = Array.isArray(coveredCells) ? coveredCells : Object.values(coveredCells ?? {});
        return list.map((cell) => ({
            x: Number(cell.x),
            y: Number(cell.y),
            tile_type: cell.tile_type
        }));
    }
    normalizePlacements(placements) {
        const list = Array.isArray(placements) ? placements : Object.values(placements ?? {});
        return list.map((p) => ({
            tile_type: p.tile_type,
            x: Number(p.x),
            y: Number(p.y),
            rotation: Number(p.rotation),
            mirror: Number(p.mirror)
        }));
    }
    continueAfterPlacement(playerId, streetArtPending, pendingTiles, awaitingTurnConfirm = false, canSurviveRemaining, hasLegalI1Move) {
        const myId = this.bga.players.getCurrentPlayerId();
        if (Number(playerId) !== Number(myId))
            return;
        if (hasLegalI1Move !== undefined) {
            this.placeTile.setHasLegalI1Move(hasLegalI1Move);
        }
        const ps = this.bga.gameui.gamedatas.playerState;
        ps.pending_bonus_tiles = JSON.stringify(pendingTiles);
        ps.street_art_pending = streetArtPending;
        this.placeTile.setCanUndo(true);
        if (canSurviveRemaining !== undefined) {
            this.placeTile.setCanSurviveRemaining(canSurviveRemaining);
        }
        if (awaitingTurnConfirm) {
            this.placeTile.showConfirmEndTurn();
            return;
        }
        if (streetArtPending > 0) {
            this.placeTile.showStreetArtChoose();
            return;
        }
        if (pendingTiles.length > 0) {
            this.placeTile.showBonusButtons(pendingTiles);
            return;
        }
        this.placeTile.showConfirmEndTurn();
    }
    // ===== NOTIFICATIONS =====
    applyBoardScoringFromNotif(args) {
        const monument = Array.isArray(args.monument_completed)
            ? args.monument_completed
            : JSON.parse(String(args.monument_completed || "[]"));
        const mustsee = Array.isArray(args.mustsee_completed)
            ? args.mustsee_completed
            : JSON.parse(String(args.mustsee_completed || "[]"));
        this.renderMonumentCollectionTrack(args.player_id, monument.length, args.collection_count, args.monument_score, args.collection_score, args.monument_collection_score);
        this.renderMustSeeUfoTrack(args.player_id, args.ufo_count, mustsee.length, args.mustsee_score, args.ufo_score, args.monument_collection_score, args.street_art_score);
        if (args.player_id === this.bga.players.getCurrentPlayerId()) {
            const ps = this.bga.gameui.gamedatas.playerState;
            ps.collection_count = args.collection_count;
            ps.collection_score = args.collection_score;
            ps.ufo_count = args.ufo_count;
            ps.ufo_score = args.ufo_score;
            ps.mustsee_completed = JSON.stringify(mustsee);
            ps.mustsee_score = args.mustsee_score;
            ps.monument_completed = JSON.stringify(monument);
            ps.monument_score = args.monument_score;
            ps.monument_collection_score = args.monument_collection_score;
            ps.street_art_score = args.street_art_score;
        }
    }
    async notif_tilePlaced(args) {
        const myId = this.bga.players.getCurrentPlayerId();
        if (Number(args.player_id) !== Number(myId))
            return;
        document
            .getElementById(`gfe-tiles-layer-${args.player_id}`)
            ?.querySelectorAll(".gfe-tile-last")
            .forEach((el) => el.classList.remove("gfe-tile-last"));
        this.drawTileOnSVG(args.player_id, args.tile_type, args.x, args.y, args.rotation, args.mirror, true);
        const cells = getShapeCells(args.tile_type, args.x, args.y, args.rotation, args.mirror);
        const gamedatas = this.bga.gameui.gamedatas;
        const covered = this.normalizeCoveredCells(gamedatas.coveredCells);
        cells.forEach(([x, y]) => {
            covered.push({ x, y, tile_type: args.tile_type });
        });
        gamedatas.coveredCells = covered;
        gamedatas.playerState.has_started = 1;
        gamedatas.playerState.last_x = args.x;
        gamedatas.playerState.last_y = args.y;
        gamedatas.playerState.last_tile_type = args.tile_type;
        gamedatas.playerState.last_rotation = args.rotation;
        gamedatas.playerState.last_mirror = args.mirror ? 1 : 0;
        this.applyBoardScoringFromNotif(args);
        this.continueAfterPlacement(args.player_id, args.street_art_pending ?? 0, args.pending_tiles ?? [], !!args.awaiting_turn_confirm, args.can_survive_remaining, args.has_legal_i1_move);
    }
    async notif_bonusTilePlaced(args) {
        const myId = this.bga.players.getCurrentPlayerId();
        if (Number(args.player_id) !== Number(myId))
            return;
        document
            .getElementById(`gfe-tiles-layer-${args.player_id}`)
            ?.querySelectorAll(".gfe-tile-last")
            .forEach((el) => el.classList.remove("gfe-tile-last"));
        this.drawTileOnSVG(args.player_id, args.tile_type, args.x, args.y, args.rotation, args.mirror, true);
        const cells = getShapeCells(args.tile_type, args.x, args.y, args.rotation, args.mirror);
        const gamedatas = this.bga.gameui.gamedatas;
        const covered = this.normalizeCoveredCells(gamedatas.coveredCells);
        cells.forEach(([x, y]) => {
            covered.push({ x, y, tile_type: args.tile_type });
        });
        gamedatas.coveredCells = covered;
        gamedatas.playerState.has_started = 1;
        gamedatas.playerState.last_x = args.x;
        gamedatas.playerState.last_y = args.y;
        gamedatas.playerState.last_tile_type = args.tile_type;
        gamedatas.playerState.last_rotation = args.rotation;
        gamedatas.playerState.last_mirror = args.mirror ? 1 : 0;
        this.applyBoardScoringFromNotif(args);
        this.continueAfterPlacement(args.player_id, args.street_art_pending ?? 0, args.pending_tiles ?? [], !!args.awaiting_turn_confirm, args.can_survive_remaining, args.has_legal_i1_move);
    }
    async notif_streetArtChosen(args) {
        const myId = this.bga.players.getCurrentPlayerId();
        if (Number(args.player_id) !== Number(myId))
            return;
        const ps = this.bga.gameui.gamedatas.playerState;
        const mustsee = JSON.parse(String(ps.mustsee_completed || "[]"));
        this.bga.gameui.gamedatas.playerState.street_art_score = args.street_art_score;
        // keep client memory in sync — the legal street art hints are computed from it
        ps.street_art_completed = JSON.stringify(args.street_art_completed ?? []);
        this.renderMustSeeUfoTrack(args.player_id, ps.ufo_count, mustsee.length, ps.mustsee_score, ps.ufo_score, ps.monument_collection_score, ps.street_art_score);
        this.renderStreetArtTrack(args.player_id, args.street_art_completed, args.street_art_score);
        this.continueAfterPlacement(args.player_id, args.street_art_pending ?? 0, args.pending_tiles ?? [], !!args.awaiting_turn_confirm, args.can_survive_remaining, args.has_legal_i1_move);
    }
    async notif_turnFinalized(args) {
        const myId = this.bga.players.getCurrentPlayerId();
        if (Number(args.player_id) !== Number(myId))
            return;
        this.applyBoardScoringFromNotif(args);
    }
    async notif_turnUndone(args) {
        const myId = this.bga.players.getCurrentPlayerId();
        if (Number(args.player_id) !== Number(myId))
            return;
        const playerId = args.player_id;
        const layer = document.getElementById(`gfe-tiles-layer-${playerId}`);
        if (layer) {
            layer.innerHTML = "";
        }
        // 2. if this is MY undo, refresh client memory (needed for legal placement)
        this.bga.gameui.gamedatas.coveredCells = this.normalizeCoveredCells(args.coveredCells);
        this.bga.gameui.gamedatas.placements = this.normalizePlacements(args.placements);
        this.bga.gameui.gamedatas.playerState = args.playerState;
        this.placeTile.clearCanSurviveRemaining();
        // 3. redraw remaining tiles (same loop as setup ~277–288)
        const ps = args.playerState;
        const placements = this.normalizePlacements(args.placements);
        for (const p of placements) {
            const isLast = Number(p.x) === Number(ps.last_x) &&
                Number(p.y) === Number(ps.last_y) &&
                p.tile_type === ps.last_tile_type &&
                Number(p.rotation) === Number(ps.last_rotation) &&
                Number(p.mirror) === Number(ps.last_mirror);
            this.drawTileOnSVG(playerId, p.tile_type, Number(p.x), Number(p.y), Number(p.rotation), Number(p.mirror) === 1, isLast);
        }
        // 4. restore track UI for this player (scores already restored on server)
        const monument = JSON.parse(String(ps.monument_completed || "[]"));
        const mustsee = JSON.parse(String(ps.mustsee_completed || "[]"));
        const streetArt = JSON.parse(String(ps.street_art_completed || "[]"));
        this.renderMonumentCollectionTrack(playerId, monument.length, Number(ps.collection_count), Number(ps.monument_score), Number(ps.collection_score), Number(ps.monument_collection_score));
        this.renderMustSeeUfoTrack(playerId, Number(ps.ufo_count), mustsee.length, Number(ps.mustsee_score), Number(ps.ufo_score), Number(ps.monument_collection_score), Number(ps.street_art_score));
        this.renderStreetArtTrack(playerId, streetArt, Number(ps.street_art_score));
        // 5. if this is MY undo, reset UI back to “place a tile”
        this.placeTile.resetAfterUndo();
    }
    async notif_turnEnded(args) {
        if (args.player_id === this.bga.players.getCurrentPlayerId()) {
            this.placeTile.setCanUndo(false);
            this.placeTile.clearPendingTiles();
        }
    }
}

export { Game };
