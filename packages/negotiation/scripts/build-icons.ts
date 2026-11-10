/**
 * Turns the source icon PNGs into small WebP files for the web app.
 *
 * Resource icons: the required set is derived from the game data (every gift of every
 * reachable negotiation at every age). Each `input/icons/icon_<name>.png` is trimmed to
 * its visible pixels, fitted into a transparent 96x96 square and saved as
 * `<out>/icons/<name>.webp`. The build fails, listing the names, if an icon is missing.
 *
 * Feedback icons: `input/feedback-icons/{green,orange,red}.png` fitted into 64x64 and
 * saved as `<out>/feedback/<name>.webp`.
 *
 * Usage: bun scripts/build-icons.ts [--out <dir>]
 *   default out: ../../apps/web/public/negotiation
 */
import { access, mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { requiredIconNames } from "../src/data.ts";

const PACKAGE_ROOT = path.join(import.meta.dirname, "..");
const ICONS_DIR = path.join(PACKAGE_ROOT, "input", "icons");
const FEEDBACK_DIR = path.join(PACKAGE_ROOT, "input", "feedback-icons");
const DEFAULT_OUT = path.join(
  PACKAGE_ROOT,
  "..",
  "..",
  "apps",
  "web",
  "public",
  "negotiation"
);
const FEEDBACK_NAMES = ["green", "orange", "red"];
const ICON_SIZE = 96;
const FEEDBACK_SIZE = 64;
const QUALITY = 86;
const TRANSPARENT = { alpha: 0, b: 0, g: 0, r: 0 };

const exists = async (file: string): Promise<boolean> => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const convert = async (
  source: string,
  target: string,
  size: number
): Promise<void> => {
  await sharp(source)
    .ensureAlpha()
    .trim({ background: TRANSPARENT, threshold: 0 })
    .resize(size, size, {
      background: TRANSPARENT,
      fit: "contain",
      kernel: "lanczos3",
    })
    .webp({ effort: 6, quality: QUALITY })
    .toFile(target);
};

const outFlag = process.argv.indexOf("--out");
const outDir =
  outFlag > 0 ? path.resolve(process.argv[outFlag + 1] ?? "") : DEFAULT_OUT;

const names = requiredIconNames();
const sources = await Promise.all(
  names.map(async (name) => {
    const source = path.join(ICONS_DIR, `icon_${name}.png`);
    return { found: await exists(source), name, source };
  })
);
const missing = sources.filter((icon) => !icon.found).map((icon) => icon.name);
if (missing.length > 0) {
  throw new Error(
    `Missing ${missing.length} icon(s) in ${ICONS_DIR}: ${missing.join(", ")}`
  );
}

await mkdir(path.join(outDir, "icons"), { recursive: true });
await mkdir(path.join(outDir, "feedback"), { recursive: true });
await Promise.all([
  ...sources.map(({ name, source }) =>
    convert(source, path.join(outDir, "icons", `${name}.webp`), ICON_SIZE)
  ),
  ...FEEDBACK_NAMES.map((name) =>
    convert(
      path.join(FEEDBACK_DIR, `${name}.png`),
      path.join(outDir, "feedback", `${name}.webp`),
      FEEDBACK_SIZE
    )
  ),
]);

process.stdout.write(
  `icons: ${names.length} resource icons and ${FEEDBACK_NAMES.length} feedback icons -> ${outDir}\n`
);
