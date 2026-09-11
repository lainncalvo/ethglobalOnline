import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const FILES = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "apps/web/.env.local"),
  resolve(process.cwd(), "scripts/.env"),
];

/** Load env files without logging values. Existing process.env wins. */
export function loadEnvFiles(): void {
  for (const path of FILES) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}
