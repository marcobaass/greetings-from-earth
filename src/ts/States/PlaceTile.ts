import { Game } from "../Game";
import { isPlacementLegal, canI1BePlaced, getLegalPlacementHintCells } from "../placement";
import { computeTileShift, getShapeCellsAroundPivot, pivotToAnchor, isInsideGrid, cellsToOutlinePath, tileButtonHtml } from "../tiles";

/** Distance (in cells) from the pivot centre to the control buttons */
const RING_RADIUS = 3.2;
const GRID_COLS = 18;
const GRID_ROWS = 13;

export class PlaceTile {
  private tileSelected: string | null = null;
  private placeTileArgs: PlaceTileArgs | null = null;
  /** Grid cell of the tile's pivot — rotate/mirror happen around it and the button ring is centred on it */
  private pivotX: number | null = null;
  private pivotY: number | null = null;
  private pendingTiles: string[] = [];
  /** Client flag: placement done, waiting for End turn / Undo */
  private awaitingEndTurn = false;
  /** True only after a change this turn that can be reverted */
  private canUndo = false;
  /** Server forecast: I1 path exists for remaining rounds. null = recompute locally. */
  private canSurviveRemaining: boolean | null = null;
  private followingMouse = false;

  private onGridClick = (event: MouseEvent) => {
    const cell = event.target as HTMLElement;
    if (!this.tileSelected) return;
    if (!(cell instanceof HTMLElement) || !cell.classList.contains("gfe-cell")) return;

    const playerId = this.bga.players.getCurrentPlayerId();
    const grid = document.getElementById(`gfe-play-grid-${playerId}`);
    if (!grid) return;

    let x = Number(cell.dataset.x);
    let y = Number(cell.dataset.y);
    if (isNaN(x) || isNaN(y)) return;

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

  private onMouseMove = (event: MouseEvent) => {
    if (!this.followingMouse) return;
    if (!this.tileSelected) return;

    const cell = event.target as HTMLElement;
    if (!(cell instanceof HTMLElement) || !cell.classList.contains("gfe-cell")) return;

    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);
    if (isNaN(x) || isNaN(y)) return;

    if (x === this.pivotX && y === this.pivotY) return;

    const playerId = this.bga.players.getCurrentPlayerId();
    const grid = document.getElementById(`gfe-play-grid-${playerId}`);
    if (!grid) return;

    this.showPreview(grid, this.tileSelected, x, y);
  };

  private onStreetArtClick = (event: MouseEvent) => {
    const cell = event.target as HTMLElement;

    if (!(cell instanceof HTMLElement) || !cell.classList.contains("gfe-street-art-choose-cell")) return;

    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);

    if (isNaN(x) || isNaN(y)) return;

    this.bga.actions.performAction("actChooseStreetArt", {
      x: x,
      y: y
    });
  };

  private cleanUpPreview(grid: HTMLElement) {
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

  private clearLegalHints(grid: HTMLElement) {
    grid.querySelectorAll(".gfe-cell-legal-hint").forEach((el) => {
      el.classList.remove("gfe-cell-legal-hint");
    });
  }
  private showLegalHints(grid: HTMLElement) {
    this.clearLegalHints(grid);
    const cells = getLegalPlacementHintCells(this.bga.gameui.gamedatas);
    for (const [x, y] of cells) {
      grid.querySelector(`.gfe-cell[data-x="${x}"][data-y="${y}"]`)?.classList.add("gfe-cell-legal-hint");
    }
  }

  /**
   * After refresh: resume street art, bonus, or End turn if this turn is already in progress.
   */
  private restoreInProgressTurn(isCurrentPlayerActive: boolean): boolean {
    const ps = this.bga.gameui.gamedatas.playerState;
    const pending = JSON.parse(String(ps.pending_bonus_tiles || "[]")) as string[];
    const streetArtPending = Number(ps.street_art_pending);
    const cells = JSON.parse(String(ps.cells_this_turn || "[]")) as unknown[];

    this.pendingTiles = pending;

    if (!isCurrentPlayerActive) return false;

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

  private resetPlacementState() {
    this.followingMouse = false;
    this.tileSelected = null;
    this.pivotX = null;
    this.pivotY = null;
    this.rotation = 0;
    this.mirror = false;
  }

  private cleanupActivePlayer() {
    const playerId = this.bga.players.getCurrentPlayerId();
    const grid = document.getElementById(`gfe-play-grid-${playerId}`);
    const streetArtGrid = document.getElementById(`gfe-street-art-choose-${playerId}`);

    if (grid) {
      this.cleanUpPreview(grid);
      grid.classList.remove("gfe-play-grid-interactive");
      grid.removeEventListener("click", this.onGridClick);
      grid.removeEventListener("mousemove", this.onMouseMove);
      this.clearLegalHints(grid);
    }

    if (streetArtGrid) {
      streetArtGrid.classList.remove("gfe-street-art-choose-interactive");
      streetArtGrid.removeEventListener("click", this.onStreetArtClick);
    }

    // forgets which tile player picked up and where
    this.resetPlacementState();
  }

  private rotation = 0;
  private mirror = false;

  /**
   * Shows a preview of the tile on the grid
   * @param grid The grid element to show the preview on
   * @param tileType The type of tile to show the preview for
   * @param pivotX The x coordinate of the tile's pivot cell
   * @param pivotY The y coordinate of the tile's pivot cell
   */
  private showPreview(grid: HTMLElement, tileType: string, pivotX: number, pivotY: number) {
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

    if (!this.placeTileArgs) return;

    // While dragging the ring would chase the cursor — only show it once pinned
    if (!this.followingMouse) {
      this.addButtonsForTile(legal, grid);
    }
    this.updateActionButtons(legal, grid);
  }

  /**
   * Fixed control ring centred on the pivot cell — it only moves with the arrow buttons,
   * never when the tile rotates or mirrors.
   */
  private addButtonsForTile(legal: boolean, grid: HTMLElement) {
    if (!this.tileSelected || this.pivotX == null || this.pivotY == null) return;

    const centerX = this.pivotX + 0.5;
    const centerY = this.pivotY + 0.5;
    const diagonal = RING_RADIUS / Math.SQRT2;

    const addButton = (label: string, title: string, dx: number, dy: number, onClick: () => void, enabled = true) => {
      const button = document.createElement("button");
      button.className = "gfe-tile-button";
      button.textContent = label;
      button.title = title;
      button.disabled = !enabled;
      button.style.left = `${((centerX + dx) / GRID_COLS) * 100}%`;
      button.style.top = `${((centerY + dy) / GRID_ROWS) * 100}%`;
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!this.tileSelected || this.pivotX == null || this.pivotY == null) return;
        onClick();
      });
      grid.appendChild(button);
      return button;
    };

    const redraw = () => this.showPreview(grid, this.tileSelected!, this.pivotX!, this.pivotY!);

    const canMove = (stepX: number, stepY: number) =>
      isInsideGrid(getShapeCellsAroundPivot(this.tileSelected!, this.pivotX! + stepX, this.pivotY! + stepY, this.rotation, this.mirror));

    const move = (stepX: number, stepY: number) => {
      if (!canMove(stepX, stepY)) return;
      this.pivotX! += stepX;
      this.pivotY! += stepY;
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

    const confirmButton = addButton(
      "✔",
      _("Confirm"),
      diagonal,
      diagonal,
      () => {
        const tile = this.tileSelected!;
        const cells = getShapeCellsAroundPivot(tile, this.pivotX!, this.pivotY!, this.rotation, this.mirror);
        if (!isPlacementLegal(cells, this.bga.gameui.gamedatas)) return;

        // Server works with the tile's [0,0] offset as anchor, not the pivot
        const [x, y] = pivotToAnchor(tile, this.pivotX!, this.pivotY!, this.rotation, this.mirror);
        const action = this.pendingTiles.length > 0 ? "actPlaceBonusTile" : "actPlaceTile";

        this.bga.actions.performAction(action, {
          tileType: tile,
          x,
          y,
          rotation: this.rotation,
          mirror: this.mirror
        });
      },
      legal
    );
    confirmButton.classList.add("gfe-tile-button-confirm");
  }

  private selectTile(tile: string, grid: HTMLElement): void {
    this.followingMouse = true;
    this.tileSelected = tile;
    this.pivotX = 0;
    this.pivotY = 0;
    this.rotation = 0;
    this.mirror = false;
    grid.classList.add("gfe-play-grid-interactive");
    this.showPreview(grid, tile, 0, 0);
  }

  private updateActionButtons(legal: boolean, grid: HTMLElement) {
    this.bga.statusBar.removeActionButtons();

    if (!this.placeTileArgs) return;

    const mainTiles = this.pendingTiles.length > 0 ? this.pendingTiles : this.placeTileArgs.tileOptions;

    mainTiles.forEach((tile) => {
      this.bga.statusBar.addActionButton(tileButtonHtml(tile), () => {
        this.selectTile(tile, grid);
      });
    });

    this.placeTileArgs.alwaysAvailableTiles.forEach((tile) => {
      this.bga.statusBar.addActionButton(
        tileButtonHtml(tile),
        () => {
          this.selectTile(tile, grid);
        },
        { color: "secondary" }
      );
    });

    this.addUndoButtonIfPossible();
  }

  public setCanUndo(value: boolean) {
    this.canUndo = value;
  }

  private addUndoButtonIfPossible() {
    if (!this.canUndo) return;
    this.bga.statusBar.addActionButton(
      _("Undo last"),
      () => {
        this.bga.actions.performAction("actUndoLast", {});
      },
      { color: "secondary" }
    );
    this.bga.statusBar.addActionButton(
      _("Undo all"),
      () => {
        this.bga.actions.performAction("actUndo", {});
      },
      { color: "alert" }
    );
  }

  public showBonusButtons(pendingTiles: string[]) {
    this.pendingTiles = pendingTiles;

    if (this.isStuckWithNoLegalI1()) {
      this.showEndJourneyUi();
      return;
    }

    this.resetPlacementState();

    const playerId = this.bga.players.getCurrentPlayerId();
    const grid = document.getElementById(`gfe-play-grid-${playerId}`);
    const streetArtGrid = document.getElementById(`gfe-street-art-choose-${playerId}`);
    if (!grid) return;

    if (streetArtGrid) {
      streetArtGrid.classList.remove("gfe-street-art-choose-interactive");
      streetArtGrid.removeEventListener("click", this.onStreetArtClick);
    }

    this.cleanUpPreview(grid);
    this.showLegalHints(grid);

    // street art step removes the grid handler — put it back so bonus tiles can be positioned
    grid.removeEventListener("click", this.onGridClick);
    grid.removeEventListener("mousemove", this.onMouseMove);
    grid.addEventListener("click", this.onGridClick);
    grid.addEventListener("mousemove", this.onMouseMove);

    this.bga.statusBar.setTitle(_("${you} must place your bonus tile on the map"));
    this.updateActionButtons(false, grid);
  }

  public clearPendingTiles() {
    this.pendingTiles = [];
    this.awaitingEndTurn = false;
  }

  public showStreetArtChoose() {
    this.clearPendingTiles();
    this.resetPlacementState();

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

    if (!streetArtGrid) return;

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
  private isStuckWithNoLegalI1(): boolean {
    if (!this.placeTileArgs?.hasLegalI1MoveByPlayer) return false;
    const myId = this.bga.players.getCurrentPlayerId();
    const map = this.placeTileArgs.hasLegalI1MoveByPlayer;
    const value = map[String(myId)] ?? map[myId as unknown as string];
    return value === false;
  }

  private showEndJourneyUi() {
    this.bga.statusBar.removeActionButtons();
    this.bga.statusBar.setTitle(_("No legal placement left — your journey ends here"));
    this.bga.statusBar.addActionButton(_("End journey"), () => {
      this.bga.actions.performAction("actEndJourney", {});
    });
  }

  public showConfirmEndTurn() {
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
      grid.removeEventListener("mousemove", this.onMouseMove);
      this.clearLegalHints(grid);
    }

    if (streetArtGrid) {
      streetArtGrid.classList.remove("gfe-street-art-choose-interactive");
      streetArtGrid.removeEventListener("click", this.onStreetArtClick);
    }

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

  constructor(
    private game: Game,
    private bga: Bga<GreetingsFromEarthPlayer, GreetingsFromEarthGamedatas>
  ) {}

  onEnteringState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
    this.placeTileArgs = args;

    if (isCurrentPlayerActive && this.isStuckWithNoLegalI1()) {
      this.showEndJourneyUi();
      return;
    }

    // After refresh: only allow Undo if this turn already has changes
    if (!this.canUndo) {
      const ps = this.bga.gameui.gamedatas.playerState;
      const cells = JSON.parse(String(ps.cells_this_turn || "[]")) as unknown[];
      const pending = JSON.parse(String(ps.pending_bonus_tiles || "[]")) as unknown[];
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
    this.bga.statusBar.setTitle(
      isCurrentPlayerActive ? _("${you} must place your tile on the map") : _("Other players are placing their tile...")
    );

    if (isCurrentPlayerActive) {
      const playerId = this.bga.players.getCurrentPlayerId();
      const grid = document.getElementById(`gfe-play-grid-${playerId}`);

      if (!grid) return;

      this.showLegalHints(grid);

      grid.removeEventListener("click", this.onGridClick);
      grid.removeEventListener("mousemove", this.onMouseMove);
      grid.addEventListener("click", this.onGridClick);
      grid.addEventListener("mousemove", this.onMouseMove);
      this.updateActionButtons(false, grid);
    }
  }

  onLeavingState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
    this.awaitingEndTurn = false;
    this.canUndo = false;
    this.cleanupActivePlayer();
    this.placeTileArgs = null;
  }

  onPlayerActivationChange(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
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

  public resetAfterUndo() {
    this.clearPendingTiles();
    this.resetPlacementState();
    this.awaitingEndTurn = false;
    this.canUndo = false;
    this.canSurviveRemaining = null;
    if (!this.placeTileArgs) return;
    this.onEnteringState(this.placeTileArgs, true);
  }

  public setCanSurviveRemaining(value: boolean) {
    this.canSurviveRemaining = value;
  }

  public setHasLegalI1Move(value: boolean | number) {
    if (!this.placeTileArgs) return;
    const myId = this.bga.players.getCurrentPlayerId();
    this.placeTileArgs.hasLegalI1MoveByPlayer = {
      ...this.placeTileArgs.hasLegalI1MoveByPlayer,
      [String(myId)]: !!value
    };
  }

  public clearCanSurviveRemaining() {
    this.canSurviveRemaining = null;
  }
}
