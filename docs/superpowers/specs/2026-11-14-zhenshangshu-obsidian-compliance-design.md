# 枕上书 Obsidian 插件合规架构设计

日期：2026-11-14  
状态：待用户审核  
目标：按 Obsidian Community Plugins 的社区提交要求设计和实现

## 插件身份

- 显示名称：`枕上书`
- 候选插件 ID：`zhenshangshu`
- 名称来源：取自苏轼《枕上》，用于夜晚安静记录的场景。
- 当前官方社区插件清单中未发现 `zhenshangshu` 冲突。
- 最终提交前必须再次检查 ID 唯一性。
- 插件 ID 发布后不再修改。
- 插件 ID 不包含 `obsidian`。

## 发布基线

项目必须使用 Obsidian 官方 Sample Plugin 的开发模式：

- TypeScript 源码。
- esbuild 构建。
- 根目录提供 `manifest.json`。
- Release 包含 `main.js`、`manifest.json` 和 `styles.css`。
- GitHub Release 标签与 Manifest 版本完全一致。
- 版本号严格使用 `x.y.z`。
- 根目录提供 `README.md` 和 `LICENSE`。
- 插件描述不超过 250 个字符、以句号结尾、不使用 emoji。
- 默认不声明快捷键。
- 默认不包含示例插件残留代码。

初始 Manifest 固定以下字段：

- `id`: `zhenshangshu`
- `name`: `枕上书`
- `version`: `0.1.0`
- `minAppVersion`: `1.13.0`
- `description`: `Capture daily notes, check-ins, goals, and reflections directly inside your vault.`
- `isDesktopOnly`: `false`
- `author`: `spikek`

作者署名已确认为 `spikek`。

## 平台兼容

- 插件以移动端和桌面端同时可用为目标，`isDesktopOnly` 为 `false`。
- 不使用 Node.js 的 `fs`、`path`、`os`、`crypto` 等模块。
- 不使用 Electron API。
- 使用 Web Crypto、Obsidian Vault API 和浏览器标准 API 替代桌面专属能力。
- 平台差异通过 `Platform` 判断，不通过 user agent 猜测。
- 不在移动端使用带 lookbehind 的正则，避免旧版 iOS WebView 崩溃。

## 主视图

- 使用 `ItemView` 实现主日记界面。
- 通过 `registerView()` 注册自定义 View。
- View factory 只创建实例，不保存长期 View 实例引用。
- 需要访问视图时使用 `app.workspace.getLeavesOfType()`。
- `onOpen()` 创建界面，`onClose()` 清理资源。
- 不在 `onunload()` 中 detach leaves。
- 第一次打开可以激活日记 View；后续启动是否自动打开由设置决定，不强制劫持用户工作区。
- PC 和手机使用同一 View，通过响应式布局切换侧栏和抽屉。

## 页面与导航

- 主视图内包含日记、内容、打卡、搜索、设置入口。
- 页面切换使用 View 内部状态，不创建多个互相隔离的自定义 View。
- 内容页、打卡页和搜索页共享主视图生命周期。
- 设置最终必须进入 Obsidian 官方插件设置页；应用内快捷入口只作为跳转或快速设置补充。
- 移动端优先复用 Obsidian 原生 `.mobile-navbar`，保留原生搜索、页签数量和菜单。
- 插件只在原生导航中加入自己的菜单入口，并创建单独的圆形新建按钮。
- 原生导航不可用或结构变化时，降级为单个插件悬浮菜单按钮。

## DOM 与安全

- 禁止使用 `innerHTML`、`outerHTML` 和 `insertAdjacentHTML` 处理用户内容。
- 使用 `createEl()`、`createDiv()`、`createSpan()` 和 `setText()`。
- 图标使用 `setIcon()`。
- Markdown 内容通过官方 `MarkdownRenderer` 渲染。
- 用户输入、文件路径、标签和书名不得直接拼接为 HTML。
- 清理 DOM 使用 `empty()`。

## 样式

- 所有样式位于 `styles.css`。
- TypeScript 中不直接设置颜色、背景、边框等视觉样式。
- 优先使用 Obsidian CSS 变量。
- 插件品牌色通过插件根容器的自定义 CSS 变量提供。
- 支持 `.theme-light` 和 `.theme-dark`。
- 不使用 `!important`。
- 不依赖远程字体、远程图标、CDN 样式或运行时下载资源。
- 不使用 Obsidian 商标制造官方插件印象。

## Vault 与数据写入

- 所有路径先经过 `normalizePath()`。
- 读取指定文件使用 `getFileByPath()` 或 `getAbstractFileByPath()`。
- 不遍历全库寻找已知路径。
- 修改当前打开 Markdown 时优先使用 Editor API。
- 后台修改 Markdown 时使用 `Vault.process()`。
- 修改 YAML 属性时使用 `processFrontMatter()`。
- 写入失败时不更新派生索引，不生成误导性的成功状态。
- Markdown 是长期数据源；插件索引可删除、可重建。

## 设置

- 使用 `PluginSettingTab`。
- `minAppVersion` 为 1.13.0 时优先使用声明式 `getSettingDefinitions()`。
- 设置修改后立即保存。
- 简单设置使用单个声明式控件。
- 多个相关值通过 Modal 一次创建，不在同一设置行堆叠多个输入框。
- 设置分组遵循官方 Style Guide：
  - 不显示插件名作为顶部标题。
  - 通用设置位于最上方且不加标题。
  - 后续分组使用 `写作`、`打卡与目标`、`外观`、`高级`。
  - 标题中不重复“设置”。
- 路径控件使用 `folder` 和 `file` 类型，并在数据层再次校验。
- 破坏性操作必须通过 Modal 二次确认。

## 事件与资源清理

- Vault、Workspace 和 DOM 事件使用 `registerEvent()`。
- Interval、Observer 和自定义监听器在 View 关闭时清理。
- 命令使用 `addCommand()`。
- 条件命令使用 `checkCallback` 或 `editorCheckCallback`。
- 不访问 `workspace.activeLeaf`。
- 不保存长期 View 引用。
- 不在默认配置下输出调试日志。

## 隐私与网络

首版采用本地优先：

- 不包含账号。
- 不包含遥测。
- 不包含远程 AI。
- 不包含动态广告。
- 不自动安装或更新依赖。
- 不访问 Vault 以外的文件。
- 不加载远程资源。

如果未来增加网络能力，必须：

- 在 README 中明确说明使用的远程服务及原因。
- 仅在用户主动触发时发起请求。
- 不发送正文、路径、标签或目标数据，除非用户明确操作并知情。

## 搜索与索引

- Markdown 是唯一内容来源。
- 插件索引只包含搜索结果和派生统计所需的信息。
- 插件启动后按需建立年度索引，并监听 Daily 文件变化增量更新。
- 索引损坏时可完整重建。
- 搜索索引不进入 Git，也不上传到网络。
- 长文、书籍和 Daily 的内容可以通过 `type`、稳定 ID 和日期区分。

## 移动端

- 使用 `app.emulateMobile(true)` 进行开发验证。
- 检查安全区、软键盘、触控大小和抽屉焦点。
- 抽屉打开时主内容不可交互；关闭后焦点回到入口。
- 手机输入框保持原生焦点和中文输入法行为。
- 手机日期格和输入区使用真实布局，不使用覆盖式假连接线。
- 原生移动导航采用透明玻璃样式，并提供“减少透明效果”的降级模式。
- 原生搜索、页签数量和菜单由 Obsidian 管理，插件不得伪造其状态。
- 对原生导航的 DOM 接入必须包含能力检测、事件解绑和结构变化降级。
- 圆形 `+` 按钮的行为固定为：关闭搜索与抽屉、切回今天、滚动到今天输入区并聚焦。
- `+` 不创建第二套 Composer，始终复用当前日期下方的同一个输入框。

## 测试与验证

提交前至少完成：

1. TypeScript 类型检查。
2. ESLint 检查。
3. 单元测试：路径规范化、元数据解析、进度去重、标签解析。
4. Vault 集成测试：Daily 写入、frontmatter 更新、索引重建。
5. 桌面 View 生命周期测试。
6. `app.emulateMobile(true)` 移动端布局与键盘测试。
7. 明暗主题和自定义主题测试。
8. 构建产物包含 `main.js`、`manifest.json`、`styles.css`。
9. 禁用插件后无残留事件、定时器和 View 引用。

## 发布流程

1. README 说明用途、安装、使用和隐私行为。
2. LICENSE 明确许可证。
3. 更新 `manifest.json` 版本。
4. 创建与版本号一致的 Git 标签。
5. GitHub Actions 构建并创建 Release。
6. Release 上传 `main.js`、`manifest.json`、`styles.css`。
7. 登录 `community.obsidian.md` 并关联 GitHub。
8. 提交插件并处理自动审核反馈。
9. 后续更新通过 GitHub Release 分发。

## 许可证约束

- 本项目采用 GNU General Public License v3.0。
- 根目录必须包含完整的 GPL-3.0 `LICENSE` 文件。
- `README.md` 必须明确说明项目使用 GPL-3.0，并保留版权与来源声明。
- knomo 同样采用 GPL-3.0；仍然优先保持原创实现，任何复用代码都必须按 GPL-3.0 和原项目要求署名。

## 验收标准

- 插件能在桌面端和移动端加载。
- 不使用 Node.js 与 Electron API。
- View 生命周期和事件清理符合 Obsidian 规范。
- 用户内容渲染不经过不安全的 HTML 注入。
- 设置页符合 Obsidian 1.13 声明式设置 API。
- Markdown 写入采用原子 API。
- 所有样式可通过主题和 CSS 片段覆盖。
- 项目具备可构建、可打标签、可发布的结构。
