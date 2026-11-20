# Inkprint

> AI writes its own. I write mine.
>
> AI 写的是 AI 的，我写的才是我的。

Inkprint 是一个移动端优先的 Obsidian 日记插件。它把随手记录、Markdown checkbox、来日清单、标签、统计和 Vault 文件管理放在同一个主视图里，同时保持 Markdown 为标准数据源。

## 当前能力

- 从日期下方直接写 Daily 记录。
- 已发送的 Inkprint 记录可回到输入框原位编辑，保持时间与块 ID 不变。
- `Enter` 保存记录，`Shift+Enter` 插入换行，并兼容中文输入法组合状态。
- 将任意记录生成可分享的 PNG 卡片，保存到 `Attachments/`。
- 从来日清单新建标准 Markdown 待办，并直接勾选回写。
- 在来日清单中按本周、本月或全部查看完成率与逾期情况。
- 用“未来待办”选择日期并写入 `@YYYY-MM-DD`，到指定日期重新浮现。
- 输入框可直接选择并关联其他 Daily 记录或长文，自动插入 Obsidian block link。
- “未来待办”按钮内置今天、明天、7 天、30 天快捷日期和完整月历。
- 从输入框创建独立长文，可选择任意目录，并自动套用该目录的 Template。
- 从 Daily 反向索引 block link，并在“查看关联”中集中展示双向上下文。
- 按标签浏览所有相关记录。
- 在文件总览中浏览文件夹、检测 Template、重命名文件夹、新建或编辑 Markdown。
- 桌面侧栏与手机抽屉共享同一套页面状态。
- 移动端不保留重复的底部 Tab Bar；“回到今天”位于顶部工具栏。
- 使用 Obsidian 1.13+ 声明式插件设置 API。

## 数据位置

默认路径可在插件设置中修改：

| 内容 | 默认路径 |
| --- | --- |
| Daily | `Daily/YYYY-MM-DD.md` |
| 长文 | `Longform/长文标题.md` |
| 书籍索引 | `Books/` |

Daily 记录包含可读正文、隐藏的 `journal-meta` 元数据和稳定块 ID。普通 checkbox 保持标准 Markdown 写法，可以被 Obsidian 原生搜索和其他插件读取。Inkprint 也会只读识别 Thino/Knomo 常见的 `- HH:mm`、`- HH:mm:ss` 和 `- [ ] HH:mm` 旧日记格式，无需迁移或改写原文件。

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
<Vault>/.obsidian/plugins/inkprint/
```

重启 Obsidian 后在第三方插件中启用“Inkprint”。

## 隐私

当前版本完全本地运行：不包含账号、遥测、远程 AI、广告或网络请求。插件只访问当前 Vault。

## 许可证

Copyright (C) 2026 spikek

本项目使用 GNU General Public License v3.0，完整条款见 [LICENSE](LICENSE)。
