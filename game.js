const GRID_SIZE = 7;
const CELL_SIZE = 50;
const MARGIN = 30;

const PLAYER1_COLOR = '#dc3232';
const PLAYER2_COLOR = '#3232dc';
const BOARD_COLOR = '#f5deb3';
const HIGHLIGHT_COLOR = '#ffff00';
const SELECTED_COLOR = '#00ff00';

const STATE = {
    MODE_SELECT: 'mode_select',
    DIFFICULTY_SELECT: 'difficulty_select',
    RULE_INTRO: 'rule_intro',
    SELECTING: 'selecting',
    MOVING: 'moving',
    FLIPPING: 'flipping',
    CHAIN_FLIPPING: 'chain_flipping',
    GAME_OVER: 'game_over'
};

class Board {
    constructor() {
        this.grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
        this.initPieces();
    }

    initPieces() {
        for (let x = 0; x < GRID_SIZE; x++) {
            this.grid[5][x] = 1;
            this.grid[6][x] = 1;
            this.grid[0][x] = 2;
            this.grid[1][x] = 2;
        }
    }

    getPiece(pos) {
        return this.grid[pos[1]][pos[0]];
    }

    setPiece(pos, player) {
        this.grid[pos[1]][pos[0]] = player;
    }

    hasConnection(from, to) {
        const [fx, fy] = from;
        const [tx, ty] = to;
        const dx = tx - fx;
        const dy = ty - fy;

        if (dx === 0 || dy === 0) return true;
        if (Math.abs(dx) === 1 && Math.abs(dy) === 1) return true; // 全棋盘X形
        return false;
    }

    getValidMoves(player, from = null) {
        if (from === null) {
            const positions = [];
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    if (this.grid[y][x] === player) {
                        positions.push([x, y]);
                    }
                }
            }
            return positions;
        }

        const [fx, fy] = from;
        const valid = [];
        const directions = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0], [1, 0],
            [-1, 1], [0, 1], [1, 1]
        ];

        for (const [dx, dy] of directions) {
            // 1. 走一格
            const tx = fx + dx;
            const ty = fy + dy;
            if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
                if (this.grid[ty][tx] === 0 && this.hasConnection(from, [tx, ty])) {
                    valid.push([tx, ty]);
                }
            }

            // 2. 跳过N个同阵营棋子（可以是N个己方或N个敌方，不能混合）
            let firstPiece = null;
            let step = 1;
            while (true) {
                const cx = fx + step * dx;
                const cy = fy + step * dy;
                if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) {
                    break; // 出界
                }
                const piece = this.grid[cy][cx];
                if (piece === 0) {
                    // 遇到空位，如果之前已经跳过了至少一个同阵营棋子，那么这个空位是有效的落点
                    if (firstPiece !== null) {
                        // 检查连接性：每一步都需要有连接
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
                    break; // 无论是否跳成功，遇到空位就停止这个方向
                } else {
                    // 遇到棋子
                    if (firstPiece === null) {
                        firstPiece = piece; // 记录第一个棋子的阵营
                    } else {
                        if (piece !== firstPiece) {
                            break; // 遇到不同阵营，无法继续跳过
                        }
                    }
                    // 继续检查下一个位置
                    step++;
                }
            }
        }
        return valid;
    }

    movePiece(from, to) {
        const player = this.grid[from[1]][from[0]];
        this.grid[to[1]][to[0]] = player;
        this.grid[from[1]][from[0]] = 0;
    }

    copy() {
        const newBoard = new Board();
        newBoard.grid = this.grid.map(row => [...row]);
        return newBoard;
    }

    countPieces(player) {
        let count = 0;
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (this.grid[y][x] === player) count++;
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

    static evaluatePosition(pos) {
        const [x, y] = pos;
        const centerX = GRID_SIZE / 2 - 0.5;
        const centerY = GRID_SIZE / 2 - 0.5;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const maxDistance = Math.sqrt((GRID_SIZE / 2) ** 2 + (GRID_SIZE / 2) ** 2);
        return (maxDistance - distance) / maxDistance;
    }
}

class FlipRule {
    constructor(board) {
        this.board = board;
    }

    getFlipsAfterMove(player, pos) {
        const groups = this.getFlipGroupsAfterMove(player, pos);
        const flips = [];
        for (const group of groups) {
            flips.push(...group.flips);
        }
        return flips;
    }

    getFlipGroupsAfterMove(player, pos) {
        const groups = [];
        const opponent = 3 - player;
        const [nx, ny] = pos;
        const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

        for (const [dx, dy] of directions) {
            const ax1 = nx + dx;
            const ay1 = ny + dy;
            const ax2 = nx + dx * 2;
            const ay2 = ny + dy * 2;
            if (ax1 >= 0 && ax1 < GRID_SIZE && ay1 >= 0 && ay1 < GRID_SIZE &&
                ax2 >= 0 && ax2 < GRID_SIZE && ay2 >= 0 && ay2 < GRID_SIZE) {
                if (this.board.getPiece([ax1, ay1]) === opponent && this.board.getPiece([ax2, ay2]) === player) {
                    groups.push({ type: 'a', dir: [dx, dy], flips: [[[ax1, ay1], '规则A']] });
                }
            }

            const bx1 = nx - dx;
            const by1 = ny - dy;
            const bx2 = nx + dx;
            const by2 = ny + dy;
            if (bx1 >= 0 && bx1 < GRID_SIZE && by1 >= 0 && by1 < GRID_SIZE &&
                bx2 >= 0 && bx2 < GRID_SIZE && by2 >= 0 && by2 < GRID_SIZE) {
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
        const groups = this.getFlipGroupsForTrigger(player, pos);
        const flips = [];
        for (const group of groups) {
            flips.push(...group.flips);
        }
        return flips;
    }

    getFlipGroupsForTrigger(player, pos) {
        const groups = [];
        const opponent = 3 - player;
        const [px, py] = pos;
        const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

        for (const [dx, dy] of directions) {
            const ax1 = px + dx;
            const ay1 = py + dy;
            const ax2 = px + dx * 2;
            const ay2 = py + dy * 2;
            if (ax1 >= 0 && ax1 < GRID_SIZE && ay1 >= 0 && ay1 < GRID_SIZE &&
                ax2 >= 0 && ax2 < GRID_SIZE && ay2 >= 0 && ay2 < GRID_SIZE) {
                if (this.board.getPiece([ax1, ay1]) === opponent && this.board.getPiece([ax2, ay2]) === player) {
                    groups.push({ type: 'a', dir: [dx, dy], flips: [[[ax1, ay1], '连锁A']] });
                }
            }

            const bx1 = px - dx;
            const by1 = py - dy;
            const bx2 = px + dx;
            const by2 = py + dy;
            if (bx1 >= 0 && bx1 < GRID_SIZE && by1 >= 0 && by1 < GRID_SIZE &&
                bx2 >= 0 && bx2 < GRID_SIZE && by2 >= 0 && by2 < GRID_SIZE) {
                if (this.board.getPiece([bx1, by1]) === opponent && this.board.getPiece([bx2, by2]) === opponent) {
                    groups.push({ type: 'b', dir: [dx, dy], flips: [[[bx1, by1], '连锁B左'], [[bx2, by2], '连锁B右']] });
                }
            }
        }
        return groups;
    }
}

class ChainFlipHandler {
    constructor(board, flipRule) {
        this.board = board;
        this.flipRule = flipRule;
        this.player = 0;
        this.availableTriggers = [];
        this.selectedTrigger = null;
        this.previewFlips = [];
        this.availableGroups = [];
        this.selectedGroup = null;
    }

    startChainFlip(player) {
        this.player = player;
        this.availableTriggers = this.flipRule.getTriggers(player);
        this.selectedTrigger = null;
        this.previewFlips = [];
        this.availableGroups = [];
        this.selectedGroup = null;
        return this.availableTriggers.length > 0;
    }

    getTriggers() {
        return this.availableTriggers;
    }

    getPreviewFlips() {
        return this.previewFlips;
    }

    getAvailableGroups() {
        return this.availableGroups;
    }

    getSelectedGroup() {
        return this.selectedGroup;
    }

    selectTrigger(pos) {
        const index = this.availableTriggers.findIndex(t => t[0] === pos[0] && t[1] === pos[1]);
        if (index === -1) return;

        this.selectedTrigger = pos;
        this.availableGroups = this.flipRule.getFlipGroupsForTrigger(this.player, pos);
        this.selectedGroup = null;
        if (this.availableGroups.length > 0) {
            this.previewFlips = this.availableGroups[0].flips.map(f => f[0]);
        } else {
            this.previewFlips = [];
        }
    }

    selectGroup(pos) {
        if (this.selectedTrigger === null) return;
        for (let i = 0; i < this.availableGroups.length; i++) {
            for (const [p, _] of this.availableGroups[i].flips) {
                if (p[0] === pos[0] && p[1] === pos[1]) {
                    this.selectedGroup = i;
                    this.previewFlips = this.availableGroups[i].flips.map(f => f[0]);
                    return;
                }
            }
        }
    }
}

// 简单难度：有策略但比较简单的AI
class VerySimpleAI {
    constructor(playerNum) {
        this.playerNum = playerNum;
        this.opponent = 3 - playerNum;
    }

    chooseMove(board) {
        const allMoves = [];
        const fromPositions = board.getValidMoves(this.playerNum);

        // 收集所有合法走法
        for (const from of fromPositions) {
            const toPositions = board.getValidMoves(this.playerNum, from);
            for (const to of toPositions) {
                allMoves.push([from, to]);
            }
        }

        if (allMoves.length === 0) return null;

        // 有翻转机会时，一定选能翻转的走法（但不一定选翻转最多的）
        const movesWithFlip = [];
        for (const [from, to] of allMoves) {
            const simBoard = board.copy();
            simBoard.movePiece(from, to);
            const flipRule = new FlipRule(simBoard);
            const flipGroups = flipRule.getFlipGroupsAfterMove(this.playerNum, to);
            if (flipGroups.length > 0) {
                movesWithFlip.push([from, to]);
            }
        }

        if (movesWithFlip.length > 0) {
            // 有翻转机会，优先选能翻转的，随便选一个就行
            return movesWithFlip[Math.floor(Math.random() * movesWithFlip.length)];
        }

        // 没有翻转机会时，优先往棋盘中间走
        let bestScore = -Infinity;
        let bestMoves = [];
        for (const [from, to] of allMoves) {
            const score = Board.evaluatePosition(to);
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [[from, to]];
            } else if (score === bestScore) {
                bestMoves.push([from, to]);
            }
        }

        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    chooseFlipGroup(groups) {
        // 翻转时也选择翻转数量较多的，但不用最优，在较好的里面随机选
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

        // 有连锁翻转机会时，肯定选择翻转
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

// 中等难度：贪心算法
class GreedyAI {
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
        if (bestMoves.length > 0) {
            return bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }
        return null;
    }

    evaluateMove(board, from, to) {
        const simBoard = board.copy();
        simBoard.movePiece(from, to);

        let score = 0;

        // 评估：立即能翻转的棋子数量最重要
        const flipRule = new FlipRule(simBoard);
        const flipGroups = flipRule.getFlipGroupsAfterMove(this.playerNum, to);
        let maxFlips = 0;
        for (const group of flipGroups) {
            if (group.flips.length > maxFlips) {
                maxFlips = group.flips.length;
            }
        }
        score += maxFlips * 100;

        // 位置评估
        score += Board.evaluatePosition(to) * 10;

        // 增加一些随机性，让游戏不那么单调
        score += Math.random() * 5;

        return score;
    }

    chooseFlipGroup(groups) {
        // 贪心：选择翻转最多的
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

        if (bestOptions.length > 0) {
            return bestOptions[Math.floor(Math.random() * bestOptions.length)];
        }
        return [null, null];
    }
}

// Minimax AI（中等和地狱难度）
class SimpleAI {
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
        if (bestMoves.length > 0) {
            return bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }
        return null;
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
            for (const [pos, _] of bestGroup.flips) {
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
            chainHandler.selectedGroup = bestGroupIdx;
            const group = chainHandler.availableGroups[bestGroupIdx];
            for (const [pos, _] of group.flips) {
                board.setPiece(pos, player);
            }
        }
    }

    minimax(board, depth, alpha, beta, isMaximizing) {
        const p1Count = board.countPieces(1);
        const p2Count = board.countPieces(2);

        if (p1Count === 0 || p2Count === 0) {
            if (this.playerNum === 1) {
                return p2Count === 0 ? 10000 : -10000;
            } else {
                return p1Count === 0 ? 10000 : -10000;
            }
        }

        const currentPlayer = isMaximizing ? this.playerNum : this.opponent;
        if (!board.hasAnyMove(currentPlayer)) {
            if (this.playerNum === 1) {
                return p1Count > p2Count ? 10000 : -10000;
            } else {
                return p2Count > p1Count ? 10000 : -10000;
            }
        }

        if (depth === 0) {
            return this.evaluateBoard(board);
        }

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
                        for (const [pos, _] of bestGroup.flips) {
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
        } else {
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
                        for (const [pos, _] of bestGroup.flips) {
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
    }

    evaluateBoard(board) {
        let score = 0;

        const myCount = board.countPieces(this.playerNum);
        const oppCount = board.countPieces(this.opponent);
        score += (myCount - oppCount) * 100;

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const piece = board.getPiece([x, y]);
                if (piece === this.playerNum) {
                    score += Board.evaluatePosition([x, y]) * 10;
                } else if (piece === this.opponent) {
                    score -= Board.evaluatePosition([x, y]) * 10;
                }
            }
        }

        const myMobility = this.countMoves(board, this.playerNum);
        const oppMobility = this.countMoves(board, this.opponent);
        score += (myMobility - oppMobility) * 20;

        const flipRule = new FlipRule(board);
        const myTriggers = flipRule.getTriggers(this.playerNum).length;
        const oppTriggers = flipRule.getTriggers(this.opponent).length;
        score += (myTriggers - oppTriggers) * 30;

        return score;
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

        if (bestOptions.length > 0) {
            return bestOptions[Math.floor(Math.random() * bestOptions.length)];
        }
        return [null, null];
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        this.board = new Board();
        this.flipRule = new FlipRule(this.board);
        this.chainHandler = new ChainFlipHandler(this.board, this.flipRule);

        this.currentPlayer = 1;
        this.state = STATE.MODE_SELECT;
        this.selectedPos = null;
        this.pendingFlipGroups = [];
        this.selectedFlipGroup = null;
        this.gameMode = null;
        this.ai = null;
        this.aiActionTimer = 0;

        this.rulePage = 0;

        // 历史记录用于悔棋
        this.history = [];

        // AI定时器
        this.aiTimers = [];

        // 动画相关
        this.animationState = null;
        this.animationProgress = 0;
        this.animationFrameId = null;

        // 强制结算相关
        this.noFlipStepCount = 0;  // 无翻转步数计数（每走一步算一步）
        this.lastActionPlayer = null;  // 最后执行动作的玩家
        this.flipOccurredThisStep = false;  // 当前这步是否发生了翻转

        // 窗口大小变化监听
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });

        this.bindEvents();
        this.render();
    }

    resizeCanvas() {
        const container = document.getElementById('canvas-container');
        const containerWidth = container ? container.clientWidth : 400;
        const canvasSize = Math.min(containerWidth, 400);

        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;
        this.cellSize = (canvasSize - MARGIN * 2) / (GRID_SIZE - 1);
        this.margin = MARGIN;
    }

    posToScreen(pos) {
        return [this.margin + pos[0] * this.cellSize, this.margin + pos[1] * this.cellSize];
    }

    screenToPos(screenPos) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const sx = (screenPos[0] - rect.left) * scaleX;
        const sy = (screenPos[1] - rect.top) * scaleY;
        const x = Math.round((sx - this.margin) / this.cellSize);
        const y = Math.round((sy - this.margin) / this.cellSize);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            const [tx, ty] = this.posToScreen([x, y]);
            const dx = Math.abs(sx - tx);
            const dy = Math.abs(sy - ty);
            const threshold = Math.max(20, this.cellSize * 0.4);
            if (dx < threshold && dy < threshold) {
                return [x, y];
            }
        }
        return null;
    }

    saveState() {
        // 保存当前游戏状态
        return {
            board: this.board.copy(),
            currentPlayer: this.currentPlayer,
            state: this.state,
            selectedPos: this.selectedPos ? [...this.selectedPos] : null,
            pendingFlipGroups: JSON.parse(JSON.stringify(this.pendingFlipGroups)),
            selectedFlipGroup: this.selectedFlipGroup,
            chainHandler: {
                player: this.chainHandler.player,
                availableTriggers: this.chainHandler.availableTriggers.map(t => [...t]),
                selectedTrigger: this.chainHandler.selectedTrigger ? [...this.chainHandler.selectedTrigger] : null,
                previewFlips: this.chainHandler.previewFlips.map(f => [...f]),
                availableGroups: JSON.parse(JSON.stringify(this.chainHandler.availableGroups)),
                selectedGroup: this.chainHandler.selectedGroup
            },
            gameMode: this.gameMode,
            difficulty: this.difficulty,
            noFlipStepCount: this.noFlipStepCount,
            lastActionPlayer: this.lastActionPlayer,
            flipOccurredThisStep: this.flipOccurredThisStep,
            forceSettleWinner: this.forceSettleWinner,
            forceSettleP1Count: this.forceSettleP1Count,
            forceSettleP2Count: this.forceSettleP2Count
        };
    }

    restoreState(state) {
        // 恢复游戏状态
        this.board = state.board;
        this.flipRule = new FlipRule(this.board);
        this.chainHandler = new ChainFlipHandler(this.board, this.flipRule);
        this.chainHandler.player = state.chainHandler.player;
        this.chainHandler.availableTriggers = state.chainHandler.availableTriggers;
        this.chainHandler.selectedTrigger = state.chainHandler.selectedTrigger;
        this.chainHandler.previewFlips = state.chainHandler.previewFlips;
        this.chainHandler.availableGroups = state.chainHandler.availableGroups;
        this.chainHandler.selectedGroup = state.chainHandler.selectedGroup;

        this.currentPlayer = state.currentPlayer;
        this.state = state.state;
        this.selectedPos = state.selectedPos;
        this.pendingFlipGroups = state.pendingFlipGroups;
        this.selectedFlipGroup = state.selectedFlipGroup;
        if (state.gameMode) {
            this.gameMode = state.gameMode;
        }
        if (state.difficulty) {
            this.difficulty = state.difficulty;
        }
        this.noFlipStepCount = state.noFlipStepCount || 0;
        this.lastActionPlayer = state.lastActionPlayer;
        this.flipOccurredThisStep = state.flipOccurredThisStep || false;
        this.forceSettleWinner = state.forceSettleWinner;
        this.forceSettleP1Count = state.forceSettleP1Count;
        this.forceSettleP2Count = state.forceSettleP2Count;

        // 重新创建AI实例（AI是无状态的，可以直接重建）
        if (this.gameMode === 'pve') {
            if (this.difficulty === 'easy') {
                this.ai = new VerySimpleAI(2);
            } else if (this.difficulty === 'medium') {
                this.ai = new GreedyAI(2);
            } else { // hell
                this.ai = new SimpleAI(2, 3);
            }
        }
    }

    undo() {
        // 清除所有AI定时器
        this.clearAITimers();

        // 停止动画
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationState = null;

        if (this.history.length <= 1) return;

        // PVE模式下，悔棋需要回退到上一个玩家1的SELECTING/MOVING状态
        if (this.gameMode === 'pve') {
            // 找到上一个玩家1的SELECTING/MOVING状态
            let targetIndex = -1;
            for (let i = this.history.length - 2; i >= 0; i--) {
                const s = this.history[i];
                if (s.currentPlayer === 1 &&
                    (s.state === STATE.SELECTING || s.state === STATE.MOVING)) {
                    targetIndex = i;
                    break;
                }
            }
            if (targetIndex >= 0) {
                this.history = this.history.slice(0, targetIndex + 1);
                this.restoreState(this.history[this.history.length - 1]);
            }
        } else {
            // PVP模式下回退一步
            this.history.pop();
            this.restoreState(this.history[this.history.length - 1]);
        }

        this.render();
    }

    clearAITimers() {
        for (const timer of this.aiTimers) {
            clearTimeout(timer);
        }
        this.aiTimers = [];
    }

    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick([e.clientX, e.clientY]));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleClick([touch.clientX, touch.clientY]);
        }, { passive: false });

        document.getElementById('btn-pvp').addEventListener('click', () => this.startGame('pvp'));
        document.getElementById('btn-pve').addEventListener('click', () => this.showDifficultySelect());
        document.getElementById('btn-rules').addEventListener('click', () => this.showRules());
        document.getElementById('btn-about').addEventListener('click', () => this.showAbout());
        document.getElementById('btn-back').addEventListener('click', () => this.backToMenu());
        document.getElementById('btn-confirm').addEventListener('click', () => this.confirmAction());
        document.getElementById('btn-skip').addEventListener('click', () => this.skipAction());
        document.getElementById('btn-restart').addEventListener('click', () => this.restart());
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());

        document.getElementById('btn-prev').addEventListener('click', () => this.prevRulePage());
        document.getElementById('btn-next').addEventListener('click', () => this.nextRulePage());
        document.getElementById('btn-back-rules').addEventListener('click', () => this.backToMenuFromRules());
        document.getElementById('btn-back-from-about').addEventListener('click', () => this.backFromAbout());

        // 难度选择按钮
        document.getElementById('btn-easy').addEventListener('click', () => this.startGameWithDifficulty('easy'));
        document.getElementById('btn-medium').addEventListener('click', () => this.startGameWithDifficulty('medium'));
        document.getElementById('btn-hell').addEventListener('click', () => this.startGameWithDifficulty('hell'));
        document.getElementById('btn-back-from-difficulty').addEventListener('click', () => this.backToMenuFromDifficulty());

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });
    }

    showDifficultySelect() {
        document.getElementById('mode-select').style.display = 'none';
        document.getElementById('difficulty-select').style.display = 'inline-block';
        this.state = STATE.DIFFICULTY_SELECT;
    }

    backToMenuFromDifficulty() {
        document.getElementById('difficulty-select').style.display = 'none';
        document.getElementById('mode-select').style.display = 'inline-block';
        this.state = STATE.MODE_SELECT;
    }

    startGameWithDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.startGame('pve');
    }

    startGame(mode) {
        this.board = new Board();
        this.flipRule = new FlipRule(this.board);
        this.chainHandler = new ChainFlipHandler(this.board, this.flipRule);
        this.currentPlayer = 1;
        this.state = STATE.SELECTING;
        this.selectedPos = null;
        this.pendingFlipGroups = [];
        this.selectedFlipGroup = null;
        this.gameMode = mode;
        if (mode === 'pve') {
            if (this.difficulty === 'easy') {
                this.ai = new VerySimpleAI(2);
            } else if (this.difficulty === 'medium') {
                this.ai = new GreedyAI(2);
            } else { // hell
                this.ai = new SimpleAI(2, 3);
            }
        }

        // 重置强制结算相关变量
        this.noFlipStepCount = 0;
        this.lastActionPlayer = null;
        this.flipOccurredThisStep = false;
        this.forceSettleWinner = null;
        this.forceSettleP1Count = null;
        this.forceSettleP2Count = null;

        // 初始化历史记录
        this.history = [this.saveState()];

        document.getElementById('mode-select').style.display = 'none';
        document.getElementById('difficulty-select').style.display = 'none';
        document.getElementById('rule-intro').style.display = 'none';
        document.getElementById('game-area').style.display = 'block';

        // 重新调整画布大小
        setTimeout(() => {
            this.resizeCanvas();
            this.render();
        }, 50);
    }

    showRules() {
        document.getElementById('mode-select').style.display = 'none';
        document.getElementById('rule-intro').style.display = 'inline-block';
        this.rulePage = 0;
        this.updateRulePage();
    }

    showAbout() {
        document.getElementById('mode-select').style.display = 'none';
        document.getElementById('about-panel').style.display = 'inline-block';
    }

    backFromAbout() {
        document.getElementById('about-panel').style.display = 'none';
        document.getElementById('mode-select').style.display = 'inline-block';
    }

    backToMenu() {
        this.clearAITimers();
        this.state = STATE.MODE_SELECT;
        document.getElementById('game-area').style.display = 'none';
        document.getElementById('rule-intro').style.display = 'none';
        document.getElementById('about-panel').style.display = 'none';
        document.getElementById('difficulty-select').style.display = 'none';
        document.getElementById('mode-select').style.display = 'inline-block';
    }

    backToMenuFromRules() {
        document.getElementById('rule-intro').style.display = 'none';
        document.getElementById('mode-select').style.display = 'inline-block';
    }

    prevRulePage() {
        if (this.rulePage > 0) {
            this.rulePage--;
            this.updateRulePage();
        }
    }

    nextRulePage() {
        if (this.rulePage < 4) {
            this.rulePage++;
            this.updateRulePage();
        }
    }

    updateRulePage() {
        document.querySelectorAll('.rule-page').forEach(p => p.classList.remove('active'));
        document.querySelector(`.rule-page[data-page="${this.rulePage}"]`).classList.add('active');
        document.getElementById('page-indicator').textContent = `${this.rulePage + 1}/5`;

        document.getElementById('btn-prev').style.display = this.rulePage === 0 ? 'none' : 'inline-block';
        document.getElementById('btn-next').style.display = this.rulePage === 4 ? 'none' : 'inline-block';
        document.getElementById('btn-back-rules').style.display = this.rulePage === 4 ? 'inline-block' : 'none';
    }

    handleClick(pos) {
        if (this.state === STATE.MODE_SELECT || this.state === STATE.RULE_INTRO) return;

        // 动画期间不能操作
        if (this.animationState) return;

        // PVE模式下，如果是AI的回合，玩家不能操作
        if (this.gameMode === 'pve' && this.currentPlayer === 2) return;

        const bPos = this.screenToPos(pos);

        if (this.state === STATE.GAME_OVER) {
            this.restart();
            return;
        }

        if (this.state === STATE.SELECTING) {
            if (bPos && this.board.getPiece(bPos) === this.currentPlayer) {
                this.selectedPos = bPos;
                this.state = STATE.MOVING;
            }
        } else if (this.state === STATE.MOVING) {
            if (bPos && this.board.getValidMoves(this.currentPlayer, this.selectedPos).some(p => p[0] === bPos[0] && p[1] === bPos[1])) {
                this.doMove(this.selectedPos, bPos);
            } else if (bPos && this.board.getPiece(bPos) === this.currentPlayer) {
                this.selectedPos = bPos;
            } else {
                this.state = STATE.SELECTING;
                this.selectedPos = null;
            }
        } else if (this.state === STATE.FLIPPING) {
            if (bPos) {
                for (let i = 0; i < this.pendingFlipGroups.length; i++) {
                    for (const [p, _] of this.pendingFlipGroups[i].flips) {
                        if (p[0] === bPos[0] && p[1] === bPos[1]) {
                            this.selectedFlipGroup = i;
                            break;
                        }
                    }
                }
            }
        } else if (this.state === STATE.CHAIN_FLIPPING) {
            if (bPos) {
                if (this.chainHandler.selectedTrigger !== null) {
                    this.chainHandler.selectGroup(bPos);
                }
                if (this.chainHandler.selectedTrigger === null ||
                    this.chainHandler.getTriggers().some(t => t[0] === bPos[0] && t[1] === bPos[1])) {
                    this.chainHandler.selectTrigger(bPos);
                }
            }
        }
        this.render();
    }

    doMove(from, to) {
        this.history.push(this.saveState());

        // 记录当前玩家是最后一个动作的玩家
        this.lastActionPlayer = this.currentPlayer;

        // 标记这步还未发生翻转
        this.flipOccurredThisStep = false;

        // 播放移动动画
        this.animationState = {
            type: 'move',
            from: from,
            to: to,
            player: this.board.getPiece(from),
            duration: 300,
            startTime: performance.now()
        };

        // 先在 board 上移动，这样动画期间棋盘状态已经是新的
        this.board.movePiece(from, to);
        this.selectedPos = to;

        // 启动动画
        this.startAnimation(() => {
            // 动画完成后检查翻转
            this.pendingFlipGroups = this.flipRule.getFlipGroupsAfterMove(this.currentPlayer, to);
            this.selectedFlipGroup = null;

            if (this.pendingFlipGroups.length > 0) {
                this.state = STATE.FLIPPING;
                // 如果是AI的回合，自动翻转
                if (this.gameMode === 'pve' && this.currentPlayer === 2) {
                    this.doAIFlip();
                }
            } else {
                this.endTurn();
            }
            this.render();
        });
    }

    confirmAction() {
        if (this.state === STATE.FLIPPING && this.selectedFlipGroup !== null) {
            this.history.push(this.saveState());
            const group = this.pendingFlipGroups[this.selectedFlipGroup];

            // 标记这步发生了翻转
            this.flipOccurredThisStep = true;

            // 播放翻转动画
            const flips = group.flips.map(([pos, _]) => ({
                pos: pos,
                fromPlayer: this.board.getPiece(pos)
            }));

            // 先设置棋子
            for (const [pos, _] of group.flips) {
                this.board.setPiece(pos, this.currentPlayer);
            }

            this.animationState = {
                type: 'flip',
                flips: flips,
                toPlayer: this.currentPlayer,
                duration: 400,
                startTime: performance.now()
            };

            this.startAnimation(() => {
                if (this.chainHandler.startChainFlip(this.currentPlayer)) {
                    this.state = STATE.CHAIN_FLIPPING;
                    // 如果是AI的回合，开始连锁翻转
                    if (this.gameMode === 'pve' && this.currentPlayer === 2) {
                        const timer = setTimeout(() => this.doAIChain(), 500);
                        this.aiTimers.push(timer);
                    }
                } else {
                    this.endTurn();
                }
                this.render();
            });

        } else if (this.state === STATE.CHAIN_FLIPPING && this.chainHandler.selectedTrigger !== null && this.chainHandler.selectedGroup !== null) {
            this.history.push(this.saveState());
            const groups = this.chainHandler.availableGroups;
            const group = groups[this.chainHandler.selectedGroup];

            // 标记这步发生了翻转
            this.flipOccurredThisStep = true;

            // 播放翻转动画
            const flips = group.flips.map(([pos, _]) => ({
                pos: pos,
                fromPlayer: this.board.getPiece(pos)
            }));

            // 先设置棋子
            for (const [pos, _] of group.flips) {
                this.board.setPiece(pos, this.currentPlayer);
            }

            this.animationState = {
                type: 'flip',
                flips: flips,
                toPlayer: this.currentPlayer,
                duration: 400,
                startTime: performance.now()
            };

            this.startAnimation(() => {
                // 每次翻转后，重新全局扫描所有可能的触发点（包括刚翻转的棋子）
                if (this.chainHandler.startChainFlip(this.currentPlayer)) {
                    // 还有可翻转的内容，保持连锁状态
                    this.state = STATE.CHAIN_FLIPPING;
                    // 如果是AI的回合，继续连锁翻转
                    if (this.gameMode === 'pve' && this.currentPlayer === 2) {
                        const timer = setTimeout(() => this.doAIChain(), 500);
                        this.aiTimers.push(timer);
                    }
                } else {
                    // 没有任何可翻转的了，结束回合
                    this.endTurn();
                }
                this.render();
            });
        }
    }

    skipAction() {
        if (this.state === STATE.FLIPPING || this.state === STATE.CHAIN_FLIPPING) {
            this.history.push(this.saveState());
            this.endTurn();
            this.render();
        }
    }

    endTurn() {
        const p1Count = this.board.countPieces(1);
        const p2Count = this.board.countPieces(2);

        if (p1Count === 0 || p2Count === 0) {
            this.state = STATE.GAME_OVER;
            return;
        }

        // 更新无翻转步数计数
        if (this.flipOccurredThisStep) {
            // 这步有翻转，重置计数
            this.noFlipStepCount = 0;
        } else {
            // 这步没翻转，计数+1
            this.noFlipStepCount++;
        }

        // 检查是否达到强制结算条件（连续20步无翻转）
        if (this.noFlipStepCount >= 20) {
            this.forceSettle();
            return;
        }

        // 先切换玩家
        this.currentPlayer = 3 - this.currentPlayer;

        // 检查对方是否无子可走
        if (!this.board.hasAnyMove(this.currentPlayer)) {
            this.state = STATE.GAME_OVER;
            return;
        }

        this.state = STATE.SELECTING;
        this.selectedPos = null;

        if (this.gameMode === 'pve' && this.currentPlayer === 2) {
            const timer = setTimeout(() => this.doAIMove(), 800);
            this.aiTimers.push(timer);
        }
    }

    forceSettle() {
        // 强制结算
        const p1Count = this.board.countPieces(1);
        const p2Count = this.board.countPieces(2);

        let winner;
        if (p1Count > p2Count) {
            winner = 1;
        } else if (p2Count > p1Count) {
            winner = 2;
        } else {
            // 棋子一样多，最后执行动作的玩家获胜
            winner = this.lastActionPlayer || 1;
        }

        // 保存获胜者信息，用于在UI显示
        this.forceSettleWinner = winner;
        this.forceSettleP1Count = p1Count;
        this.forceSettleP2Count = p2Count;
        this.state = STATE.GAME_OVER;
    }

    doAIMove() {
        if (this.state !== STATE.SELECTING || this.currentPlayer !== 2) return;

        const [from, to] = this.ai.chooseMove(this.board);
        if (!from || !to) return;

        this.selectedPos = from;
        this.state = STATE.MOVING;
        this.render();

        const timer = setTimeout(() => {
            this.doMove(from, to);
        }, 600);
        this.aiTimers.push(timer);
    }

    doAIFlip() {
        if (this.state !== STATE.FLIPPING) return;

        const timer = setTimeout(() => {
            const groupIdx = this.ai.chooseFlipGroup(this.pendingFlipGroups);
            this.selectedFlipGroup = groupIdx;
            this.confirmAction();
            // 注意：不要在这里继续调用 doAIChain()
            // 动画完成后会在 confirmAction 的回调中处理
        }, 600);
        this.aiTimers.push(timer);
    }

    doAIChain() {
        if (this.state !== STATE.CHAIN_FLIPPING) return;

        const [trigger, groupIdx] = this.ai.chooseChainTrigger(this.chainHandler);
        if (trigger === null) {
            const skipTimer = setTimeout(() => this.skipAction(), 500);
            this.aiTimers.push(skipTimer);
            return;
        }

        this.chainHandler.selectTrigger(trigger);
        this.chainHandler.selectedGroup = groupIdx;
        this.confirmAction();
        // 注意：不要在这里继续调用 doAIChain()
        // 动画完成后会在 confirmAction 的回调中处理
    }

    startAnimation(onComplete) {
        const animate = (now) => {
            if (!this.animationState) {
                return;
            }
            const elapsed = now - this.animationState.startTime;
            this.animationProgress = Math.min(elapsed / this.animationState.duration, 1);

            this.render();

            if (this.animationProgress < 1) {
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                this.animationState = null;
                this.animationFrameId = null;
                onComplete();
            }
        };
        this.animationFrameId = requestAnimationFrame(animate);
    }

    restart() {
        this.clearAITimers();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationState = null;
        this.board = new Board();
        this.flipRule = new FlipRule(this.board);
        this.chainHandler = new ChainFlipHandler(this.board, this.flipRule);
        this.currentPlayer = 1;
        this.state = STATE.SELECTING;
        this.selectedPos = null;
        this.pendingFlipGroups = [];
        this.selectedFlipGroup = null;

        // 重新创建AI实例
        if (this.gameMode === 'pve') {
            if (this.difficulty === 'easy') {
                this.ai = new VerySimpleAI(2);
            } else if (this.difficulty === 'medium') {
                this.ai = new GreedyAI(2);
            } else { // hell
                this.ai = new SimpleAI(2, 3);
            }
        }

        // 重置强制结算相关变量
        this.noFlipStepCount = 0;
        this.lastActionPlayer = null;
        this.flipOccurredThisStep = false;
        this.forceSettleWinner = null;
        this.forceSettleP1Count = null;
        this.forceSettleP2Count = null;

        this.history = [this.saveState()];
        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawBoard();
        this.drawPieces();
        this.drawHighlight();
        this.updateUI();
    }

    drawBoard() {
        const ctx = this.ctx;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        for (let y = 0; y < GRID_SIZE; y++) {
            const [sx, sy] = this.posToScreen([0, y]);
            const [ex, ey] = this.posToScreen([GRID_SIZE - 1, y]);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }

        for (let x = 0; x < GRID_SIZE; x++) {
            const [sx, sy] = this.posToScreen([x, 0]);
            const [ex, ey] = this.posToScreen([x, GRID_SIZE - 1]);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }

        ctx.lineWidth = 1;
        // 全棋盘X形
        for (let gy = 0; gy < GRID_SIZE - 1; gy++) {
            for (let gx = 0; gx < GRID_SIZE - 1; gx++) {
                // 右下斜 \
                let [sx, sy] = this.posToScreen([gx, gy]);
                let [ex, ey] = this.posToScreen([gx + 1, gy + 1]);
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.stroke();
                // 右上斜 /
                [sx, sy] = this.posToScreen([gx + 1, gy]);
                [ex, ey] = this.posToScreen([gx, gy + 1]);
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
        }
    }

    drawPieces() {
        const ctx = this.ctx;

        // 先绘制所有普通棋子
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const pos = [x, y];
                let skip = false;

                // 如果是动画中的棋子，先跳过，后面单独绘制
                if (this.animationState) {
                    if (this.animationState.type === 'move') {
                        // 移动动画：跳过起点和终点
                        if ((pos[0] === this.animationState.from[0] && pos[1] === this.animationState.from[1]) ||
                            (pos[0] === this.animationState.to[0] && pos[1] === this.animationState.to[1])) {
                            skip = true;
                        }
                    } else if (this.animationState.type === 'flip') {
                        // 翻转动画：跳过正在翻转的棋子
                        for (const f of this.animationState.flips) {
                            if (pos[0] === f.pos[0] && pos[1] === f.pos[1]) {
                                skip = true;
                                break;
                            }
                        }
                    }
                }

                if (!skip) {
                    const p = this.board.getPiece(pos);
                    if (p !== 0) {
                        this.drawPieceAt(pos, p, 1);
                    }
                }
            }
        }

        // 绘制动画中的棋子
        if (this.animationState) {
            const t = this.animationProgress;

            if (this.animationState.type === 'move') {
                const [fx, fy] = this.posToScreen(this.animationState.from);
                const [tx, ty] = this.posToScreen(this.animationState.to);
                // 使用缓动函数让动画更自然
                const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                const cx = fx + (tx - fx) * easeT;
                const cy = fy + (ty - fy) * easeT;
                const color = this.animationState.player === 1 ? PLAYER1_COLOR : PLAYER2_COLOR;
                const radius = Math.max(12, this.cellSize * 0.3);
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();

            } else if (this.animationState.type === 'flip') {
                for (const f of this.animationState.flips) {
                    const fromColor = f.fromPlayer === 1 ? PLAYER1_COLOR : PLAYER2_COLOR;
                    const toColor = this.animationState.toPlayer === 1 ? PLAYER1_COLOR : PLAYER2_COLOR;
                    // 翻转效果：先缩小到0，再放大
                    let scale;
                    let color;
                    if (t < 0.5) {
                        scale = 1 - t * 2;
                        color = fromColor;
                    } else {
                        scale = (t - 0.5) * 2;
                        color = toColor;
                    }
                    const [cx, cy] = this.posToScreen(f.pos);
                    const baseRadius = Math.max(12, this.cellSize * 0.3);
                    const radius = baseRadius * scale;

                    if (radius > 0.5) {
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                        ctx.fillStyle = color;
                        ctx.fill();
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                }
            }
        }
    }

    drawPieceAt(pos, player, scale = 1) {
        const ctx = this.ctx;
        const color = player === 1 ? PLAYER1_COLOR : PLAYER2_COLOR;
        const [cx, cy] = this.posToScreen(pos);
        const radius = Math.max(12, this.cellSize * 0.3) * scale;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawHighlight() {
        const ctx = this.ctx;

        if (this.selectedPos) {
            const [cx, cy] = this.posToScreen(this.selectedPos);
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(18, this.cellSize * 0.45), 0, Math.PI * 2);
            ctx.strokeStyle = SELECTED_COLOR;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        if (this.state === STATE.MOVING) {
            for (const pos of this.board.getValidMoves(this.currentPlayer, this.selectedPos)) {
                const [cx, cy] = this.posToScreen(pos);
                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(8, this.cellSize * 0.2), 0, Math.PI * 2);
                ctx.strokeStyle = HIGHLIGHT_COLOR;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        if (this.state === STATE.FLIPPING) {
            const colors = ['#00c8ff', '#ff00ff', '#00ff80', '#ff8000'];
            for (let i = 0; i < this.pendingFlipGroups.length; i++) {
                const col = colors[i % colors.length];
                const w = this.selectedFlipGroup === i ? 6 : 3;
                for (const [pos, _] of this.pendingFlipGroups[i].flips) {
                    const [cx, cy] = this.posToScreen(pos);
                    ctx.beginPath();
                    ctx.arc(cx, cy, Math.max(18, this.cellSize * 0.45), 0, Math.PI * 2);
                    ctx.strokeStyle = col;
                    ctx.lineWidth = w;
                    ctx.stroke();
                }
            }
        }

        if (this.state === STATE.CHAIN_FLIPPING) {
            const triggers = this.chainHandler.getTriggers();
            const selTrig = this.chainHandler.selectedTrigger;
            const groups = this.chainHandler.getAvailableGroups();
            const selIdx = this.chainHandler.getSelectedGroup();

            for (const pos of triggers) {
                const [cx, cy] = this.posToScreen(pos);
                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(22, this.cellSize * 0.55), 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
                const color = this.currentPlayer === 1 ? PLAYER1_COLOR : PLAYER2_COLOR;
                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(12, this.cellSize * 0.3), 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(22, this.cellSize * 0.55), 0, Math.PI * 2);
                ctx.strokeStyle = HIGHLIGHT_COLOR;
                ctx.lineWidth = 6;
                ctx.stroke();
            }

            if (selTrig !== null && groups.length > 0) {
                const colors = ['#00c8ff', '#ff00ff', '#00ff80', '#ff8000'];
                for (let i = 0; i < groups.length; i++) {
                    const col = colors[i % colors.length];
                    const w = selIdx === i ? 6 : 3;
                    for (const [pos, _] of groups[i].flips) {
                        const [cx, cy] = this.posToScreen(pos);
                        ctx.beginPath();
                        ctx.arc(cx, cy, Math.max(18, this.cellSize * 0.45), 0, Math.PI * 2);
                        ctx.strokeStyle = col;
                        ctx.lineWidth = w;
                        ctx.stroke();
                    }
                }
            }
        }
    }

    updateUI() {
        const currentTurnEl = document.getElementById('current-turn');
        const scoreEl = document.getElementById('score');
        const messageEl = document.getElementById('message');
        const instructionEl = document.getElementById('instruction');
        const countdownEl = document.getElementById('countdown');
        const btnConfirm = document.getElementById('btn-confirm');
        const btnSkip = document.getElementById('btn-skip');
        const btnUndo = document.getElementById('btn-undo');
        const btnRestart = document.getElementById('btn-restart');
        const btnBack = document.getElementById('btn-back');

        if (!currentTurnEl) return; // 防止未加载完成

        if (this.state === STATE.GAME_OVER) {
            let winner;
            let isForceSettle = false;
            let p1Count, p2Count;

            if (this.forceSettleWinner) {
                // 强制结算
                isForceSettle = true;
                winner = this.forceSettleWinner;
                p1Count = this.forceSettleP1Count;
                p2Count = this.forceSettleP2Count;
            } else {
                // 正常结束
                p1Count = this.board.countPieces(1);
                p2Count = this.board.countPieces(2);

                if (p1Count === 0) winner = 2;
                else if (p2Count === 0) winner = 1;
                else winner = this.currentPlayer === 1 ? 2 : 1;
            }

            currentTurnEl.textContent = '';
            if (isForceSettle) {
                messageEl.textContent = `僵局！连续20步无翻转，玩家${winner}获胜（红${p1Count}vs蓝${p2Count}）`;
            } else {
                messageEl.textContent = `玩家${winner}获胜！`;
            }
            messageEl.className = winner === 1 ? 'red' : 'blue';
            btnConfirm.style.display = 'none';
            btnSkip.style.display = 'none';
            btnUndo.style.display = 'none';
            instructionEl.style.display = 'none';
            countdownEl.style.display = 'none';
            btnRestart.style.display = 'inline-block';
            btnBack.style.display = 'inline-block';
        } else {
            let pName = `玩家${this.currentPlayer}`;
            if (this.gameMode === 'pve' && this.currentPlayer === 2) pName = 'AI';

            let msg = '';
            if (this.state === STATE.SELECTING) msg = `${pName} - 选择棋子`;
            else if (this.state === STATE.MOVING) msg = `${pName} - 移动`;
            else if (this.state === STATE.FLIPPING) msg = `${pName} - 选择翻转`;
            else if (this.state === STATE.CHAIN_FLIPPING) msg = `${pName} - 连锁翻转`;

            currentTurnEl.textContent = msg;
            currentTurnEl.className = this.currentPlayer === 1 ? 'red' : 'blue';

            const p1Count = this.board.countPieces(1);
            const p2Count = this.board.countPieces(2);
            scoreEl.textContent = `红:${p1Count} 蓝:${p2Count}`;

            messageEl.textContent = '';
            messageEl.className = '';

            if (this.state === STATE.FLIPPING || this.state === STATE.CHAIN_FLIPPING) {
                btnConfirm.style.display = 'inline-block';
                btnSkip.style.display = 'inline-block';
                instructionEl.style.display = 'block';
                instructionEl.textContent = '【翻转操作方法：点黄色高亮己方→点要翻转敌方→点确定】';
            } else {
                btnConfirm.style.display = 'none';
                btnSkip.style.display = 'none';
                instructionEl.style.display = 'none';
            }

            // 显示强制结算倒计时
            if (this.noFlipStepCount > 0) {
                countdownEl.style.display = 'block';
                if (this.noFlipStepCount === 1) {
                    countdownEl.textContent = `⚠️ 上一步无翻转，请注意！还剩19步将强制结算！`;
                } else {
                    countdownEl.textContent = `⚠️ 连续${this.noFlipStepCount}步无翻转，还剩${20 - this.noFlipStepCount}步将强制结算！`;
                }
            } else {
                countdownEl.style.display = 'none';
            }

            // 悔棋按钮：只在玩家回合且AI没有思考时显示
            if ((this.gameMode === 'pvp' || (this.gameMode === 'pve' && this.currentPlayer === 1)) &&
                this.history.length > 1) {
                btnUndo.style.display = 'inline-block';
            } else {
                btnUndo.style.display = 'none';
            }

            // 重开和返回主菜单按钮一直显示
            btnRestart.style.display = 'inline-block';
            btnBack.style.display = 'inline-block';
        }
    }
}

const game = new Game();
