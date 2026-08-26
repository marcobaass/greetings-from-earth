import { cellKey, getCellType, FORBIDDEN_CELL_TYPES, getSbahnCellSet } from "./map";
import { getShapeCells, isInsideGrid } from "./tiles";

const TOTAL_ROUNDS = 14;

/** Checks if the tile overlaps with the covered cells
 * @param tileCells - The cells of the tile to check for overlap
 * @param coveredCells - The cells that are already covered
 * @returns true if the tile overlaps with the covered cells, false otherwise
 */

export function overlapsCoveredCells(tileCells: [number, number][], coveredCells: { x: number; y: number; tile_type: string }[]): boolean {
  const list = (Array.isArray(coveredCells) ? coveredCells : Object.values(coveredCells ?? {})) as {
    x: number;
    y: number;
    tile_type: string;
  }[];
  const covered = new Set(list.map((cell) => cellKey(Number(cell.x), Number(cell.y))));
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

function buildReferenceSet(hasStarted: boolean, lastCells: [number, number][]): Set<string> {
  if (!hasStarted) return getSbahnCellSet();
  return new Set([...getSbahnCellSet(), ...lastCells.map(([x, y]) => cellKey(x, y))]);
}

function isHypotheticalI1Legal(x: number, y: number, covered: Set<string>, references: Set<string>): boolean {
  if (!isInsideGrid([[x, y]])) return false;
  if (FORBIDDEN_CELL_TYPES.has(getCellType(x, y))) return false;
  if (covered.has(cellKey(x, y))) return false;
  return orthogonalNeighbors(x, y).some(([nx, ny]) => references.has(cellKey(nx, ny)));
}

function collectLegalI1Moves(covered: Set<string>, hasStarted: boolean, lastCells: [number, number][]): [number, number][] {
  const references = buildReferenceSet(hasStarted, lastCells);
  const seen = new Set<string>();
  const moves: [number, number][] = [];

  for (const refKey of references) {
    const [rx, ry] = refKey.split(",").map(Number);
    for (const [nx, ny] of orthogonalNeighbors(rx, ry)) {
      const nKey = cellKey(nx, ny);
      if (seen.has(nKey)) continue;
      seen.add(nKey);
      if (isHypotheticalI1Legal(nx, ny, covered, references)) {
        moves.push([nx, ny]);
      }
    }
  }

  return moves;
}

function i1SurvivalMemoKey(depth: number, covered: Set<string>, hasStarted: boolean, lastCells: [number, number][]): string {
  const coverKeys = [...covered].sort();
  const lastKeys = lastCells.map(([x, y]) => cellKey(x, y)).sort();
  return `${depth}|${hasStarted ? 1 : 0}|${lastKeys.join(";")}|${coverKeys.join(";")}`;
}

function canSurviveRemainingRoundsWithI1(
  depth: number,
  covered: Set<string>,
  hasStarted: boolean,
  lastCells: [number, number][],
  memo: Map<string, boolean>
): boolean {
  if (depth <= 0) return true;

  const key = i1SurvivalMemoKey(depth, covered, hasStarted, lastCells);
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

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
export function canI1BePlaced(gamedatas: GreetingsFromEarthGamedatas): boolean {
  const depth = TOTAL_ROUNDS - Number(gamedatas.currentRound);
  if (!Number.isFinite(depth) || depth <= 0) return true;

  const coveredList = (
    Array.isArray(gamedatas.coveredCells) ? gamedatas.coveredCells : Object.values(gamedatas.coveredCells ?? {})
  ) as { x: number; y: number; tile_type: string }[];
  const covered = new Set(coveredList.map((cell) => cellKey(Number(cell.x), Number(cell.y))));
  const hasStarted = Number(gamedatas.playerState.has_started) !== 0;
  const lastCells = hasStarted ? getLastPlacedTileCells(gamedatas.playerState) : [];

  return canSurviveRemainingRoundsWithI1(depth, covered, hasStarted, lastCells, new Map());
}
