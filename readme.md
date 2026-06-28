tiles.ts      → shape math (getShapeCells, isInsideGrid)
map.ts        → Berlin terrain (getCellType, getSbahnCellSet, cellKey)
placement.ts  → rules (overlap, then adjacency, then isPlacementLegal)
PlaceTile.ts  → UI: preview + call isPlacementLegal + show ✔

Data flow:
showPreview()
  → cells = getShapeCells(...)
  → legal = isPlacementLegal(cells, this.bga.gamedatas)
  → updateActionButtons(legal)