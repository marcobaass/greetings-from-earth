// Tile shapes — array of [dx, dy] offsets from anchor cell
// All tiles can be rotated and mirrored by the player
export const TILE_SHAPES: Record<string, [number, number][]> = {
    I4: [[0,0],[1,0],[2,0],[3,0]],
    U5: [[0,0],[1,0],[2,0],[0,1],[2,1]],
    L4: [[0,0],[0,1],[0,2],[1,2]],
    T4: [[0,0],[1,0],[2,0],[1,1]],
    SZ4: [[0,0],[1,0],[1,1],[2,1]],
    L5: [[0,0],[0,1],[0,2],[0,3],[1,3]],
};

export function getShapeCells(tileType: string, anchorX: number, anchorY: number, rotation: number = 0, mirror: boolean = false): [number, number][] {
    if(!tileType) return
    const shape = TILE_SHAPES[tileType];
    if(!tileType || !shape) return [];
    return shape.map(([dx, dy]) => [anchorX + dx, anchorY + dy]);
}