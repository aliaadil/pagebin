/**
 * HTML paste lifecycle — write to disk, read for serving.
 *
 * Files live under $PAGEBIN_DATA_DIR/pages/<id>.html. Keeping them on disk
 * (not in sqlite) means large pastes don't bloat the DB and serving can
 * stream from the filesystem.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.PAGEBIN_DATA_DIR ?? './data';
const PAGES_DIR = join(DATA_DIR, 'pages');

if (!existsSync(PAGES_DIR)) {
  mkdirSync(PAGES_DIR, { recursive: true });
}

export function writePaste(id: string, html: string): string {
  const path = join(PAGES_DIR, `${id}.html`);
  writeFileSync(path, html, 'utf8');
  return path;
}

export function readPaste(path: string): string {
  return readFileSync(path, 'utf8');
}

export function deletePasteFile(path: string): void {
  try {
    require('node:fs').unlinkSync(path);
  } catch {
    // ENOENT and friends — best effort.
  }
}
