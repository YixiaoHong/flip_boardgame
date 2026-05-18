import { GRID_SIZE } from './constants.js';

export class FlipRule {
  constructor(board) {
    this.board = board;
  }

  getFlipsAfterMove(player, pos) {
    const groups = this.getFlipGroupsAfterMove(player, pos);
    return groups.flatMap(group => group.flips.map(([pos]) => pos));
  }

  getFlipGroupsAfterMove(player, pos) {
    const groups = [];
    const opponent = 3 - player;
    const [nx, ny] = pos;
    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];

    for (const [dx, dy] of directions) {
      const ax1 = nx + dx;
      const ay1 = ny + dy;
      const ax2 = nx + dx * 2;
      const ay2 = ny + dy * 2;
      if (this.isInside(ax1, ay1) && this.isInside(ax2, ay2)) {
        if (this.board.getPiece([ax1, ay1]) === opponent && this.board.getPiece([ax2, ay2]) === player) {
          groups.push({ type: 'a', dir: [dx, dy], flips: [[[ax1, ay1], '规则A']] });
        }
      }

      const bx1 = nx - dx;
      const by1 = ny - dy;
      const bx2 = nx + dx;
      const by2 = ny + dy;
      if (this.isInside(bx1, by1) && this.isInside(bx2, by2)) {
        if (this.board.getPiece([bx1, by1]) === opponent && this.board.getPiece([bx2, by2]) === opponent) {
          groups.push({ type: 'b', dir: [dx, dy], flips: [[[bx1, by1], '规则B左'], [[bx2, by2], '规则B右']] });
        }
      }
    }
    return groups;
  }

  getTriggers(player) {
    const triggers = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.board.getPiece([x, y]) === player) {
          if (this.getFlipsForTrigger(player, [x, y]).length > 0) {
            triggers.push([x, y]);
          }
        }
      }
    }
    return triggers;
  }

  getFlipsForTrigger(player, pos) {
    return this.getFlipGroupsForTrigger(player, pos).flatMap(group => group.flips.map(([pos]) => pos));
  }

  getFlipGroupsForTrigger(player, pos) {
    const groups = [];
    const opponent = 3 - player;
    const [px, py] = pos;
    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];

    for (const [dx, dy] of directions) {
      const ax1 = px + dx;
      const ay1 = py + dy;
      const ax2 = px + dx * 2;
      const ay2 = py + dy * 2;
      if (this.isInside(ax1, ay1) && this.isInside(ax2, ay2)) {
        if (this.board.getPiece([ax1, ay1]) === opponent && this.board.getPiece([ax2, ay2]) === player) {
          groups.push({ type: 'a', dir: [dx, dy], flips: [[[ax1, ay1], '连锁A']] });
        }
      }

      const bx1 = px - dx;
      const by1 = py - dy;
      const bx2 = px + dx;
      const by2 = py + dy;
      if (this.isInside(bx1, by1) && this.isInside(bx2, by2)) {
        if (this.board.getPiece([bx1, by1]) === opponent && this.board.getPiece([bx2, by2]) === opponent) {
          groups.push({ type: 'b', dir: [dx, dy], flips: [[[bx1, by1], '连锁B左'], [[bx2, by2], '连锁B右']] });
        }
      }
    }
    return groups;
  }

  isInside(x, y) {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
  }
}
