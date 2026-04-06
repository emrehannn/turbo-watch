import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("../", import.meta.url).pathname);
const distChromium = path.join(root, "dist", "chromium");
const distFirefox = path.join(root, "dist", "firefox");

async function ensureFile(filePath) {
  await fs.access(filePath);
}

async function main() {
  const requiredFiles = [
    path.join(distChromium, "manifest.json"),
    path.join(distChromium, "popup.html"),
    path.join(distChromium, "popup.js"),
    path.join(distChromium, "content.js"),
    path.join(distFirefox, "manifest.json"),
    path.join(distFirefox, "popup.html"),
    path.join(distFirefox, "popup.js"),
    path.join(distFirefox, "content.js"),
  ];

  await Promise.all(requiredFiles.map(ensureFile));

  const chromiumManifest = JSON.parse(
    await fs.readFile(path.join(distChromium, "manifest.json"), "utf8"),
  );
  const firefoxManifest = JSON.parse(
    await fs.readFile(path.join(distFirefox, "manifest.json"), "utf8"),
  );

  if (chromiumManifest.manifest_version !== 3) {
    throw new Error("Chromium manifest must use MV3");
  }

  if (firefoxManifest.manifest_version !== 2) {
    throw new Error("Firefox manifest must use MV2");
  }

  if (!firefoxManifest.browser_specific_settings?.gecko?.id) {
    throw new Error("Firefox manifest must include browser_specific_settings.gecko.id");
  }

  console.log("Smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
