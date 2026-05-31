# 气象实况可视化 — 前端 AI-Travel-Decision-Platform

基于 Vue 3 + Vite + TypeScript 的气象实况可视化应用，集成高德地图 3D 渲染与 ECharts 图表展示。图表 option 由服务端生成，通过 SSE 实时推送。

## 部分功能展示：

![](C:\Users\蒙仲毅\Pictures\联想截图\联想截图_20260531212947.png)

![联想截图_20260531213007](C:\Users\蒙仲毅\Pictures\联想截图\联想截图_20260531213007.png)

![联想截图_20260531213111](C:\Users\蒙仲毅\Pictures\联想截图\联想截图_20260531213111.png)

## 技术栈

| 层级     | 技术                                      | 版本    |
| -------- | ----------------------------------------- | ------- |
| 框架     | Vue 3 (Composition API, `<script setup>`) | ^3.5.25 |
| 构建     | Vite                                      | ^7.2.4  |
| 语言     | TypeScript (严格模式)                     | ~5.9.0  |
| 状态管理 | Pinia (Composition API)                   | ^3.0.4  |
| 图表     | ECharts                                   | ^6.0.0  |
| 地图     | 高德地图 JS API + Three.js 3D             | 0.152.2 |
| HTTP     | Axios                                     | ^1.13.2 |
| 图标     | qweather-icons + 本地 PNG                 | ^1.8.0  |
| 测试     | Vitest + jsdom + @vue/test-utils          | ^4.0.14 |
| 代码检查 | ESLint (flat config) + Prettier           | —       |

## 环境变量配置

项目 API Key 已从源码抽离到环境变量，**不要直接修改源码**，请创建 `.env` 文件（已提供 `.env.example` 作为模版）：

```bash
# 复制模版创建 .env 文件
cp .env.example .env
# Windows: copy .env.example .env
```

然后填入你的高德地图 Key：

```env
VITE_AMAP_KEY=你申请的高德地图Web端Key
VITE_AMAP_SECURITY_CODE=对应的安全密钥
```

> 高德地图 Key 从 [高德开放平台](https://console.amap.com/) 申请（应用 → 添加 Key → Web端 JS API）。

## 后端：

https://github.com/mengzhongyi11/AI-Travel-Decision-Platform_Backend.git

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（需同时启动后端）
npm run dev              # localhost:5173

# 类型检查
npm run type-check

# 构建
npm run build

# 单元测试
npm run test:unit

# 代码检查/格式化
npm run lint
npm run format
```

> 前端依赖后端 weather-nodejs（localhost:3001），请先配置好后端 `.env` 并启动。

## 目录结构

```
src/
├── main.ts                    # 入口：创建 Pinia + 挂载 App
├── App.vue                    # 根组件：地图 + 天气面板叠层
├── components/
│   ├── gaodeMap.vue           # 高德地图容器（3D/2D 切换、定位、路线规划、天气图层）
│   ├── weather-data.vue       # 天气数据主面板（SSE 订阅 + 聚合数据初始加载）
│   ├── dailyEcharts.vue       # 7 天预报折线图（接收服务端 option/schema）
│   ├── nowEcarts.vue          # 逐小时 4 面板图表（接收服务端 options/schemas）
│   ├── showData.vue           # 路线规划天气对比面板
│   ├── showMap.vue            # 路线规划输入（起点/途经点/终点）
│   ├── mapTile.vue            # 天气图层切换（降水/温度/云图）
│   ├── openAI.vue             # AI 旅行助手聊天界面（流式 Markdown 渲染）
│   └── app.vue                # （未使用的空组件）
├── stores/
│   ├── map.ts                 # useAddress（地址/定位）+ useMap（面板显隐）
│   ├── from.ts                # useCollect（AI 上下文数据采集）
│   └── charts.ts              # useChartStore（服务端图表 option + SSE 状态）
├── utils/
│   ├── axios.ts               # HTTP 请求封装（baseURL localhost:3001）
│   ├── echarts.ts             # ECharts init 工具函数
│   ├── chartPool.ts           # ECharts 实例池（acquire/update/release/resizeAll）
│   ├── apiClient.ts           # fetchChartConfig / fetchChartSchema / fetchAggregateWeather
│   ├── sseClient.ts           # SSE 连接管理器（connect → Pinia store）
│   ├── schemaRenderer.ts      # ChartSchema → EChartsOption 渲染引擎
│   ├── chartResponsive.ts     # 响应式断点补丁工具
│   ├── tooltipPatcher.ts      # 客户端注入 tooltip formatter（兼容保留）
│   ├── icon.ts                # 天气图标映射
│   ├── mapThree.ts            # Three.js 3D 地形/水面/植被
│   └── tileWorker.ts          # 瓦片预加载 Web Worker
├── types/
│   └── chartSchema.ts         # ChartSchema 类型定义
├── __tests__/
│   └── App.spec.ts            # 组件冒烟测试
└── shims-amap.d.ts            # AMap 全局类型声明
```

## 架构要点

### 数据流

```
用户 → 高德地图（定位/选点）
  → useAddress store 更新 address
  → weather-data.vue watch 触发
    ├── 初始：axios → /weather/aggregate（聚合+缓存）→ 展示实况/7天卡片
    └── SSE 连接：EventSource → /api/stream?city=xxx
        → 服务端聚合 QWeather + 生成 option
        → 推送 chartUpdate / nowUpdate 事件
        → useChartStore 更新
        → 组件通过 chartPool 渲染
```

### ECharts 实例池

```typescript
chartPool.acquire(key, dom) // 获取/创建实例
chartPool.update(key, option) // setOption
chartPool.release(key) // dispose + 删除
chartPool.resizeAll() // 全部 resize
chartPool.get(key) // 获取原始实例（用于响应式补丁）
```

### Chart Schema（服务端配置驱动）

组件同时支持两种数据源：

| prop           | 类型                    | 说明                                                                                 |
| -------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `chartOption`  | `EChartsOption \| null` | 服务端直接返回的 ECharts option                                                      |
| `schemaOption` | `ChartSchema \| null`   | 服务端返回的数据描述，由 `schemaRenderer` 自动转为 option（含 tooltip/symbolRotate） |

`schemaOption` 优先级高于 `chartOption`。

### 响应式断点

容器宽度变化时自动调整图表属性：

| 属性        | < 300px | 300-500px | > 700px |
| ----------- | ------- | --------- | ------- |
| 标题        | 隐藏    | 10px      | 14px    |
| label       | 8px     | 10px      | 12px    |
| grid bottom | 28%     | 24%       | 15%     |

## 开发命令

```bash
npm run dev          # 启动开发服务器
npm run type-check   # TypeScript 类型检查
npm run build        # 类型检查 + 构建
npm run test:unit    # 运行测试
npm run lint         # ESLint 检查
npm run format       # Prettier 格式化
```
