# Build My React

## 极简版mini-react.js

### 简介

一个极简版的react实现，实现了react的核心逻辑，项目参考pomber的开源项目didact

### 实现功能

1. Render DOM elements
2. Element creation and JSX
3. Virtual DOM and reconciliation
4. Components and State
5. Fiber: Incremental reconciliation
6. Hooks：useState Hooks

## 升级版big-react

### 简介

一个升级版的react实现，实现 React v18 的核心功能，项目参考BetaSu的开源项目big-react

react源码执行流程导图https://www.processon.com/view/link/6306264d07912906e3a06bae

### 实现功能

1. 插入单节点的 mount 流程
2. useState 的 mount 时流程
3. 实现单节点 update，包括如下功能：
   - 浏览器环境 DOM 的删除（比如 h3 变为 p，那么就要经历删除 h3、插入 p）
   - 插入单节点的 reconcile 流程（包括 HostComponent、HostText）
   - 删除节点的 reconcile 流程（为后续 ref、useEffect 特性做准备，实现的比较完备）
   - Hooks 架构 update 时实现
4. 实现事件系统，包括如下功能：
   - 事件模型
   - onClick 事件支持（以及 onClickCapture 事件）
5. 实现了多节点 reconcile 流程（Diff 算法），包括如下功能：
   - 插入多节点的 mount 流程
   - 插入多节点的 reconcile 流程
   - 浏览器环境 DOM 的移动
6. 实现了基础功能的 Lane 模型，可以调度同步更新，并基于此实现了 batchedUpdates（批处理），包括如下功能：
   - Lane 模型
   - 带优先级的 Update 机制
   - Legacy 调度流程（包含 batchedUpdates）
7. 实现了 useEffect，为了实现 useEffect 回调的异步调度，引入了官方的 scheduler  模块。当前 scheduler 模块的生产环境版本放在 packages 目录下，方便对他进行修改。如果后期证实没有需要特别修改的地方，会考虑以 NPM 包的形式引入 scheduler。包括如下功能：
   - useEffect 实现
