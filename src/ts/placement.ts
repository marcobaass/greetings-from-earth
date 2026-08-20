import { cellKey, getCellType, FORBIDDEN_CELL_TYPES, getSbahnCellSet } from "./map";
import { getShapeCells, isInsideGrid } from "./tiles";

/** Checks if the tile overlaps with the covered cells
 * @param tileCells - The cells of the tile to check for overlap
 * @param coveredCells - The cells that are already covered
 * @returns true if the tile overlaps with the covered cells, false otherwise
 */

export function overlapsCoveredCells(tileCells: [number, number][], coveredCells: { x: number; y: number; tile_type: string }[]): boolean {
  const covered = new Set(coveredCells.map((cell) => cellKey(cell.x, cell.y)));
  return tileCells.some(([x, y]) => covered.has(cellKey(x, y)));
}

function orthogonalNeighbors(x: number, y: number): [number, number][] {
  return [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1]
  ];
}

function touchesAny(tileCells: [number, number][], referenceSet: Set<string>): boolean {
  return tileCells.some(([x, y]) => orthogonalNeighbors(x, y).some(([nx, ny]) => referenceSet.has(cellKey(nx, ny))));
}

function getLastPlacedTileCells(playerState: GreetingsFromEarthGamedatas["playerState"]): [number, number][] {
  if (playerState.has_started == 0) return [];
  if (playerState.last_x == null || playerState.last_y == null || playerState.last_tile_type == null) return [];
  return getShapeCells(
    playerState.last_tile_type,
    Number(playerState.last_x),
    Number(playerState.last_y),
    Number(playerState.last_rotation),
    Number(playerState.last_mirror) === 1
  );
}

//   if overlapsCoveredCells(tileCells, gamedatas.coveredCells): return false
//   sbahnRefs = getSbahnCellSet()
//   if NOT gamedatas.playerState.has_started:
//     referenceSet = sbahnRefs
//   else:
//     lastCells = getLastPlacedTileCells(gamedatas.playerState)
//     referenceSet = new Set([...sbahnRefs, ...lastCells.map(([x,y]) => cellKey(x,y))])
//   return touchesAny(tileCells, referenceSet)

export function isPlacementLegal(tileCells: [number, number][], gamedatas: GreetingsFromEarthGamedatas): boolean {
  if (!isInsideGrid(tileCells)) return false;

  let referenceSet: Set<string>;

  //check for S-Bahn cells, monuments and rivers
  if (tileCells.some(([x, y]) => FORBIDDEN_CELL_TYPES.has(getCellType(x, y)))) return false;

  //check for already covered cells
  if (overlapsCoveredCells(tileCells, gamedatas.coveredCells)) return false;

  //check for reference set
  if (gamedatas.playerState.has_started == 0) {
    referenceSet = getSbahnCellSet();
  } else {
    const lastCells = getLastPlacedTileCells(gamedatas.playerState);
    referenceSet = new Set([...getSbahnCellSet(), ...lastCells.map(([x, y]) => cellKey(x, y))]);
  }
  return touchesAny(tileCells, referenceSet);
}
