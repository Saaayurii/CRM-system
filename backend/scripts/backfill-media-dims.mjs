/**
 * One-off backfill: write pixel width/height into existing chat image attachments
 * so the chat list reserves the media box on first load (no jump) for messages
 * sent before the client started saving dimensions.
 *
 * Reads chat_messages.attachments (JSON), fetches each image by its public
 * fileUrl, reads dimensions via `image-size`, and writes width/height back.
 * Videos are skipped (image-size can't parse them; new videos already carry
 * dimensions from the client, old ones self-heal via the per-device cache).
 *
 * Run (no host node needed) from /opt/crm-system/backend:
 *   docker run --rm -v "$PWD/scripts:/s" -w /s \
 *     -e DATABASE_URL='postgresql://postgres:PASSWORD@postgres:5432/construction_crm' \
 *     --network backend_crm-network \
 *     node:20-alpine sh -c "npm i pg image-size --no-save --silent && node backfill-media-dims.mjs"
 *
 * Safe to re-run: it skips attachments that already have width/height.
 * Add --dry to preview without writing.
 */
import pg from 'pg';
import { imageSize } from 'image-size';

const DRY = process.argv.includes('--dry');
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const isImage = (a) =>
  typeof a?.fileUrl === 'string' &&
  (String(a.mimeType || '').startsWith('image/') ||
    /\.(jpe?g|png|gif|webp|bmp|avif)(\?|$)/i.test(a.fileUrl));

async function fetchDims(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const { width, height } = imageSize(buf);
  if (!width || !height) throw new Error('no dimensions');
  return { width, height };
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const { rows } = await client.query(
  `SELECT id, attachments FROM chat_messages
   WHERE attachments IS NOT NULL AND jsonb_array_length(attachments) > 0
   ORDER BY id`,
);
console.log(`Scanning ${rows.length} message(s) with attachments…`);

let touchedMsgs = 0;
let filledImgs = 0;
let failed = 0;

for (const row of rows) {
  const atts = Array.isArray(row.attachments) ? row.attachments : [];
  let changed = false;

  for (const att of atts) {
    if (!isImage(att)) continue;
    if (att.width && att.height) continue; // already known
    try {
      const { width, height } = await fetchDims(att.fileUrl);
      att.width = width;
      att.height = height;
      changed = true;
      filledImgs++;
    } catch (err) {
      failed++;
      console.warn(`  ! msg ${row.id}: ${att.fileUrl} → ${err.message}`);
    }
  }

  if (changed) {
    touchedMsgs++;
    if (!DRY) {
      await client.query('UPDATE chat_messages SET attachments = $1 WHERE id = $2', [
        JSON.stringify(atts),
        row.id,
      ]);
    }
  }
}

await client.end();
console.log(
  `${DRY ? '[dry] ' : ''}Done: filled ${filledImgs} image(s) in ${touchedMsgs} message(s), ${failed} failed.`,
);
