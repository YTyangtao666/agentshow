# AgentShow

> AI-powered product demo and tour tool — first time explored by AI, every time after replayed deterministically.

AgentShow 是一个开发者工具，让你在真实运行的 Web 应用上生成、播放和分享 AI 驱动的产品演示。

## 核心能力

- **AI 生成操作计划**：输入自然语言意图，AI 自动扫描页面 DOM 并规划操作步骤
- **确定性回放**：首次由 AI 探索，之后每次都逐字节一致地回放（Plan 缓存 + Selector 自愈）
- **演出效果**：虚拟光标、聚光灯、旁白气泡、打字机效果——让观众看懂每一步
- **Plan 即测试**：每个步骤支持 assert 断言，演示计划可直接作为 E2E 测试运行

## 项目结构

```
agentshow/
├── packages/
│   ├── cli/          # @agentshow/cli — 命令行工具 (init/start/stop)
│   ├── server/       # @agentshow/server — WebSocket 服务 + LLM 调度
│   ├── widget/       # @agentshow/widget — 注入页面的悬浮 UI
│   ├── core/         # @agentshow/core — 共享类型、工具函数
│   └── shared/       # 跨包共享的 Playbook Schema
├── docs/             # 设计文档
└── package.json      # npm workspaces 根配置
```

## 技术栈

- **语言**：TypeScript（strict 模式）
- **运行时**：Node.js 22+
- **包管理**：npm workspaces
- **测试**：Vitest
- **LLM**：OpenAI-compatible 端点（DeepSeek / GLM / Ollama）

## 快速开始

```bash
# 安装依赖
npm install

# 在你的项目中初始化
npx agentshow init

# 启动演示服务
npx agentshow start
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/YTyangtao666/agentshow.git
cd agentshow

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm run test
```

## License

MIT
