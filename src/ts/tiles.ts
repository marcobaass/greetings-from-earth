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

// Order: rotate, then mirror — must match PHP
export function getShapeCells(tileType: string, anchorX: number, anchorY: number, rotation: number = 0, mirror: boolean = false): [number, number][] {
    if(!tileType || !TILE_SHAPES[tileType]) return [];
    const shape = TILE_SHAPES[tileType];
    let rotated = applyRotation(shape, rotation);
    if(mirror) {
        rotated = applyMirror(rotated);
    }
    return rotated.map(([dx, dy]) => [anchorX + dx, anchorY + dy]);
}

function applyRotation(offsets: [number, number][], rotation: number = 0): [number, number][] {
    return offsets.map(([dx, dy]) => {
        let newX = dx;
        let newY = dy;

        switch(rotation) {
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

function applyMirror(offsets: [number, number][]): [number, number][] {
    return offsets.map(([dx, dy]) => [-dx, dy]);
}