export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
}

export class TFile {
  path = "";
  basename = "";
  extension = "md";
}

export class TFolder {
  path = "";
}
