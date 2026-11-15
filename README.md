# 枕上书

枕上书是一个移动端优先的 Obsidian 日记插件。它把日历、随手记录、OKR 打卡、长文和引用关系放在同一个主视图里，同时保持 Markdown 为标准数据源。

## 当前能力

- 从日期下方直接写 Daily 记录。
- 使用 `Goals/目标树.md` 管理可无限层级的 OKR 树。
- 在 Daily 中写入完成事件和稳定块 ID。
- 从输入框创建独立长文，Daily 保留摘要与返回链接。
- 从 Daily 反向索引长文引用，并在关联详情中集中展示上下文。
- 桌面侧栏与手机抽屉共享同一套页面状态。
- 使用 Obsidian 1.13+ 声明式插件设置 API。

## 数据位置

默认路径可在插件设置中修改：

| 内容 | 默认路径 |
| --- | --- |
| Daily | `Daily/YYYY-MM-DD.md` |
| 目标树 | `Goals/目标树.md` |
| 长文 | `Longform/长文标题.md` |
| 书籍索引 | `Books/` |

Daily 记录包含可读正文、隐藏的 `journal-meta` 元数据和稳定块 ID。目标树使用缩进表示层级，并使用 `#okr/task` 等标签和块 ID 保持可读性。

## 开发

```bash
npm install
npm test
npm run typecheck
npm run build
```

构建产物为根目录下的 `main.js`。发布时需要同时提供：

- `main.js`
- `manifest.json`
- `styles.css`

## 手动安装

将 `main.js`、`manifest.json` 和 `styles.css` 放入：

```text
<Vault>/.obsidian/plugins/zhenshangshu/
```

重启 Obsidian 后在第三方插件中启用“枕上书”。

## 隐私

当前版本完全本地运行：不包含账号、遥测、远程 AI、广告或网络请求。插件只访问当前 Vault。

## 许可证

Copyright (C) 2026 spikek

本项目使用 GNU General Public License v3.0，完整条款见 [LICENSE](LICENSE)。
