import { cellKey, getCellType, FORBIDDEN_CELL_TYPES, getSbahnCellSet } from './map'
import { getShapeCells, isInsideGrid } from './tiles'

/** Checks if the tile overlaps with the covered cells
 * @param tileCells - The cells of the tile to check for overlap
 * @param coveredCells - The cells that are already covered
 * @returns true if the tile overlaps with the covered cells, false otherwise
 */

export function overlapsCoveredCells(tileCells: [number, number][], coveredCells: { x: number; y: number; tile_type: string }[]): boolean {
    const covered = new Set(coveredCells.map(cell => cellKey(cell.x, cell.y)))
    return tileCells.some(([x, y]) => (covered.has(cellKey(x, y)))) 
}