import { Game } from "../Game";
import { isPlacementLegal } from "../placement";
import { computeTileShift, getShapeCells, isInsideGrid, cellsToOutlinePath, tileButtonHtml } from "../tiles";

export class PlaceTile {
  private tileSelected: string | null = null;
  private placeTileArgs: PlaceTileArgs | null = null;
  private anchorX: number | null = null;
  private anchorY: number | null = null;
  private pendingTiles: string[] = [];
  /** Client flag: placement done, waiting for End turn / Undo */
  private awaitingEndTurn = false;
  /** True only after a change this turn that can be reverted */
  private canUndo = false;
  private followingMouse = false;

  private onGridClick = (event: MouseEvent) => {
    this.followingMouse = false;
    const cell = event.target as HTMLElement;
    if (!this.tileSelected) return;
    if (!(cell instanceof HTMLElement) || !cell.classList.contains("gfe-cell")) return;
    const playerId = this.bga.players.getCurrentPlayerId();
    const grid = document.getElementById(`gfe-play-grid-${playerId}`);
    if (!grid) return;
    this.anchorX = Number(cell.dataset.x);
    this.anchorY = Number(cell.dataset.y);

    if (isNaN(this.anchorX) || isNaN(this.anchorY)) return;

    this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.followingMouse) return;
    if (!this.tileSelected) return;

    const cell = event.target as HTMLElement;
    if (!(cell instanceof HTMLElement) || !cell.classList.contains("gfe-cell")) return;

    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);
    if (isNaN(x) || isNaN(y)) return;

    if (x === this.anchorX && y === this.anchorY) return;

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
    this.anchorX = null;
    this.anchorY = null;
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
   * @param anchorX The x coordinate of the anchor point
   * @param anchorY The y coordinate of the anchor point
   */
  private showPreview(grid: HTMLElement, tileType: string, anchorX: number, anchorY: number) {
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

    if (!this.placeTileArgs) return;

    this.addButtonsForTile(cells, legal, grid);
    this.updateActionButtons(legal, grid);
  }

  private addButtonsForTile(cells: [number, number][], legal: boolean, grid: HTMLElement) {
    if (this.followingMouse) return;

    // calculating center origin of the tile
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const centerX = (minX + maxX + 1) / 2;
    const centerY = (minY + maxY + 1) / 2;

    // offset from center for each button
    const leftPct = (centerX / 18) * 100;
    const topPct = (centerY / 13) * 100;
    const gapH = 13 * 1.25;
    const gapV = 18 * 1.25;

    const mirrorButton = document.createElement("button");
    mirrorButton.className = "gfe-tile-button";
    mirrorButton.textContent = "↔";
    mirrorButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.tileSelected || this.anchorX == null || this.anchorY == null) return;
      this.mirror = !this.mirror;
      this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
    });
    mirrorButton.style.left = `${leftPct}%`;
    mirrorButton.style.top = `${topPct - gapV}%`;
    grid.appendChild(mirrorButton);

    const rotateLeftButton = document.createElement("button");
    rotateLeftButton.className = "gfe-tile-button";
    rotateLeftButton.textContent = "↻";
    rotateLeftButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.tileSelected || this.anchorX == null || this.anchorY == null) return;
      this.rotation = (this.rotation + 90) % 360;
      this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
    });
    rotateLeftButton.style.left = `${leftPct - gapH}%`;
    rotateLeftButton.style.top = `${topPct}%`;
    grid.appendChild(rotateLeftButton);

    const rotateRightButton = document.createElement("button");
    rotateRightButton.className = "gfe-tile-button";
    rotateRightButton.textContent = "↺";
    rotateRightButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.tileSelected || this.anchorX == null || this.anchorY == null) return;
      this.rotation = (this.rotation + 270) % 360;
      this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
    });
    rotateRightButton.style.left = `${leftPct + gapH}%`;
    rotateRightButton.style.top = `${topPct}%`;
    grid.appendChild(rotateRightButton);

    const confirmButton = document.createElement("button");
    confirmButton.className = "gfe-tile-button";
    confirmButton.textContent = "✔";
    confirmButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.tileSelected || this.anchorX == null || this.anchorY == null) return;
      if (!legal) return;
      const cells = getShapeCells(this.tileSelected, this.anchorX, this.anchorY, this.rotation, this.mirror);
      if (!isPlacementLegal(cells, this.bga.gameui.gamedatas)) return;

      const action = this.pendingTiles.length > 0 ? "actPlaceBonusTile" : "actPlaceTile";

      this.bga.actions.performAction(action, {
        tileType: this.tileSelected,
        x: this.anchorX,
        y: this.anchorY,
        rotation: this.rotation,
        mirror: this.mirror
      });
    });
    confirmButton.style.left = `${leftPct}%`;
    confirmButton.style.top = `${topPct + gapV}%`;
    if (legal) {
      confirmButton.style.backgroundColor = "#1362a5";
    } else {
      confirmButton.disabled = !legal;
    }
    grid.appendChild(confirmButton);
  }

  private selectTile(tile: string, grid: HTMLElement): void {
    this.followingMouse = true;
    this.tileSelected = tile;
    this.anchorX = 0;
    this.anchorY = 0;
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

    this.bga.statusBar.addActionButton("↻", () => {
      if (!this.tileSelected || this.anchorX == null || this.anchorY == null) return;

      this.rotation = (this.rotation + 90) % 360;
      this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
    });

    this.bga.statusBar.addActionButton("↺", () => {
      if (!this.tileSelected || this.anchorX == null || this.anchorY == null) return;

      this.rotation = (this.rotation + 270) % 360;
      this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
    });

    this.bga.statusBar.addActionButton("↔", () => {
      if (!this.tileSelected || this.anchorX == null || this.anchorY == null) return;
      this.mirror = !this.mirror;
      this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
    });

    if (legal && this.tileSelected) {
      this.bga.statusBar.addActionButton(_("Confirm placement"), () => {
        if (!this.tileSelected || this.anchorX == null || this.anchorY == null) return;
        const cells = getShapeCells(this.tileSelected, this.anchorX, this.anchorY, this.rotation, this.mirror);
        if (!isPlacementLegal(cells, this.bga.gameui.gamedatas)) return;

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

  public setCanUndo(value: boolean) {
    this.canUndo = value;
  }

  private addUndoButtonIfPossible() {
    if (!this.canUndo) return;
    this.bga.statusBar.addActionButton(
      _("Undo"),
      () => {
        this.bga.actions.performAction("actUndo", {});
      },
      { color: "alert" }
    );
  }

  public showBonusButtons(pendingTiles: string[]) {
    this.pendingTiles = pendingTiles;
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

  constructor(
    private game: Game,
    private bga: Bga<GreetingsFromEarthPlayer, GreetingsFromEarthGamedatas>
  ) {}

  onEnteringState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
    this.placeTileArgs = args;

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
    if (!this.placeTileArgs) return;
    this.onEnteringState(this.placeTileArgs, true);
  }
}
