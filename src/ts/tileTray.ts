import { tileTraySvg, BonusSource } from "./tiles";

/** Button colour: dice tiles blue, bonus tiles in their colour from the sheet, always-available I1/I2 white */
export type TileKind = "dice" | "always" | BonusSource;

export interface TileChoice {
  tile: string;
  kind: TileKind;
  /** Hover info, already translated */
  tooltip: string;
}

type TooltipApi = Pick<GameGui, "addTooltipHtml" | "removeTooltip">;

/**
 * Own tooltip markup: BGA's default help tooltip (addTooltip) top-aligns a one-word text next to its "?" icon.
 * Here the "?" badge and the text are centred to each other (see .gfe-tray-tooltip in CSS).
 */
function tooltipHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div class="gfe-tray-tooltip"><span class="gfe-tray-tooltip-icon">?</span><span>${escaped}</span></div>`;
}

/**
 * Tile choices shown directly above the current player's board (instead of in the action bar).
 * It only ever holds tiles the player can pick right now — otherwise it is empty.
 * Only the current player's board has a tray, so every method is a no-op for spectators.
 */
export class TileTray {
  constructor(private gameui: TooltipApi) {}

  private get element(): HTMLElement | null {
    return document.getElementById("gfe-tile-tray");
  }

  /** Replace the tray content with clickable tiles. Each group (dice/bonus, always available) is spaced apart. */
  render(groups: TileChoice[][], onPick: (tileType: string) => void) {
    const tray = this.element;
    if (!tray) return;

    this.clear();

    const tooltips: [string, string][] = [];

    groups.forEach((choices, groupIndex) => {
      if (choices.length === 0) return;

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
  select(button: HTMLButtonElement | null) {
    const tray = this.element;
    if (!tray) return;

    tray.querySelectorAll<HTMLButtonElement>(".gfe-tray-tile").forEach((other) => {
      const selected = other === button;
      other.classList.toggle("gfe-tray-tile-selected", selected);
      other.setAttribute("aria-pressed", String(selected));
    });
  }

  /** Nothing to pick right now. The tray keeps its height (see CSS), so the board doesn't jump. */
  clear() {
    const tray = this.element;
    if (!tray) return;

    tray.querySelectorAll<HTMLElement>(".gfe-tray-tile").forEach((button) => this.gameui.removeTooltip(button.id));
    tray.replaceChildren();
  }
}
