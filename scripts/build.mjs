import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const distDir = path.join(root, "dist");

const extensionFiles = [
  "api.js",
  "background.js",
  "content.js",
  "popup.css",
  "popup.html",
  "popup.js",
  "icon.png",
];

const chromiumOverride = {
  manifest_version: 3,
  action: {
    default_popup: "popup.html",
    default_icon: {
      "16": "icon.png",
      "48": "icon.png",
      "128": "icon.png"
    }
  },
  background: {
    service_worker: "background.js"
  }
};

const firefoxOverride = {
  manifest_version: 2,
  browser_action: {
    default_popup: "popup.html",
    default_icon: {
      "16": "icon.png",
      "48": "icon.png",
      "128": "icon.png"
    }
  },
  background: {
    scripts: ["api.js", "background.js"],
    persistent: false
  },
  permissions: ["storage", "tabs", "<all_urls>"],
  content_security_policy: "script-src 'self'; object-src 'self'",
  browser_specific_settings: {
    gecko: {
      id: "turbo-watch@emrehan.dev",
      strict_min_version: "115.0"
    }
  }
};

async function copyFiles(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });

  for (const file of extensionFiles) {
    await fs.copyFile(path.join(root, file), path.join(targetDir, file));
  }
}

function mergeManifest(base, override) {
  return {
    ...base,
    ...override,
    permissions: override.permissions || base.permissions,
    content_scripts: base.content_scripts,
  };
}

async function writeManifest(targetDir, manifest) {
  const outputPath = path.join(targetDir, "manifest.json");
  await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function main() {
  const base = JSON.parse(await fs.readFile(path.join(root, "manifest.base.json"), "utf8"));

  await fs.rm(distDir, { recursive: true, force: true });

  const chromiumDir = path.join(distDir, "chromium");
  const firefoxDir = path.join(distDir, "firefox");

  await Promise.all([copyFiles(chromiumDir), copyFiles(firefoxDir)]);

  await Promise.all([
    writeManifest(chromiumDir, mergeManifest(base, chromiumOverride)),
    writeManifest(firefoxDir, mergeManifest(base, firefoxOverride)),
  ]);

  await fs.writeFile(
    path.join(root, "manifest.json"),
    `${JSON.stringify(mergeManifest(base, chromiumOverride), null, 2)}\n`,
    "utf8",
  );

  console.log("Built extension artifacts:");
  console.log(`- ${chromiumDir}`);
  console.log(`- ${firefoxDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
