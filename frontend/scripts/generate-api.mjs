import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const localPython = resolve(root, "backend", ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const python = process.env.NODEBI_PYTHON ?? (existsSync(localPython) ? localPython : "python");
const result = spawnSync(python, ["-c", "import json; from app.main import app; print(json.dumps(app.openapi()))"], { cwd: resolve(root, "backend"), encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || "Could not export API schema");
const output = astToString(await openapiTS(JSON.parse(result.stdout)));
const path = resolve(root, "frontend/lib/api-schema.d.ts");
if (process.argv.includes("--check")) {
  if (!existsSync(path) || readFileSync(path, "utf8") !== output) throw new Error("API types are stale. Run npm run api:generate.");
} else writeFileSync(path, output);
