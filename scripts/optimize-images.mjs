#!/usr/bin/env node
/**
 * Image optimizer for the Plumbing Solutions Website.
 *
 * Generates AVIF + WebP + optimized JPG variants at 800w/1600w/2400w from each
 * input file, writing them to /assets/optimized/.
 *
 * Usage:
 *   npm run optimize                          # all assets/images/*.{jpg,jpeg,png}
 *   npm run optimize -- assets/images/foo.jpg # specific file(s)
 */
import { readdir, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(process.cwd());
const SRC_DIR = join(ROOT, "assets", "images");
const OUT_DIR = join(ROOT, "assets", "optimized");
const WIDTHS = [800, 1600, 2400];
const SUPPORTED = new Set([".jpg", ".jpeg", ".png"]);

async function listInputs(args) {
  if (args.length > 0) return args.map((p) => resolve(p));
  const entries = await readdir(SRC_DIR);
  return entries
    .filter((f) => SUPPORTED.has(extname(f).toLowerCase()))
    .map((f) => join(SRC_DIR, f));
}

async function optimizeOne(inputPath) {
  const name = basename(inputPath, extname(inputPath));
  const meta = await sharp(inputPath).metadata();
  const sourceWidth = meta.width ?? 0;

  for (const w of WIDTHS) {
    if (sourceWidth && w > sourceWidth) continue;

    const base = sharp(inputPath).resize({ width: w, withoutEnlargement: true });

    await Promise.all([
      base.clone().avif({ quality: 62, effort: 5, chromaSubsampling: "4:4:4" })
        .toFile(join(OUT_DIR, `${name}-${w}.avif`)),
      base.clone().webp({ quality: 84, effort: 5 })
        .toFile(join(OUT_DIR, `${name}-${w}.webp`)),
      base.clone().jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" })
        .toFile(join(OUT_DIR, `${name}-${w}.jpg`)),
    ]);

    process.stdout.write(`  ${name}-${w}.{avif,webp,jpg}\n`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const inputs = await listInputs(args);
  if (inputs.length === 0) {
    console.error(`No inputs found in ${SRC_DIR}.`);
    process.exit(1);
  }

  for (const input of inputs) {
    const s = await stat(input);
    if (!s.isFile()) continue;
    console.log(`→ ${basename(input)}`);
    await optimizeOne(input);
  }

  console.log(`\nDone. Outputs in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
