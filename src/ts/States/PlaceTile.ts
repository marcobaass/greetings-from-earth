import { Game } from "../Game";
import { isPlacementLegal } from "../placement";
import { computeTileShift, getShapeCells, isInsideGrid, cellsToOutlinePath } from "../tiles";

export class PlaceTile {
  private tileSelected: string | null = null;
  private placeTileArgs: PlaceTileArgs | null = null;
  private anchorX: number | null = null;
  private anchorY: number | null = null;
  private pendingTiles: string[] = [];

  private onGridClick = (event: MouseEvent) => {
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
  }

  private resetPlacementState() {
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

    this.updateActionButtons(legal, grid);
  }

  private updateActionButtons(legal: boolean, grid: HTMLElement) {
    this.bga.statusBar.removeActionButtons();

    if (!this.placeTileArgs) return;

    const allTiles =
      this.pendingTiles.length > 0 ? this.pendingTiles : [...this.placeTileArgs.tileOptions, ...this.placeTileArgs.alwaysAvailableTiles];

    allTiles.forEach((tile) => {
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
      this.bga.statusBar.addActionButton("✔", () => {
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
  }

  public showBonusButtons(pendingTiles: string[]) {
    this.pendingTiles = pendingTiles;
    this.resetPlacementState();

    const playerId = this.bga.players.getCurrentPlayerId();
    const grid = document.getElementById(`gfe-play-grid-${playerId}`);
    if (!grid) return;

    this.cleanUpPreview(grid);

    this.bga.statusBar.setTitle(_("${you} must place your bonus tile on the map"));
    this.updateActionButtons(false, grid);
  }

  public clearPendingTiles() {
    this.pendingTiles = [];
  }

  public showStreetArtChoose() {
    this.clearPendingTiles();
    this.resetPlacementState();

    const playerId = this.bga.players.getCurrentPlayerId();
    const streetArtGrid = document.getElementById(`gfe-street-art-choose-${playerId}`);

    if (!streetArtGrid) return;

    this.bga.statusBar.setTitle(_("${you} must mark a street art bonus"));
    this.bga.statusBar.removeActionButtons();

    streetArtGrid.removeEventListener("click", this.onStreetArtClick);
    streetArtGrid.classList.add("gfe-street-art-choose-interactive");
    streetArtGrid.addEventListener("click", this.onStreetArtClick);
  }

  constructor(
    private game: Game,
    private bga: Bga<GreetingsFromEarthPlayer, GreetingsFromEarthGamedatas>
  ) {}

  onEnteringState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
    this.placeTileArgs = args;
    this.pendingTiles = [];

    //loop over player ids
    document.querySelectorAll(".gfe-dice-indicator").forEach((el) => {
      el.className = "gfe-dice-indicator";
      el.classList.add(`gfe-dice-${args.diceRoll}`);
    });

    this.bga.statusBar.setTitle(
      isCurrentPlayerActive ? _("${you} must place your tile on the map") : _("Other players are placing their tile...")
    );

    if (isCurrentPlayerActive) {
      const playerId = this.bga.players.getCurrentPlayerId();
      const grid = document.getElementById(`gfe-play-grid-${playerId}`);

      if (!grid) return;

      grid.removeEventListener("click", this.onGridClick);
      grid.classList.add("gfe-play-grid-interactive");
      grid.addEventListener("click", this.onGridClick);
      this.updateActionButtons(false, grid);
    }
  }

  onLeavingState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
    this.cleanupActivePlayer();
    this.placeTileArgs = null;
  }

  onPlayerActivationChange(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
    this.placeTileArgs = args;

    if (!isCurrentPlayerActive) {
      this.bga.statusBar.removeActionButtons();
      this.cleanupActivePlayer();
      this.bga.statusBar.setTitle(_("Other players are placing their tile..."));
      return;
    }

    this.onEnteringState(args, true);
  }
}
