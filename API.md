# Flip Board Game API 文档

该项目已新增后端 API，方便 AI 或其他客户端直接调用棋局计算、合法走法和 AI 落子。

## 启动服务器

在项目根目录运行：

```bash
node server.js
```

如果你愿意，也可以通过 `npm start` 启动：

```bash
npm start
```

默认监听：

```
http://localhost:3000
```

## 通用说明

- 请求头：`Content-Type: application/json`
- 允许跨域请求：`Access-Control-Allow-Origin: *`
- 棋盘表示：7x7 二维数组，`0` 表示空位，`1` 表示红方，`2` 表示蓝方。
- 玩家编号：`1` 表示红方，`2` 表示蓝方。

## 1. GET /api/ping

用于测试服务是否存活。

### 请求

```http
GET /api/ping HTTP/1.1
Host: localhost:3000
```

### 响应

```json
{
  "status": "ok",
  "timestamp": "2026-05-18Txx:xx:xx.xxxZ"
}
```

## 2. GET /api/game/new

返回一个初始游戏棋盘状态。

### 请求

```http
GET /api/game/new HTTP/1.1
Host: localhost:3000
```

### 响应

```json
{
  "board": [
    [2,2,2,2,2,2,2],
    [2,2,2,2,2,2,2],
    [0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1]
  ],
  "currentPlayer": 1
}
```

## 3. POST /api/game/valid-moves

输入当前棋盘和玩家编号，返回该玩家所有合法走法。

### 请求

```http
POST /api/game/valid-moves HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "board": [
    [2,2,2,2,2,2,2],
    [2,2,2,2,2,2,2],
    [0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1]
  ],
  "player": 1
}
```

### 响应

```json
{
  "moves": [
    {
      "from": [0, 5],
      "to": [[0, 4], [1, 4], ...]
    },
    {
      "from": [1, 5],
      "to": [[1, 4], [2, 4], ...]
    }
  ]
}
```

### 说明

- `from` 表示出发点位置。
- `to` 为该出发点的所有合法目标位置。

## 4. POST /api/ai/move

AI 计算当前局面的最佳落子，并返回下一步棋、翻转结果和更新后的棋盘。

### 请求

```http
POST /api/ai/move HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "board": [
    [2,2,2,2,2,2,2],
    [2,2,2,2,2,2,2],
    [0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1]
  ],
  "player": 1,
  "difficulty": "easy"
}
```

### 响应

```json
{
  "move": {
    "from": [3, 6],
    "to": [3, 4]
  },
  "initialFlipGroups": [],
  "selectedGroupIndex": null,
  "appliedGroups": [],
  "chainHistory": [],
  "board": [
    [2,2,2,2,2,2,2],
    [2,2,2,2,2,2,2],
    [0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0],
    [0,0,0,1,0,0,0],
    [1,1,1,1,1,1,1],
    [1,1,1,0,1,1,1]
  ],
  "status": {
    "gameOver": false,
    "winner": null,
    "reason": null,
    "counts": {
      "player1": 14,
      "player2": 14
    },
    "mobility": {
      "player1": true,
      "player2": true
    }
  }
}
```

### 响应字段说明

- `move`：AI 选择的落子位置。
- `initialFlipGroups`：该落子可选的初始翻转组列表。
- `selectedGroupIndex`：AI 选中的初始翻转组索引。
- `appliedGroups`：最终实际应用的翻转组。
- `chainHistory`：连锁翻转过程中每一步的触发位置、组和翻转棋子。
- `board`：应用落子和翻转后的棋盘状态。
- `status`：当前局面状态。

### `status` 字段说明

- `gameOver`：是否结束。
- `winner`：胜者编号，`1`、`2` 或 `null`。
- `reason`：结束原因，例如 `piece_count` 或 `blocked_player`。
- `counts`：各方棋子数量。
- `mobility`：双方是否还有可走法。

## AI 难度说明

- `easy`：VerySimpleAI，简单策略。
- `medium`：GreedyAI，贪心策略。
- `hell`：SimpleAI，Minimax 深度 3。

## 示例 cURL

### 1. ping

```bash
curl http://localhost:3000/api/ping
```

### 2. 获取初始棋局

```bash
curl http://localhost:3000/api/game/new
```

### 3. 查询合法走法

```bash
curl -X POST http://localhost:3000/api/game/valid-moves \
  -H "Content-Type: application/json" \
  -d '{"board":[[2,2,2,2,2,2,2],[2,2,2,2,2,2,2],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1]],"player":1}'
```

### 4. 让 AI 落子

```bash
curl -X POST http://localhost:3000/api/ai/move \
  -H "Content-Type: application/json" \
  -d '{"board":[[2,2,2,2,2,2,2],[2,2,2,2,2,2,2],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1]],"player":1,"difficulty":"easy"}'
```

## 进一步集成建议

- AI 端可先调用 `GET /api/game/new` 获取初始棋盘。
- 由 AI 端维护棋盘状态，并在每次出棋后调用 `POST /api/ai/move`。
- 如果需要自行计算合法走法，可直接调用 `POST /api/game/valid-moves`。
- 若需对接更复杂 AI，可在客户端先计算落子候选，再通过该 API 计算标准结果。
