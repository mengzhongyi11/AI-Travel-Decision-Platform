## GitHub Copilot / AI Agent 指南

目标：帮助 AI 编码代理快速理解并在此仓库中安全、高效地修改代码。

- **项目类型**：Vue 3 + Vite 前端应用，使用 TypeScript（部分 .ts/.vue），状态管理为 Pinia，单元测试使用 Vitest。
- **运行环境**：Node >= 20.19.0 或 >=22.12.0（参见 package.json 的 `engines`）

**快速命令**
- 安装依赖：`npm install`
- 本地开发（热重载）：`npm run dev`
- 构建生产包：`npm run build`（内部先跑 `vue-tsc`）
- 本地预览：`npm run preview`
- 运行单元测试：`npm run test:unit`
- 类型检查：`npm run type-check`（使用 `vue-tsc`）
- 格式化：`npm run format`，修复 ESLint：`npm run lint`

**项目大局（快速导航）**
- 入口与挂载：`src/main.ts`（创建 Vue 应用并挂载）
- 页面结构：`src/App.vue`（包含 `gaodeMap` 与 `weather-data` 两个主要组件）
- 地图实现：查看 [src/components/gaodeMap.vue](src/components/gaodeMap.vue)（高德地图相关逻辑）
- 天气数据面板：查看 [src/components/weather-data.vue](src/components/weather-data.vue)
- 全局状态：Pinia 存放在 [src/stores/map.ts](src/stores/map.ts)（`defineStore('address', ...)`）
- HTTP 与第三方：网络封装在 [src/utils/axios.ts](src/utils/axios.ts)，接口代理在 `vite.config.ts` 的 `server.proxy` 中配置（以 `/api` 代理到 qweather）
- 大资源文件：`src/utils/echarts.js` 为打包的 ECharts 包，通常**不要**直接修改该文件，改用依赖或替换为模块化引入。

**代码风格与约定（可自动化使用示例）**
- `.vue` 文件使用 `<script setup lang="ts">`，编辑时保持类型声明与 `vue-tsc` 一致。
- 路径别名：`@` -> `src`，参见 `vite.config.ts`，使用 `@/components/...` 导入。
- 状态管理：使用 Pinia 的组合式 `defineStore`（见 `src/stores`），修改状态请通过 store 暴露的函数。
- 外部依赖：高德地图类型由 `@amap/amap-jsapi-types` 提供；若添加地图 API 调用，优先依赖官方类型包。

**测试与快速验证**
- 单测使用 Vitest 与 `@vue/test-utils`，参考 `src/__tests__/App.spec.ts`。
- 本地修改后推荐顺序：`npm run lint` → `npm run type-check` → `npm run test:unit` → `npm run dev`（手工验证 UI）。

**编辑与 PR 建议（对 AI 的具体限制）**
- 不要改动或删除第三方/打包文件（例如 `src/utils/echarts.js`）—若需升级依赖，建议修改 `package.json` 并运行构建。
- 对地图或天气业务逻辑修改时，优先修改对应组件（`src/components/gaodeMap.vue` / `src/components/weather-data.vue`）和 store（`src/stores/map.ts`）。
- 保持导入写法使用别名 `@`，避免相对路径深嵌导致重构成本。
- 提交变更前，确保 `npm run type-check` 通过且单元测试没有回归。

如果本文件有遗漏或需要更详细的工作流程（如 CI、发布策略），请告诉我要补充的具体点，我会迭代更新。
