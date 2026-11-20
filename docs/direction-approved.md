# Inkprint design direction

## Approved direction

Quiet Ink, derived from the existing flomo/Knomo writing-first direction and reviewed
against Apple HIG. The writer and the written record are the primary content; navigation
and controls recede.

## User decision

> 根据这个 Apple HIG 的设计规范，看一下我们这个插件是否可以现在做一个新的设计改动。

> 我现在感觉这个输入框做得有点让人感觉突兀，不然还是把它包裹在我们当前的周日期的下面得了。
> 还是按之前那种做法，我们不要再有那种连线了。

> 我觉得输入区不要加滚动条，就让它写吧，写多少，让输入框自己往下延伸就好了。

> 我觉得这个输入框这样改完之后不是特别好用啊。

This is an iteration within the already approved direction, not a new visual-direction
selection. The current change keeps Quiet Ink and improves the composer's affordance,
progressive disclosure, hit areas, focus behaviour, and save feedback.

## Constraints

- Mobile is the primary surface; desktop keeps a writing-only journal page without a calendar.
- The three configured prompt tags remain available by default.
- The input grows with its content and does not gain an internal scrollbar.
- Prefer Obsidian semantic colour variables so light, dark, and increased-contrast themes remain supported.
- Do not turn the composer back into a heavy card or introduce a separate page.
