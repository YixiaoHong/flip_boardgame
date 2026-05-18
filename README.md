# 翻转棋 - 网页版

这是一个可以在浏览器中直接运行的翻转棋游戏，支持手机触摸操作！

## 文件说明

- `index.html` - 网页入口
- `game.js` - 完整的游戏逻辑（JavaScript版）

## 如何在本地运行

直接用浏览器打开 `index.html` 即可游玩！

## 如何部署到 GitHub Pages

### 方法1：新建仓库部署

1. 在 GitHub 上新建一个仓库
2. 将 `index.html` 和 `game.js` 上传到仓库
3. 进入仓库的 Settings -> Pages
4. 在 Build and deployment 中，Source 选择 Deploy from a branch
5. 选择 main 分支和根目录，点击 Save
6. 等待几分钟，页面就可以通过 `https://你的用户名.github.io/仓库名` 访问了！

### 方法2：上传到现有仓库

如果你已经有这个游戏的仓库了：

1. 将 `web` 文件夹里的内容上传到仓库的 `docs` 文件夹或根目录
2. 在 Settings -> Pages 中选择对应的文件夹即可

## 游戏特色

- 📱 适配手机触摸操作
- 🎮 支持双人对战和人机对战
- 📖 内置完整游戏规则说明
- 🔄 连锁翻转功能
- 🎯 中间X形区域增强策略性

## 手机适配

- 响应式设计，自动适应屏幕大小
- 优化的触摸区域大小
- 支持单指操作

## AI 对战 Request API

项目已新增后端接口，方便 AI 直接调用棋局计算和 AI 落子。

详细文档请查看 [API.md](API.md)。

### 启动服务器

```bash
node server.js
```

### 可用接口

- `GET /api/ping`
  - 测试服务是否可用。

- `GET /api/game/new`
  - 返回初始棋盘状态。
  - 响应：`{ board, currentPlayer: 1 }`

- `POST /api/game/valid-moves`
  - 输入当前棋盘和玩家，返回所有合法走法。
  - 请求示例：
    ```json
    {
      "board": [[0,0,2,...], ...],
      "player": 1
    }
    ```

- `POST /api/ai/move`
  - 输入当前棋盘、玩家和难度，返回 AI 落子结果和最终棋盘。
  - 请求示例：
    ```json
    {
      "board": [[0,0,2,...], ...],
      "player": 2,
      "difficulty": "easy"
    }
    ```

### AI 难度

- `easy`：VerySimpleAI
- `medium`：GreedyAI
- `hell`：SimpleAI（Minimax 深度 3）

祝你玩得开心！
