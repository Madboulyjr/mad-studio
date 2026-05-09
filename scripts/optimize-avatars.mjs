#!/usr/bin/env node
/**
 * Compress + format-convert the 4 avatar PNGs.
 *
 *   IN:  public/avatars/<id>.png   (2048×2048, ~4 MB each)
 *   OUT: public/avatars/<id>.webp  (≤1024px, ~150-300 KB each)
 *        public/avatars/<id>@2x.webp (1600px, retina, ~400-600 KB)
 *        public/avatars/<id>.png remains as fallback for old Safari
 *
 * Usage:  node scripts/optimize-avatars.mjs
 */
import {readdirSync, statSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_DIR = path.resolve(__dirname, '../assets-source/avatars')
const AVATAR_DIR = path.resolve(__dirname, '../public/avatars')

const files = readdirSync(SRC_DIR).filter((f) => f.endsWith('.png') && !f.includes('@'))
console.log(`\nOptimizing ${files.length} avatars\n  src: ${SRC_DIR}\n  out: ${AVATAR_DIR}\n`)

let totalIn = 0
let totalOut = 0

for (const f of files) {
  const inPath = path.join(SRC_DIR, f)
  const base = f.replace(/\.png$/, '')
  const inSize = statSync(inPath).size
  totalIn += inSize

  // 1024px @ q80 — primary
  const outWebp = path.join(AVATAR_DIR, `${base}.webp`)
  await sharp(inPath)
    .resize(1024, 1024, {fit: 'inside', withoutEnlargement: true})
    .webp({quality: 80, effort: 6})
    .toFile(outWebp)
  const outWebpSize = statSync(outWebp).size
  totalOut += outWebpSize

  // 1600px @ q82 — retina (used via srcset 2x)
  const outWebp2x = path.join(AVATAR_DIR, `${base}@2x.webp`)
  await sharp(inPath)
    .resize(1600, 1600, {fit: 'inside', withoutEnlargement: true})
    .webp({quality: 82, effort: 6})
    .toFile(outWebp2x)
  totalOut += statSync(outWebp2x).size

  console.log(
    `  ${f.padEnd(18)} ${(inSize / 1024).toFixed(0).padStart(5)} KB → ` +
      `${(outWebpSize / 1024).toFixed(0).padStart(4)} KB webp + ` +
      `${(statSync(outWebp2x).size / 1024).toFixed(0).padStart(4)} KB @2x webp`,
  )
}

console.log(
  `\n  Total IN:  ${(totalIn / 1024 / 1024).toFixed(1)} MB ` +
    `→  Total OUT (webp x2):  ${(totalOut / 1024 / 1024).toFixed(1)} MB ` +
    `(saved ${(((totalIn - totalOut) / totalIn) * 100).toFixed(0)}%)\n`,
)
