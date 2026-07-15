# AgentShow

> AI-powered product demo and tour tool — first time explored by AI, every time after replayed deterministically.

AgentShow 是一个开发者工具，让你在真实运行的 Web 应用上生成、播放和分享 AI 驱动的产品演示。用户输入自然语言指令，AgentShow 自动扫描页面 DOM、规划操作步骤、执行并展示视觉特效。

## 核心能力

- **AI 生成操作计划**：输入自然语言意图，AI 自动扫描页面 DOM 并规划操作步骤
- **确定性回放**：首次由 AI 探索，之后每次都逐字节一致地回放（Plan 缓存 + Selector 自愈）
- **演出效果**：高亮、涟漪、旁白气泡——让观众看懂每一步
- **Demo 模式**：无 API Key 时自动降级为关键词匹配引擎，开箱即用

## 架构

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌───────────────┐   ┌────────────────────────┐ │
│  │  Target App   │◄──│  Widget (Shadow DOM)   │ │
│  │  (your page)  │   │  Chat UI + DOM Scanner │ │
│  └───────────────┘   │  + Action Executor     │ │
│                      └───────────┬────────────┘ │
│                                  │ WebSocket     │
└──────────────────────────────────┼──────────────┘
                                   │
┌──────────────────────────────────┼──────────────┐
│                        Server (Node.js)          │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ WS Server│  │  Planner  │  │  Plan Cache  │ │
│  │          │  │  (LLM /   │  │  (file-based)│ │
│  │          │  │  Demo)    │  │              │ │
│  └──────────┘  └───────────┘  └──────────────┘ │
└─────────────────────────────────────────────────┘
```

## 项目结构

```
agentshow/
├── packages/
│   ├── cli/          # @agentshow/cli — 命令行工具 (init/start/stop)
│   ├── server/       # @agentshow/server — WebSocket 服务 + LLM 调度
│   ├── widget/       # @agentshow/widget — 注入页面的 Shadow DOM 悬浮 UI
│   ├── core/         # @agentshow/core — 选择器生成、缓存 key、安全校验
│   └── shared/       # @agentshow/shared — 跨包共享类型契约
├── scripts/
│   └── dev-server.ts  # 开发服务器启动脚本
└── package.json       # npm workspaces 根配置
```

## 技术栈

- **语言**：TypeScript（strict 模式）
- **运行时**：Node.js 20+
- **包管理**：npm workspaces
- **Widget 打包**：tsup（IIFE 格式，浏览器注入）
- **测试**：Vitest
- **LLM**：OpenAI-compatible 端点（DeepSeek / GLM / Ollama）

## 快速开始

### 前置条件

- Node.js 20+
- 一个正在运行的 Web 应用（你的前端开发服务器）

### 安装

```bash
git clone https://github.com/YTyangtao666/agentshow.git
cd agentshow
npm install
```

### 构建 Widget

```bash
npm run build --workspace @agentshow/widget
```

### 配置

在项目根目录创建 `agentshow.config.json`：

```json
{
  "name": "your-app",
  "ai": {
    "provider": "deepseek",
    "apiKey": "${DEEPSEEK_API_KEY}",
    "model": "deepseek-chat"
  },
  "server": {
    "port": 9100,
    "target": "http://localhost:3000",
    "dev": true
  }
}
```

> 如果 `apiKey` 留空或未解析（`${...}` 格式），AgentShow 会自动降级为 Demo 模式，使用关键词匹配生成操作计划。

### 启动服务

```bash
# 方式一：使用 CLI
npx tsx packages/cli/src/index.ts init
npx tsx packages/cli/src/index.ts start

# 方式二：直接启动 dev server
npm run dev
```

启动后会输出：

```
[AgentShow] Server running on port 9100
[AgentShow] Widget: http://localhost:9100/widget.js
[AgentShow] Health: http://localhost:9100/health
```

### 注入 Widget 到你的页面

在浏览器的控制台（或你的 HTML 模板）中执行：

```html
<script>
  window.__AGENTSHOW__ = { port: 9100, token: "" };
  var s = document.createElement("script");
  s.src = "http://localhost:9100/widget.js";
  document.head.appendChild(s);
</script>
```

右下角会出现 AgentShow 聊天面板。输入自然语言指令（如「点击创建作品」），AgentShow 会自动扫描页面元素、生成操作计划并逐步执行。

## 开发

```bash
# Typecheck（所有包）
npm run typecheck

# 测试
npm test

# 构建 Widget
npm run build --workspace @agentshow/widget

# 验证 Widget 无 Node.js 依赖
grep -c "require(" packages/widget/dist/entry-browser.global.js  # 必须为 0
```

## Demo 模式

当没有 LLM API Key 时，AgentShow 自动降级为 Demo 模式：

1. DOM Scanner 扫描页面所有可交互元素（按钮、链接、输入框）
2. Planner 使用关键词匹配找到与用户意图最相关的元素
3. 生成 highlight + click 操作步骤并执行

这使得 AgentShow 在无需任何外部依赖的情况下即可工作。

## License

[MIT](./LICENSE)
