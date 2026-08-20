// Tile shapes — array of [dx, dy] offsets from anchor cell
// All tiles can be rotated and mirrored by the player
export const TILE_SHAPES: Record<string, [number, number][]> = {
  I4: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0]
  ],
  U5: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [2, 1]
  ],
  L4: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2]
  ],
  T4: [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1]
  ],
  SZ4: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1]
  ],
  T5: [
    [0, 0],
    [0, 1],
    [-1, 2],
    [0, 2],
    [1, 2]
  ],
  I1: [[0, 0]],
  I2: [
    [0, 0],
    [1, 0]
  ],
  L3: [
    [0, 0],
    [0, 1],
    [1, 1]
  ],
  SQR6: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2]
  ]
};

// Order: rotate, then mirror — must match PHP
export function getShapeCells(
  tileType: string,
  anchorX: number,
  anchorY: number,
  rotation: number = 0,
  mirror: boolean = false
): [number, number][] {
  if (!tileType || !TILE_SHAPES[tileType]) return [];
  const shape = TILE_SHAPES[tileType];

  const effectiveRotation = mirror ? (360 - rotation) % 360 : rotation;

  const rotated = applyRotation(shape, effectiveRotation);
  const mirrored = mirror ? applyMirror(rotated) : rotated;

  return mirrored.map(([dx, dy]) => [anchorX + dx, anchorY + dy]);
}

function applyRotation(offsets: [number, number][], rotation: number = 0): [number, number][] {
  return offsets.map(([dx, dy]) => {
    let newX = dx;
    let newY = dy;

    switch (rotation) {
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

export function isInsideGrid(cells: [number, number][]): boolean {
  return cells.every(([x, y]) => x >= 0 && x <= 17 && y >= 0 && y <= 12);
}

export function computeTileShift(cells: [number, number][]): [number, number] {
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);

  let shiftX = 0;
  let shiftY = 0;
  if (minX < 0) shiftX = -minX;
  else if (maxX > 17) shiftX = 17 - maxX;
  if (minY < 0) shiftY = -minY;
  else if (maxY > 12) shiftY = 12 - maxY;

  return [shiftX, shiftY];
}

export function cellsToOutlinePath(cells: [number, number][]): string {
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  let d = "";

  for (const [x, y] of cells) {
    if (!set.has(`${x},${y - 1}`)) {
      d += squiggleEdge(x, y, x + 1, y);
    }
    if (!set.has(`${x + 1},${y}`)) {
      d += squiggleEdge(x + 1, y, x + 1, y + 1);
    }
    if (!set.has(`${x},${y + 1}`)) {
      d += squiggleEdge(x + 1, y + 1, x, y + 1);
    }
    if (!set.has(`${x - 1},${y}`)) {
      d += squiggleEdge(x, y + 1, x, y);
    }
  }
  return d.trim();
}

/** Deterministic offset ~[-amp, amp] for an edge */
function edgeNudge(ax: number, ay: number, bx: number, by: number, amp = 0.04): number {
  const n = Math.sin(ax * 12.9898 + ay * 78.233 + bx * 37.719 + by * 9.123) * 43758.5453;
  const r = n - Math.floor(n); // 0..1
  return (r - 0.5) * 2 * amp;
}
function squiggleEdge(ax: number, ay: number, bx: number, by: number): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  // perpendicular to (bx-ax, by-ay); for unit axis edges this has length 1
  const px = -(by - ay);
  const py = bx - ax;
  const t = edgeNudge(ax, ay, bx, by);
  return `M ${ax} ${ay} L ${mx + px * t} ${my + py * t} L ${bx} ${by} `;
}
