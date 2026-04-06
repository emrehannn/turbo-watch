import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("../", import.meta.url).pathname);

const jsFiles = ["api.js", "background.js", "content.js", "popup.js", "scripts/build.mjs", "scripts/lint.mjs", "scripts/test.mjs"];
const jsonFiles = ["manifest.base.json", "manifest.json", "package.json"];
const htmlFiles = ["popup.html"];

let hasError = false;

function runNodeCheck(filePath) {
  const result = spawnSync(process.execPath, ["--check", filePath], { encoding: "utf8" });
  if (result.status !== 0) {
    hasError = true;
    process.stderr.write(result.stderr || `Syntax check failed: ${filePath}\n`);
  }
}

async function lintJson(filePath) {
  try {
    JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    hasError = true;
    process.stderr.write(`Invalid JSON in ${filePath}: ${error.message}\n`);
  }
}

async function lintHtml(filePath) {
  const html = await fs.readFile(filePath, "utf8");
  if (/https:\/\/fonts\.googleapis\.com/i.test(html)) {
    hasError = true;
    process.stderr.write(`Disallowed remote font dependency in ${filePath}\n`);
  }
}

async function main() {
  for (const file of jsFiles) {
    runNodeCheck(path.join(root, file));
  }

  await Promise.all(jsonFiles.map((file) => lintJson(path.join(root, file))));
  await Promise.all(htmlFiles.map((file) => lintHtml(path.join(root, file))));

  if (hasError) {
    process.exitCode = 1;
    return;
  }

  console.log("Lint checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
