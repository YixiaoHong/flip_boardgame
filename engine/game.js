import { Board } from './board.js';
import { FlipRule } from './flipRule.js';
import { ChainFlipHandler } from './chainFlipHandler.js';
import { createAI } from './ai.js';

export function getInitialBoard() {
  return new Board().grid;
}

export function boardFrom(grid) {
  return new Board(grid);
}

export function getValidMovesForPlayer(grid, player) {
  const board = boardFrom(grid);
  const positions = board.getValidMoves(player);
  return positions.map(from => ({ from, to: board.getValidMoves(player, from) }));
}

export function getFlipGroups(board, player, pos) {
  const flipRule = new FlipRule(board);
  return flipRule.getFlipGroupsAfterMove(player, pos);
}

export function getGameStatus(grid) {
  const board = boardFrom(grid);
  const p1Count = board.countPieces(1);
  const p2Count = board.countPieces(2);
  const canMove1 = board.hasAnyMove(1);
  const canMove2 = board.hasAnyMove(2);
  let gameOver = false;
  let winner = null;
  let reason = null;

  if (p1Count === 0 || p2Count === 0) {
    gameOver = true;
    winner = p1Count === 0 ? 2 : 1;
    reason = 'piece_count';
  } else if (!canMove1 || !canMove2) {
    gameOver = true;
    winner = canMove1 ? 1 : (canMove2 ? 2 : (p1Count > p2Count ? 1 : (p2Count > p1Count ? 2 : 0)));
    reason = 'blocked_player';
  }

  return {
    gameOver,
    winner,
    reason,
    counts: { player1: p1Count, player2: p2Count },
    mobility: { player1: canMove1, player2: canMove2 }
  };
}

export function applyFlipGroup(board, player, group) {
  for (const [pos] of group.flips) {
    board.setPiece(pos, player);
  }
}

export function resolveChainFlips(board, player, ai) {
  const history = [];
  const flipRule = new FlipRule(board);
  const chainHandler = new ChainFlipHandler(board, flipRule);

  while (chainHandler.startChainFlip(player)) {
    const [trigger, groupIdx] = ai.chooseChainTrigger(chainHandler);
    if (!trigger || groupIdx === null) break;
    chainHandler.selectTrigger(trigger);
    const group = chainHandler.getAvailableGroups()[groupIdx];
    if (!group) break;
    applyFlipGroup(board, player, group);
    history.push({ trigger, groupIndex: groupIdx, flips: group.flips.map(([pos]) => pos), type: group.type });
  }

  return history;
}

export function aiChooseMove(grid, player, difficulty = 'medium') {
  const board = boardFrom(grid);
  const ai = createAI(difficulty, player);
  const move = ai.chooseMove(board);
  if (!move) {
    return {
      move: null,
      board: board.grid,
      status: getGameStatus(board.grid)
    };
  }

  const [from, to] = move;
  board.movePiece(from, to);
  const flipRule = new FlipRule(board);
  const flipGroups = flipRule.getFlipGroupsAfterMove(player, to);
  const appliedGroups = [];

  let selectedGroupIndex = null;
  if (flipGroups.length > 0) {
    selectedGroupIndex = ai.chooseFlipGroup(flipGroups);
    const group = flipGroups[selectedGroupIndex];
    applyFlipGroup(board, player, group);
    appliedGroups.push({ groupIndex: selectedGroupIndex, type: group.type, flips: group.flips.map(([pos]) => pos) });
  }

  const chainHistory = resolveChainFlips(board, player, ai);

  return {
    move: { from, to },
    initialFlipGroups: flipGroups.map((group, index) => ({ index, type: group.type, flips: group.flips.map(([pos]) => pos) })),
    selectedGroupIndex,
    appliedGroups,
    chainHistory,
    board: board.grid,
    status: getGameStatus(board.grid)
  };
}
