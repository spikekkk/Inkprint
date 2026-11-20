import { normalizePath, type Vault } from "obsidian";
import { stripEntryTags } from "../domain/entryDisplay";
import type { DailyEntry } from "../domain/types";
import { t } from "../i18n";

export interface ShareImagePalette {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
}

export interface ShareImageResult {
  path: string;
}

const WIDTH = 720;
const PADDING = 56;
const CONTENT_WIDTH = WIDTH - PADDING * 2;

export async function createEntryShareImage(
  vault: Vault,
  dateKey: string,
  entry: DailyEntry,
  palette: ShareImagePalette,
): Promise<ShareImageResult> {
  const text = toSharePlainText(entry.body, entry.tags);
  const canvas = document.createElement("canvas");
  const scale = 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(t("error.shareUnavailable"));

  const bodyFont = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.font = bodyFont;
  const lines = wrapCanvasText(context, text, CONTENT_WIDTH);
  const bodyHeight = Math.max(64, lines.length * 42);
  const tagHeight = entry.tags.length ? 58 : 0;
  const height = 196 + bodyHeight + tagHeight + 88;
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;

  context.scale(scale, scale);
  context.fillStyle = palette.background;
  context.fillRect(0, 0, WIDTH, height);
  drawRoundedRect(context, 24, 24, WIDTH - 48, height - 48, 24);
  context.fillStyle = palette.surface;
  context.fill();
  context.strokeStyle = palette.border;
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = palette.accent;
  context.font =
    '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const time = entry.createdAt.match(/T(\d{2}:\d{2})/)?.[1] ?? "";
  const editedTime = entry.editedAt?.match(/T(\d{2}:\d{2})/)?.[1] ?? "";
  context.fillText(
    `${dateKey}${time ? ` · ${time}` : ""}${
      editedTime ? ` · ${t("share.editedAt", { time: editedTime })}` : ""
    }`,
    PADDING,
    86,
  );

  context.fillStyle = palette.text;
  context.font = bodyFont;
  context.textBaseline = "top";
  lines.forEach((line, index) => {
    context.fillText(line, PADDING, 124 + index * 42);
  });

  let footerY = 124 + bodyHeight + 8;
  if (entry.tags.length) {
    context.fillStyle = palette.accent;
    context.font =
      '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText(
      entry.tags.map((tag) => `#${tag}`).join("  "),
      PADDING,
      footerY,
    );
  }

  footerY += tagHeight + 28;
  context.strokeStyle = palette.border;
  context.beginPath();
  context.moveTo(PADDING, footerY - 18);
  context.lineTo(WIDTH - PADDING, footerY - 18);
  context.stroke();
  context.fillStyle = palette.muted;
  context.font =
    '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textBaseline = "alphabetic";
  context.fillText(`Inkprint · ${t("brand.tagline")}`, PADDING, footerY + 20);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error(t("error.shareCreate")));
    }, "image/png");
  });

  const folder = normalizePath("Attachments");
  if (!vault.getAbstractFileByPath(folder)) await vault.createFolder(folder);
  const safeId = entry.entryId.replace(/[^A-Za-z0-9-]/g, "-");
  const path = normalizePath(`${folder}/Inkprint-${dateKey}-${safeId}.png`);
  const existing = vault.getFileByPath(path);
  const targetPath = existing
    ? normalizePath(`${folder}/Inkprint-${dateKey}-${safeId}-${Date.now()}.png`)
    : path;
  await vault.createBinary(targetPath, await blob.arrayBuffer());
  return { path: targetPath };
}

export function toSharePlainText(body: string, tags: readonly string[]): string {
  return stripEntryTags(body, tags)
    .replace(/^\s*-\s+\[[ xX]\]\s*/gm, "• ")
    .replace(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (_match, name: string) =>
      `[${t("share.image", { name })}]`,
    )
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(
      /!\[([^\]]*)\]\([^)]+\)/g,
      (_match, alt: string) => `[${t("share.image", { name: alt || "image" })}]`,
    )
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~`>]/g, "")
    .trim();
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const character of Array.from(paragraph)) {
      const next = line + character;
      if (line && context.measureText(next).width > maxWidth) {
        lines.push(line);
        line = character.trimStart();
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [t("share.blank")];
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}
