import { FlipRule } from './flipRule.js';
import { ChainFlipHandler } from './chainFlipHandler.js';

export class VerySimpleAI {
  constructor(playerNum) {
    this.playerNum = playerNum;
    this.opponent = 3 - playerNum;
  }

  chooseMove(board) {
    const allMoves = [];
    const fromPositions = board.getValidMoves(this.playerNum);
    for (const from of fromPositions) {
      const toPositions = board.getValidMoves(this.playerNum, from);
      for (const to of toPositions) {
        allMoves.push([from, to]);
      }
    }
    if (allMoves.length === 0) return null;

    const movesWithFlip = [];
    for (const [from, to] of allMoves) {
      const simBoard = board.copy();
      simBoard.movePiece(from, to);
      const flipRule = new FlipRule(simBoard);
      if (flipRule.getFlipGroupsAfterMove(this.playerNum, to).length > 0) {
        movesWithFlip.push([from, to]);
      }
    }

    if (movesWithFlip.length > 0) {
      return movesWithFlip[Math.floor(Math.random() * movesWithFlip.length)];
    }

    let bestScore = -Infinity;
    let bestMoves = [];
    for (const [from, to] of allMoves) {
      const score = this.evaluatePosition(to);
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [[from, to]];
      } else if (score === bestScore) {
        bestMoves.push([from, to]);
      }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  evaluatePosition(pos) {
    const centerX = 3;
    const centerY = 3;
    const distance = Math.sqrt((pos[0] - centerX) ** 2 + (pos[1] - centerY) ** 2);
    const maxDistance = Math.sqrt((3) ** 2 + (3) ** 2);
    return (maxDistance - distance) / maxDistance;
  }

  chooseFlipGroup(groups) {
    let goodIndices = [];
    let maxFlips = 0;
    for (let i = 0; i < groups.length; i++) {
      const flips = groups[i].flips.length;
      if (flips > maxFlips) {
        maxFlips = flips;
        goodIndices = [i];
      } else if (flips === maxFlips) {
        goodIndices.push(i);
      }
    }
    return goodIndices[Math.floor(Math.random() * goodIndices.length)];
  }

  chooseChainTrigger(chainHandler) {
    const triggers = chainHandler.getTriggers();
    if (triggers.length === 0) return [null, null];
    const trigger = triggers[Math.floor(Math.random() * triggers.length)];
    chainHandler.selectTrigger(trigger);
    const groups = chainHandler.getAvailableGroups();
    if (groups.length > 0) {
      const groupIdx = Math.floor(Math.random() * groups.length);
      return [trigger, groupIdx];
    }
    return [null, null];
  }
}

export class GreedyAI {
  constructor(playerNum) {
    this.playerNum = playerNum;
    this.opponent = 3 - playerNum;
  }

  chooseMove(board) {
    let bestScore = -Infinity;
    let bestMoves = [];
    const fromPositions = board.getValidMoves(this.playerNum);

    for (const from of fromPositions) {
      const toPositions = board.getValidMoves(this.playerNum, from);
      for (const to of toPositions) {
        const score = this.evaluateMove(board, from, to);
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [[from, to]];
        } else if (score === bestScore) {
          bestMoves.push([from, to]);
        }
      }
    }
    return bestMoves.length > 0 ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : null;
  }

  evaluateMove(board, from, to) {
    const simBoard = board.copy();
    simBoard.movePiece(from, to);
    let score = 0;
    const flipRule = new FlipRule(simBoard);
    const flipGroups = flipRule.getFlipGroupsAfterMove(this.playerNum, to);
    let maxFlips = 0;
    for (const group of flipGroups) {
      if (group.flips.length > maxFlips) {
        maxFlips = group.flips.length;
      }
    }
    score += maxFlips * 100;
    score += this.evaluatePosition(to) * 10;
    score += Math.random() * 5;
    return score;
  }

  evaluatePosition(pos) {
    const centerX = 3;
    const centerY = 3;
    const distance = Math.sqrt((pos[0] - centerX) ** 2 + (pos[1] - centerY) ** 2);
    const maxDistance = Math.sqrt((3) ** 2 + (3) ** 2);
    return (maxDistance - distance) / maxDistance;
  }

  chooseFlipGroup(groups) {
    let bestScore = -1;
    let bestIndices = [];
    for (let i = 0; i < groups.length; i++) {
      let score = groups[i].flips.length * 10;
      if (groups[i].type === 'b') score += 5;
      if (score > bestScore) {
        bestScore = score;
        bestIndices = [i];
      } else if (score === bestScore) {
        bestIndices.push(i);
      }
    }
    return bestIndices[Math.floor(Math.random() * bestIndices.length)];
  }

  chooseChainTrigger(chainHandler) {
    const triggers = chainHandler.getTriggers();
    if (triggers.length === 0) return [null, null];
    let bestScore = -1;
    let bestOptions = [];
    for (const trigger of triggers) {
      chainHandler.selectTrigger(trigger);
      const groups = chainHandler.getAvailableGroups();
      if (groups.length === 0) continue;
      const groupIdx = this.chooseFlipGroup(groups);
      let score = groups[groupIdx].flips.length * 10;
      if (groups[groupIdx].type === 'b') score += 5;
      if (score > bestScore) {
        bestScore = score;
        bestOptions = [[trigger, groupIdx]];
      } else if (score === bestScore) {
        bestOptions.push([trigger, groupIdx]);
      }
    }
    return bestOptions.length > 0 ? bestOptions[Math.floor(Math.random() * bestOptions.length)] : [null, null];
  }
}

export class SimpleAI {
  constructor(playerNum, depth = 3) {
    this.playerNum = playerNum;
    this.opponent = 3 - playerNum;
    this.depth = depth;
  }

  chooseMove(board) {
    let bestScore = -Infinity;
    let bestMoves = [];
    const fromPositions = board.getValidMoves(this.playerNum);

    for (const from of fromPositions) {
      const toPositions = board.getValidMoves(this.playerNum, from);
      for (const to of toPositions) {
        const score = this.simulateMoveAndEvaluate(board, from, to);
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [[from, to]];
        } else if (score === bestScore) {
          bestMoves.push([from, to]);
        }
      }
    }
    return bestMoves.length > 0 ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : null;
  }

  simulateMoveAndEvaluate(board, from, to) {
    const simBoard = board.copy();
    simBoard.movePiece(from, to);
    const flipRule = new FlipRule(simBoard);
    const flipGroups = flipRule.getFlipGroupsAfterMove(this.playerNum, to);
    if (flipGroups.length > 0) {
      let bestGroup = flipGroups[0];
      let maxFlips = 0;
      for (const group of flipGroups) {
        if (group.flips.length > maxFlips || (group.flips.length === maxFlips && group.type === 'b')) {
          maxFlips = group.flips.length;
          bestGroup = group;
        }
      }
      for (const [pos] of bestGroup.flips) {
        simBoard.setPiece(pos, this.playerNum);
      }
      this.applyBestChainFlips(simBoard, this.playerNum);
    }
    return this.minimax(simBoard, this.depth - 1, -Infinity, Infinity, false);
  }

  applyBestChainFlips(board, player) {
    const flipRule = new FlipRule(board);
    const chainHandler = new ChainFlipHandler(board, flipRule);
    while (chainHandler.startChainFlip(player)) {
      const triggers = chainHandler.getTriggers();
      if (triggers.length === 0) break;
      let bestTrigger = null;
      let bestGroupIdx = 0;
      let bestScore = -1;
      for (const trigger of triggers) {
        chainHandler.selectTrigger(trigger);
        const groups = chainHandler.getAvailableGroups();
        if (groups.length === 0) continue;
        const groupIdx = this.chooseFlipGroup(groups);
        let score = groups[groupIdx].flips.length * 10;
        if (groups[groupIdx].type === 'b') score += 5;
        if (score > bestScore) {
          bestScore = score;
          bestTrigger = trigger;
          bestGroupIdx = groupIdx;
        }
      }
      if (bestTrigger === null) break;
      chainHandler.selectTrigger(bestTrigger);
      const group = chainHandler.getAvailableGroups()[bestGroupIdx];
      if (!group) break;
      for (const [pos] of group.flips) {
        board.setPiece(pos, player);
      }
    }
  }

  minimax(board, depth, alpha, beta, isMaximizing) {
    const p1Count = board.countPieces(1);
    const p2Count = board.countPieces(2);
    if (p1Count === 0 || p2Count === 0) {
      if (this.playerNum === 1) return p2Count === 0 ? 10000 : -10000;
      return p1Count === 0 ? 10000 : -10000;
    }
    const currentPlayer = isMaximizing ? this.playerNum : this.opponent;
    if (!board.hasAnyMove(currentPlayer)) {
      if (this.playerNum === 1) return p1Count > p2Count ? 10000 : -10000;
      return p2Count > p1Count ? 10000 : -10000;
    }
    if (depth === 0) return this.evaluateBoard(board);
    if (isMaximizing) {
      let maxEval = -Infinity;
      const fromPositions = board.getValidMoves(this.playerNum);
      for (const from of fromPositions) {
        const toPositions = board.getValidMoves(this.playerNum, from);
        for (const to of toPositions) {
          const newBoard = board.copy();
          newBoard.movePiece(from, to);
          const flipRule = new FlipRule(newBoard);
          const flipGroups = flipRule.getFlipGroupsAfterMove(this.playerNum, to);
          if (flipGroups.length > 0) {
            let bestGroup = flipGroups[0];
            let maxFlips = 0;
            for (const group of flipGroups) {
              if (group.flips.length > maxFlips || (group.flips.length === maxFlips && group.type === 'b')) {
                maxFlips = group.flips.length;
                bestGroup = group;
              }
            }
            for (const [pos] of bestGroup.flips) {
              newBoard.setPiece(pos, this.playerNum);
            }
            this.applyBestChainFlips(newBoard, this.playerNum);
          }
          const evalScore = this.minimax(newBoard, depth - 1, alpha, beta, false);
          maxEval = Math.max(maxEval, evalScore);
          alpha = Math.max(alpha, evalScore);
          if (beta <= alpha) break;
        }
        if (beta <= alpha) break;
      }
      return maxEval;
    }
    let minEval = Infinity;
    const fromPositions = board.getValidMoves(this.opponent);
    for (const from of fromPositions) {
      const toPositions = board.getValidMoves(this.opponent, from);
      for (const to of toPositions) {
        const newBoard = board.copy();
        newBoard.movePiece(from, to);
        const flipRule = new FlipRule(newBoard);
        const flipGroups = flipRule.getFlipGroupsAfterMove(this.opponent, to);
        if (flipGroups.length > 0) {
          let bestGroup = flipGroups[0];
          let maxFlips = 0;
          for (const group of flipGroups) {
            if (group.flips.length > maxFlips || (group.flips.length === maxFlips && group.type === 'b')) {
              maxFlips = group.flips.length;
              bestGroup = group;
            }
          }
          for (const [pos] of bestGroup.flips) {
            newBoard.setPiece(pos, this.opponent);
          }
          this.applyBestChainFlips(newBoard, this.opponent);
        }
        const evalScore = this.minimax(newBoard, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      if (beta <= alpha) break;
    }
    return minEval;
  }

  evaluateBoard(board) {
    let score = 0;
    const myCount = board.countPieces(this.playerNum);
    const oppCount = board.countPieces(this.opponent);
    score += (myCount - oppCount) * 100;
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const piece = board.getPiece([x, y]);
        if (piece === this.playerNum) score += this.evaluatePosition([x, y]) * 10;
        if (piece === this.opponent) score -= this.evaluatePosition([x, y]) * 10;
      }
    }
    const myMobility = this.countMoves(board, this.playerNum);
    const oppMobility = this.countMoves(board, this.opponent);
    score += (myMobility - oppMobility) * 20;
    const flipRule = new FlipRule(board);
    score += (flipRule.getTriggers(this.playerNum).length - flipRule.getTriggers(this.opponent).length) * 30;
    return score;
  }

  evaluatePosition(pos) {
    const centerX = 3;
    const centerY = 3;
    const distance = Math.sqrt((pos[0] - centerX) ** 2 + (pos[1] - centerY) ** 2);
    const maxDistance = Math.sqrt((3) ** 2 + (3) ** 2);
    return (maxDistance - distance) / maxDistance;
  }

  countMoves(board, player) {
    let count = 0;
    const fromPositions = board.getValidMoves(player);
    for (const from of fromPositions) {
      count += board.getValidMoves(player, from).length;
    }
    return count;
  }

  chooseFlipGroup(groups) {
    let bestScore = -1;
    let bestIndices = [];
    for (let i = 0; i < groups.length; i++) {
      let score = groups[i].flips.length * 10;
      if (groups[i].type === 'b') score += 5;
      if (score > bestScore) {
        bestScore = score;
        bestIndices = [i];
      } else if (score === bestScore) {
        bestIndices.push(i);
      }
    }
    return bestIndices[Math.floor(Math.random() * bestIndices.length)];
  }

  chooseChainTrigger(chainHandler) {
    const triggers = chainHandler.getTriggers();
    if (triggers.length === 0) return [null, null];
    let bestScore = -1;
    let bestOptions = [];
    for (const trigger of triggers) {
      chainHandler.selectTrigger(trigger);
      const groups = chainHandler.getAvailableGroups();
      if (groups.length === 0) continue;
      const groupIdx = this.chooseFlipGroup(groups);
      let score = groups[groupIdx].flips.length * 10;
      if (groups[groupIdx].type === 'b') score += 5;
      if (score > bestScore) {
        bestScore = score;
        bestOptions = [[trigger, groupIdx]];
      } else if (score === bestScore) {
        bestOptions.push([trigger, groupIdx]);
      }
    }
    return bestOptions.length > 0 ? bestOptions[Math.floor(Math.random() * bestOptions.length)] : [null, null];
  }
}

export function createAI(difficulty, playerNum) {
  if (difficulty === 'easy' || difficulty === 'simple') {
    return new VerySimpleAI(playerNum);
  }
  if (difficulty === 'hell' || difficulty === 'hard') {
    return new SimpleAI(playerNum, 3);
  }
  return new GreedyAI(playerNum);
}
