import { GRID_SIZE } from './constants.js';

export class Board {
  constructor(grid = null) {
    if (Array.isArray(grid) && grid.length === GRID_SIZE) {
      this.grid = grid.map(row => [...row]);
    } else {
      this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
      this.initPieces();
    }
  }

  initPieces() {
    for (let x = 0; x < GRID_SIZE; x++) {
      this.grid[0][x] = 2;
      this.grid[1][x] = 2;
      this.grid[5][x] = 1;
      this.grid[6][x] = 1;
    }
  }

  getPiece([x, y]) {
    return this.grid[y][x];
  }

  setPiece([x, y], player) {
    this.grid[y][x] = player;
  }

  movePiece(from, to) {
    const player = this.getPiece(from);
    this.setPiece(to, player);
    this.setPiece(from, 0);
  }

  copy() {
    return new Board(this.grid);
  }

  countPieces(player) {
    let count = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x] === player) count += 1;
      }
    }
    return count;
  }

  hasAnyMove(player) {
    const fromPositions = this.getValidMoves(player);
    for (const from of fromPositions) {
      const toPositions = this.getValidMoves(player, from);
      if (toPositions.length > 0) return true;
    }
    return false;
  }

  hasConnection(from, to) {
    const [fx, fy] = from;
    const [tx, ty] = to;
    const dx = tx - fx;
    const dy = ty - fy;
    if (dx === 0 || dy === 0) return true;
    if (Math.abs(dx) === 1 && Math.abs(dy) === 1) return true;
    return false;
  }

  getValidMoves(player, from = null) {
    if (from === null) {
      const positions = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (this.grid[y][x] === player) positions.push([x, y]);
        }
      }
      return positions;
    }

    const [fx, fy] = from;
    const valid = [];
    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];

    for (const [dx, dy] of directions) {
      const tx = fx + dx;
      const ty = fy + dy;
      if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
        if (this.grid[ty][tx] === 0 && this.hasConnection(from, [tx, ty])) {
          valid.push([tx, ty]);
        }
      }

      let firstPiece = null;
      let step = 1;
      while (true) {
        const cx = fx + step * dx;
        const cy = fy + step * dy;
        if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) break;
        const piece = this.grid[cy][cx];
        if (piece === 0) {
          if (firstPiece !== null) {
            let validJump = true;
            let prevPos = from;
            for (let s = 1; s <= step; s++) {
              const checkPos = [fx + s * dx, fy + s * dy];
              if (!this.hasConnection(prevPos, checkPos)) {
                validJump = false;
                break;
              }
              prevPos = checkPos;
            }
            if (validJump) {
              valid.push([cx, cy]);
            }
          }
          break;
        }
        if (firstPiece === null) {
          firstPiece = piece;
        } else if (piece !== firstPiece) {
          break;
        }
        step += 1;
      }
    }
    return valid;
  }
}
