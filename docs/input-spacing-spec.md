# Inkprint input spacing

## Reference principles

- flomo's official Quick Input guidance describes the composer as a chat-like input
  surface: one place to capture a thought, without titles or layout decisions, while
  keeping recording pressure low.
- Knomo's composer uses a single input surface, a compact tool row below it, and one
  prominent trailing action. Controls stay visibly attached to the text they operate on.
- Apple HIG `Layout` calls for related items to be grouped, aligned, and progressively
  disclosed. `Text views` recommends sizing multiline editing to its content.

## Inkprint scale

The composer uses a strict 4-point rhythm:

- `4px`: inside a control or between tightly related icons.
- `8px`: between rows within the composer.
- `12px`: outer vertical padding and separation between action groups.
- `32px`: desktop control height.
- `44px`: mobile touch target.

The journal composer is intentionally borderless. Its top and bottom padding are equal,
the writing surface consumes available height, and the prompt tags and actions form one
quiet footer rather than three independent shelves.

## Shared control height

Desktop prompt tags, tool buttons, and the save action share one 32px control height.
Mobile prompt tags, tool buttons, and the save action share one 44px touch target.
This keeps their baselines visually aligned without making every control look equally
prominent.
