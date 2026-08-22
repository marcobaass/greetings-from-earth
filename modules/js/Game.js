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
function tileButtonHtml(tileType) {
    const shape = getShapeCells(tileType, 0, 0, 0, false);
    const outline = cellsToOutlinePath(shape);
    const xs = shape.map(([x]) => x);
    const ys = shape.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs) + 1;
    const maxY = Math.max(...ys) + 1;
    const box = 4;
    const width = maxX - minX;
    const height = maxY - minY;
    const originX = minX - (box - width) / 2;
    const originY = minY - (box - height) / 2;
    const viewBox = `${originX} ${originY} ${box} ${box}`;
    return `<svg width="40" height="40" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg"><path d="${outline}" fill="none" stroke="white" stroke-width="0.25"/></svg>`;
}

/** Checks if the tile overlaps with the covered cells
 * @param tileCells - The cells of the tile to check for overlap
 * @param coveredCells - The cells that are already covered
 * @returns true if the tile overlaps with the covered cells, false otherwise
 */
function overlapsCoveredCells(tileCells, coveredCells) {
    const covered = new Set(coveredCells.map((cell) => cellKey(cell.x, cell.y)));
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
//   if overlapsCoveredCells(tileCells, gamedatas.coveredCells): return false
//   sbahnRefs = getSbahnCellSet()
//   if NOT gamedatas.playerState.has_started:
//     referenceSet = sbahnRefs
//   else:
//     lastCells = getLastPlacedTileCells(gamedatas.playerState)
//     referenceSet = new Set([...sbahnRefs, ...lastCells.map(([x,y]) => cellKey(x,y))])
//   return touchesAny(tileCells, referenceSet)
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
    }
    resetPlacementState() {
        this.tileSelected = null;
        this.anchorX = null;
        this.anchorY = null;
        this.rotation = 0;
        this.mirror = false;
    }
    cleanupActivePlayer() {
        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        const streetArtGrid = document.getElementById(`gfe-street-art-choose-${playerId}`);
        if (grid) {
            this.cleanUpPreview(grid);
            grid.classList.remove("gfe-play-grid-interactive");
            grid.removeEventListener("click", this.onGridClick);
        }
        if (streetArtGrid) {
            streetArtGrid.classList.remove("gfe-street-art-choose-interactive");
            streetArtGrid.removeEventListener("click", this.onStreetArtClick);
        }
        // forgets which tile player picked up and where
        this.resetPlacementState();
    }
    /**
     * Shows a preview of the tile on the grid
     * @param grid The grid element to show the preview on
     * @param tileType The type of tile to show the preview for
     * @param anchorX The x coordinate of the anchor point
     * @param anchorY The y coordinate of the anchor point
     */
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
        const cx = anchorX + 0.5;
        const cy = anchorY + 0.5;
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
        const anchorEl = grid.querySelector(`.gfe-cell[data-x="${this.anchorX}"][data-y="${this.anchorY}"]`);
        if (anchorEl) {
            anchorEl.classList.add("gfe-cell-anchor");
        }
        if (!this.placeTileArgs)
            return;
        this.updateActionButtons(legal, grid);
    }
    updateActionButtons(legal, grid) {
        this.bga.statusBar.removeActionButtons();
        if (!this.placeTileArgs)
            return;
        const allTiles = this.pendingTiles.length > 0 ? this.pendingTiles : [...this.placeTileArgs.tileOptions, ...this.placeTileArgs.alwaysAvailableTiles];
        allTiles.forEach((tile) => {
            this.bga.statusBar.addActionButton(tileButtonHtml(tile), () => {
                this.tileSelected = tile;
                this.anchorX = 0;
                this.anchorY = 0;
                this.rotation = 0;
                this.mirror = false;
                this.showPreview(grid, tile, 0, 0);
            });
        });
        this.bga.statusBar.addActionButton("↻", () => {
            if (!this.tileSelected || this.anchorX == null || this.anchorY == null)
                return;
            this.rotation = (this.rotation + 90) % 360;
            this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
        });
        this.bga.statusBar.addActionButton("↺", () => {
            if (!this.tileSelected || this.anchorX == null || this.anchorY == null)
                return;
            this.rotation = (this.rotation + 270) % 360;
            this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
        });
        this.bga.statusBar.addActionButton("↔", () => {
            if (!this.tileSelected || this.anchorX == null || this.anchorY == null)
                return;
            this.mirror = !this.mirror;
            this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
        });
        if (legal && this.tileSelected) {
            this.bga.statusBar.addActionButton(_("Confirm placement"), () => {
                if (!this.tileSelected || this.anchorX == null || this.anchorY == null)
                    return;
                const cells = getShapeCells(this.tileSelected, this.anchorX, this.anchorY, this.rotation, this.mirror);
                if (!isPlacementLegal(cells, this.bga.gameui.gamedatas))
                    return;
                const action = this.pendingTiles.length > 0 ? "actPlaceBonusTile" : "actPlaceTile";
                this.bga.actions.performAction(action, {
                    tileType: this.tileSelected,
                    x: this.anchorX,
                    y: this.anchorY,
                    rotation: this.rotation,
                    mirror: this.mirror
                });
            });
        }
        this.addUndoButtonIfPossible();
    }
    setCanUndo(value) {
        this.canUndo = value;
    }
    addUndoButtonIfPossible() {
        if (!this.canUndo)
            return;
        this.bga.statusBar.addActionButton(_("Undo"), () => {
            this.bga.actions.performAction("actUndo", {});
        });
    }
    showBonusButtons(pendingTiles) {
        this.pendingTiles = pendingTiles;
        this.resetPlacementState();
        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        const streetArtGrid = document.getElementById(`gfe-street-art-choose-${playerId}`);
        if (!grid)
            return;
        if (streetArtGrid) {
            streetArtGrid.classList.remove("gfe-street-art-choose-interactive");
            streetArtGrid.removeEventListener("click", this.onStreetArtClick);
        }
        this.cleanUpPreview(grid);
        // street art step removes the grid handler — put it back so bonus tiles can be positioned
        grid.removeEventListener("click", this.onGridClick);
        grid.classList.add("gfe-play-grid-interactive");
        grid.addEventListener("click", this.onGridClick);
        this.bga.statusBar.setTitle(_("${you} must place your bonus tile on the map"));
        this.updateActionButtons(false, grid);
    }
    clearPendingTiles() {
        this.pendingTiles = [];
        this.awaitingEndTurn = false;
    }
    showStreetArtChoose() {
        this.clearPendingTiles();
        this.resetPlacementState();
        const playerId = this.bga.players.getCurrentPlayerId();
        const streetArtGrid = document.getElementById(`gfe-street-art-choose-${playerId}`);
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if (grid) {
            this.cleanUpPreview(grid);
            grid.classList.remove("gfe-play-grid-interactive");
            grid.removeEventListener("click", this.onGridClick);
        }
        if (!streetArtGrid)
            return;
        this.bga.statusBar.setTitle(_("${you} must mark a street art bonus"));
        this.bga.statusBar.removeActionButtons();
        this.addUndoButtonIfPossible();
        streetArtGrid.removeEventListener("click", this.onStreetArtClick);
        streetArtGrid.classList.add("gfe-street-art-choose-interactive");
        streetArtGrid.addEventListener("click", this.onStreetArtClick);
    }
    /**
     * Placement finished — only Undo or End turn (does not advance round by itself).
     */
    showConfirmEndTurn() {
        this.clearPendingTiles();
        this.resetPlacementState();
        this.awaitingEndTurn = true;
        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        const streetArtGrid = document.getElementById(`gfe-street-art-choose-${playerId}`);
        if (grid) {
            this.cleanUpPreview(grid);
            grid.classList.remove("gfe-play-grid-interactive");
            grid.removeEventListener("click", this.onGridClick);
        }
        if (streetArtGrid) {
            streetArtGrid.classList.remove("gfe-street-art-choose-interactive");
            streetArtGrid.removeEventListener("click", this.onStreetArtClick);
        }
        this.bga.statusBar.setTitle(this.canUndo ? _("${you}: undo, or end your turn") : _("${you} must end your turn"));
        this.bga.statusBar.removeActionButtons();
        this.addUndoButtonIfPossible();
        this.bga.statusBar.addActionButton(_("End turn"), () => {
            this.bga.actions.performAction("actEndTurn", {});
        });
    }
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
        this.tileSelected = null;
        this.placeTileArgs = null;
        this.anchorX = null;
        this.anchorY = null;
        this.pendingTiles = [];
        /** Client flag: placement done, waiting for End turn / Undo */
        this.awaitingEndTurn = false;
        /** True only after a change this turn that can be reverted */
        this.canUndo = false;
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
        this.onStreetArtClick = (event) => {
            const cell = event.target;
            if (!(cell instanceof HTMLElement) || !cell.classList.contains("gfe-street-art-choose-cell"))
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
    }
    onEnteringState(args, isCurrentPlayerActive) {
        this.placeTileArgs = args;
        this.pendingTiles = [];
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
        this.bga.statusBar.setTitle(isCurrentPlayerActive ? _("${you} must place your tile on the map") : _("Other players are placing their tile..."));
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
        if (!this.placeTileArgs)
            return;
        this.onEnteringState(this.placeTileArgs, true);
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
        this.bga.statusBar.addActionButton("↻", () => {
            if (!this.tileSelected || this.anchorX == null || this.anchorY == null)
                return;
            this.rotation = (this.rotation + 90) % 360;
            this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
        });
        this.bga.statusBar.addActionButton("↺", () => {
            if (!this.tileSelected || this.anchorX == null || this.anchorY == null)
                return;
            this.rotation = (this.rotation + 270) % 360;
            this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
        });
        this.bga.statusBar.addActionButton("↔", () => {
            if (!this.tileSelected || this.anchorX == null || this.anchorY == null)
                return;
            this.mirror = !this.mirror;
            this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
        });
        if (legal && this.tileSelected) {
            this.bga.statusBar.addActionButton("✔", () => {
                if (!this.tileSelected || this.anchorX == null || this.anchorY == null)
                    return;
                const cells = getShapeCells(this.tileSelected, this.anchorX, this.anchorY, this.rotation, this.mirror);
                if (!isPlacementLegal(cells, this.bga.gameui.gamedatas))
                    return;
                this.bga.actions.performAction("actPlaceBonusTile", {
                    tileType: this.tileSelected,
                    x: this.anchorX,
                    y: this.anchorY,
                    rotation: this.rotation,
                    mirror: this.mirror
                });
            });
        }
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

class Game {
    constructor(bga) {
        console.log("greetingsfromearth constructor");
        this.bga = bga;
        // Register state classes — names must match PHP state class names
        this.placeTile = new PlaceTile(this, bga);
        this.placeBonus = new PlaceBonus(this, bga);
        this.bga.states.register("PlaceTile", this.placeTile);
        this.bga.states.register("PlaceBonus", this.placeBonus);
    }
    // ===== RENDERING =====
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
        roundTracker.innerHTML = "";
        for (let i = 0; i < round; i++) {
            roundTracker.innerHTML += `<div class="gfe-round-tracker-circle" style="top: ${ROUNDS_POSITIONS[i].top}%; left: ${ROUNDS_POSITIONS[i].left}%"></div>`;
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
        track.innerHTML = "";
        for (let i = 0; i < monumentCount; i++) {
            track.innerHTML += `<div class="gfe-monument-track-circle" data-index="${i}" style="top: ${17.4 + i * 0.56}%; left: ${11.3 + i * 10.86}%"></div>`;
        }
        track.innerHTML += `<div class="gfe-monument-score"><p class="gfe-track-score">${monumentScoreString}</p></div>`;
        for (let i = 0; i < collectionCount; i++) {
            track.innerHTML += `<div class="gfe-collection-track-circle" data-index="${i}" style="top: ${55 + i * 0.515}%; left: ${11.2 + i * 7.8}%"></div>`;
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
        track.innerHTML = "";
        for (let i = 0; i < mustseeCount; i++) {
            const pair = Math.floor(i / 2);
            const top = i % 2 === 0 ? 11.9 + pair * -1.7 : 29.2 + pair * -0.35;
            const left = (i % 2 === 0 ? 14.5 : 19.7) + pair * 10.2;
            track.innerHTML += `<div class="gfe-mustsee-track-circle" data-index="${i}" style="top: ${top}%; left: ${left}%"></div>`;
        }
        track.innerHTML += `<div class="gfe-mustsee-score"><p class="gfe-track-score-orange">${mustseeScoreString}</p></div>`;
        for (let i = 0; i < ufoCount; i++) {
            track.innerHTML += `<div class="gfe-ufo-track-circle" data-index="${i}" style="top: ${59 + i * -0.315}%; left: ${15.2 + i * 9.8}%"></div>`;
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
        for (const cell of completedKeys) {
            const [x, y] = cell.split(",");
            if (isNaN(Number(x)) || isNaN(Number(y)))
                continue;
            const cellEl = streetArtGridEl.querySelector(`.gfe-street-art-choose-cell[data-x="${Number(x)}"][data-y="${Number(y)}"]`);
            if (cellEl) {
                cellEl.classList.add("gfe-street-art-marked");
            }
        }
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
        console.log("Starting game setup", gamedatas);
        this.gamedatas = gamedatas;
        // Set up the game area
        this.bga.gameArea.getElement().insertAdjacentHTML("beforeend", `
            <div id="gfe-game-area">
                <div id="gfe-round-info">
                    Round: <span id="gfe-round">${gamedatas.currentRound}</span> / 14
                </div>
                <div id="gfe-player-boards"></div>
            </div>
        `);
        // Set up player boards
        Object.entries(gamedatas.players).forEach(([pId, player]) => {
            const playerId = Number(pId);
            document.getElementById("gfe-player-boards").insertAdjacentHTML("beforeend", `
                <div id="gfe-board-${playerId}" class="gfe-player-board">
                    <strong>${player.name}</strong>
                    <div id="gfe-sheet-${playerId}" class="gfe-sheet">
                        <div id="gfe-play-grid-${playerId}" class="gfe-play-grid"></div>

                        <!-- SVG layer for tiles -->
                        <svg id="gfe-tiles-layer-${playerId}" class="gfe-tiles-layer" viewBox="0 0 18 13" preserveAspectRatio="none">

                        </svg>

                        <div id="gfe-dice-roll-${playerId}" class="gfe-dice-indicator gfe-dice-${gamedatas.diceRoll}"></div>
                        <div id="gfe-monument-collection-track-${playerId}" class="gfe-monument-collection-track"></div>
                        <div id="gfe-ufo-mustsee-track-${playerId}" class="gfe-ufo-mustsee-track"></div>
                        <div id="gfe-street-art-score-${playerId}" class="gfe-street-art-score"></div>
                        <div id="gfe-street-art-choose-${playerId}" class="gfe-street-art-choose"></div>
                        <div id="gfe-round-tracker-${playerId}" class="gfe-round-tracker"></div>
                    </div>
                    
                </div>

            `);
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
        const myId = this.bga.players.getCurrentPlayerId();
        Object.keys(gamedatas.players).forEach((pId) => {
            this.renderRoundTracker(Number(pId), gamedatas.currentRound);
        });
        const placements = gamedatas.placements ?? [];
        const ps = gamedatas.playerState;
        for (const p of placements) {
            const isLast = Number(p.x) === Number(ps.last_x) &&
                Number(p.y) === Number(ps.last_y) &&
                p.tile_type === ps.last_tile_type &&
                Number(p.rotation) === Number(ps.last_rotation) &&
                Number(p.mirror) === Number(ps.last_mirror);
            this.drawTileOnSVG(myId, p.tile_type, Number(p.x), Number(p.y), Number(p.rotation), Number(p.mirror) === 1, isLast);
        }
        const monument = JSON.parse(String(gamedatas.playerState.monument_completed || "[]"));
        const streetArt = JSON.parse(String(gamedatas.playerState.street_art_completed || "[]"));
        this.renderStreetArtTrack(myId, streetArt, Number(gamedatas.playerState.street_art_score));
        this.renderMonumentCollectionTrack(myId, monument.length, Number(gamedatas.playerState.collection_count), Number(gamedatas.playerState.monument_score), Number(gamedatas.playerState.collection_score), Number(gamedatas.playerState.monument_collection_score));
        const mustsee = JSON.parse(String(gamedatas.playerState.mustsee_completed || "[]"));
        this.renderMustSeeUfoTrack(myId, Number(gamedatas.playerState.ufo_count), mustsee.length, Number(gamedatas.playerState.mustsee_score), Number(gamedatas.playerState.ufo_score), Number(gamedatas.playerState.monument_collection_score), Number(gamedatas.playerState.street_art_score));
        this.setupNotifications();
        console.log("Ending game setup");
    }
    setupNotifications() {
        console.log("notifications subscriptions setup");
        this.bga.notifications.setupPromiseNotifications({});
    }
    async notif_newRound(args) {
        console.log("New round:", args.round, "Dice roll:", args.dice_roll);
        this.placeTile.clearPendingTiles();
        this.placeTile.setCanUndo(false);
        this.bga.gameui.gamedatas.currentRound = args.round;
        Object.keys(this.bga.gameui.gamedatas.players).forEach((pId) => {
            this.renderRoundTracker(Number(pId), args.round);
        });
        const roundEl = document.getElementById("gfe-round");
        if (roundEl)
            roundEl.textContent = String(args.round);
    }
    // ===== Helper functions =====
    continueAfterPlacement(playerId, streetArtPending, pendingTiles, awaitingTurnConfirm = false) {
        const myId = this.bga.players.getCurrentPlayerId();
        if (playerId !== myId)
            return;
        this.placeTile.setCanUndo(true);
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
    async notif_tilePlaced(args) {
        document
            .getElementById(`gfe-tiles-layer-${args.player_id}`)
            ?.querySelectorAll(".gfe-tile-last")
            .forEach((el) => el.classList.remove("gfe-tile-last"));
        this.drawTileOnSVG(args.player_id, args.tile_type, args.x, args.y, args.rotation, args.mirror, true);
        const cells = getShapeCells(args.tile_type, args.x, args.y, args.rotation, args.mirror);
        // this.renderCoveredCells(
        //   args.player_id,
        //   cells.map(([x, y]) => ({ x, y, tile_type: args.tile_type }))
        // );
        const myId = this.bga.players.getCurrentPlayerId();
        if (args.player_id === myId) {
            const gamedatas = this.bga.gameui.gamedatas;
            cells.forEach(([x, y]) => {
                gamedatas.coveredCells.push({ x, y, tile_type: args.tile_type });
            });
            gamedatas.playerState.has_started = 1;
            gamedatas.playerState.last_x = args.x;
            gamedatas.playerState.last_y = args.y;
            gamedatas.playerState.last_tile_type = args.tile_type;
            gamedatas.playerState.last_rotation = args.rotation;
            gamedatas.playerState.last_mirror = args.mirror ? 1 : 0;
        }
        this.continueAfterPlacement(args.player_id, args.street_art_pending ?? 0, args.pending_tiles ?? [], !!args.awaiting_turn_confirm);
    }
    async notif_bonusTilePlaced(args) {
        document
            .getElementById(`gfe-tiles-layer-${args.player_id}`)
            ?.querySelectorAll(".gfe-tile-last")
            .forEach((el) => el.classList.remove("gfe-tile-last"));
        this.drawTileOnSVG(args.player_id, args.tile_type, args.x, args.y, args.rotation, args.mirror, true);
        const cells = getShapeCells(args.tile_type, args.x, args.y, args.rotation, args.mirror);
        // this.renderCoveredCells(
        //   args.player_id,
        //   cells.map(([x, y]) => ({ x, y, tile_type: args.tile_type }))
        // );
        const myId = this.bga.players.getCurrentPlayerId();
        if (args.player_id === myId) {
            const gamedatas = this.bga.gameui.gamedatas;
            cells.forEach(([x, y]) => {
                gamedatas.coveredCells.push({ x, y, tile_type: args.tile_type });
            });
            gamedatas.playerState.has_started = 1;
            gamedatas.playerState.last_x = args.x;
            gamedatas.playerState.last_y = args.y;
            gamedatas.playerState.last_tile_type = args.tile_type;
            gamedatas.playerState.last_rotation = args.rotation;
            gamedatas.playerState.last_mirror = args.mirror ? 1 : 0;
        }
        this.continueAfterPlacement(args.player_id, args.street_art_pending ?? 0, args.pending_tiles ?? [], !!args.awaiting_turn_confirm);
    }
    async notif_streetArtChosen(args) {
        const ps = this.bga.gameui.gamedatas.playerState;
        const mustsee = JSON.parse(String(ps.mustsee_completed || "[]"));
        if (args.player_id === this.bga.players.getCurrentPlayerId()) {
            this.bga.gameui.gamedatas.playerState.street_art_score = args.street_art_score;
            this.renderMustSeeUfoTrack(args.player_id, ps.ufo_count, mustsee.length, ps.mustsee_score, ps.ufo_score, ps.monument_collection_score, ps.street_art_score);
        }
        this.renderStreetArtTrack(args.player_id, args.street_art_completed, args.street_art_score);
        this.continueAfterPlacement(args.player_id, args.street_art_pending ?? 0, args.pending_tiles ?? [], !!args.awaiting_turn_confirm);
    }
    async notif_turnFinalized(args) {
        const monument = Array.isArray(args.monument_completed)
            ? args.monument_completed
            : JSON.parse(String(args.monument_completed || "[]"));
        this.renderMonumentCollectionTrack(args.player_id, monument.length, args.collection_count, args.monument_score, args.collection_score, args.monument_collection_score);
        const mustsee = Array.isArray(args.mustsee_completed)
            ? args.mustsee_completed
            : JSON.parse(String(args.mustsee_completed || "[]"));
        this.renderMustSeeUfoTrack(args.player_id, args.ufo_count, mustsee.length, args.mustsee_score, args.ufo_score, args.monument_collection_score, args.street_art_score);
        // Only sync local gamedatas for yourself
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
    async notif_turnUndone(args) {
        const playerId = args.player_id;
        const myId = this.bga.players.getCurrentPlayerId();
        const layer = document.getElementById(`gfe-tiles-layer-${playerId}`);
        if (layer) {
            layer.innerHTML = "";
        }
        // 2. if this is MY undo, refresh client memory (needed for legal placement)
        if (playerId === myId) {
            this.bga.gameui.gamedatas.coveredCells = args.coveredCells;
            this.bga.gameui.gamedatas.placements = args.placements;
            this.bga.gameui.gamedatas.playerState = args.playerState;
        }
        // 3. redraw remaining tiles (same loop as setup ~277–288)
        const ps = args.playerState;
        const placements = args.placements ?? [];
        for (const p of placements) {
            const isLast = Number(p.x) === Number(ps.last_x) &&
                Number(p.y) === Number(ps.last_y) &&
                p.tile_type === ps.last_tile_type &&
                Number(p.rotation) === Number(ps.last_rotation) &&
                Number(p.mirror) === Number(ps.last_mirror);
            this.drawTileOnSVG(playerId, p.tile_type, Number(p.x), Number(p.y), Number(p.rotation), Number(p.mirror) === 1, isLast);
        }
        // 4. if this is MY undo, reset UI back to “place a tile”
        if (playerId === myId) {
            const streetArt = JSON.parse(String(ps.street_art_completed || "[]"));
            this.renderStreetArtTrack(myId, streetArt, Number(ps.street_art_score));
            this.placeTile.resetAfterUndo();
        }
    }
    async notif_turnEnded(args) {
        if (args.player_id === this.bga.players.getCurrentPlayerId()) {
            this.placeTile.setCanUndo(false);
            this.placeTile.clearPendingTiles();
        }
    }
}

export { Game };
