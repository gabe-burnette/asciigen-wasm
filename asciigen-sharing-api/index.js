import { Database } from 'bun:sqlite';
import { file, write, fetch } from 'bun';

const db = new Database('asciigen_db.sqlite');

// Initialize database tables - check
db.run(`
  CREATE TABLE IF NOT EXISTS RateLimit (
    IP TEXT PRIMARY KEY,
    expiry INTEGER
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS ImageHashes (
    Hash TEXT PRIMARY KEY,
    Added_by_ip TEXT,
    Added_ts TEXT,
    FileType TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS ShareLinks (
    link TEXT PRIMARY KEY,
    Hash TEXT,
    options TEXT,
    viewed INTEGER
  )
`);

// Enable WAL mode
db.run('PRAGMA journal_mode = WAL');

const CORS_HEADERS = { //for testing?
  headers: {
      'Access-Control-Allow-Origin': 'https://asciigen.com',
      'Access-Control-Allow-Methods': 'OPTIONS, POST',
      'Access-Control-Allow-Headers': 'Content-Type',
  },
};

// Turnstile validation function (you need to implement this)
async function validateTurnstile(token) {
  // return true;
  const secret = ""; //replace with your secret
  const endpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const body = new URLSearchParams({
    secret: secret,
    response: token
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();

    return data.success;
  } catch (error) {
    return false;
  }
}

// Generate a random 10-character string for share links
function generateShareLink() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

// Hash the image buffer using Bun.CryptoHasher
function hashImage(buffer) {
  const hasher = new Bun.CryptoHasher("sha1");
  hasher.update(new Uint8Array(buffer));
  return hasher.digest('hex');
}

// Get file extension from MIME type
function getFileExtension(mimeType) {
  const extensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/webp': '.webp',
    'image/tiff': '.tiff',
    'image/svg+xml': '.svg'
  };
  return extensions[mimeType] || '.bin';
}

// Rate limit check
function checkRateLimit(ip) {
  // return true;
  const now = Date.now();
  const stmt = db.prepare('SELECT expiry FROM RateLimit WHERE IP = ?');
  const result = stmt.get(ip);
  
  if (result && result.expiry > now) {
    return false;
  }
  
  const insertStmt = db.prepare('INSERT OR REPLACE INTO RateLimit (IP, expiry) VALUES (?, ?)');
  insertStmt.run(ip, now + 5000);
  return true;
}

// Handle /new route
async function handleNew(req) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('host').split(':')[0];
  
  if (!checkRateLimit(ip)) {
    return new Response('Rate limit exceeded', { status: 429, CORS_HEADERS });
  }

  const formData = await req.formData();
  const image = formData.get('image');
  const options = formData.get('options');
  const turnstileResponse = formData.get('turnstile');

  if (!await validateTurnstile(turnstileResponse)) {
    return new Response('Invalid Turnstile response', { status: 400, CORS_HEADERS });
  }

  if (!options || typeof options !== 'string' || options.length > 500) {
    return new Response('Invalid options', { status: 400, CORS_HEADERS });
  }

  if (!(image instanceof Blob) || image.size > 500000) {
    return new Response('Invalid image or image too large', { status: 400, CORS_HEADERS });
  }

  const buffer = await image.arrayBuffer();
  const hash = hashImage(buffer);
  const fileExtension = getFileExtension(image.type);
  const fileName = `${hash}${fileExtension}`;

  const existingHashStmt = db.prepare('SELECT Hash FROM ImageHashes WHERE Hash = ?');
  const existingHash = existingHashStmt.get(hash);

  if (!existingHash) {
    await write(`images/${fileName}`, buffer);
    const insertHashStmt = db.prepare('INSERT INTO ImageHashes (Hash, Added_by_ip, Added_ts, FileType) VALUES (?, ?, ?, ?)');
    insertHashStmt.run(hash, ip, new Date().toISOString(), fileExtension);
  }

  const shareLink = generateShareLink();
  const insertShareLinkStmt = db.prepare('INSERT INTO ShareLinks (link, Hash, options, viewed) VALUES (?, ?, ?, ?)');
  insertShareLinkStmt.run(shareLink, hash, options, 0);

  return new Response(JSON.stringify({ shareLink }), {
    headers: { 'Content-Type': 'application/json','Access-Control-Allow-Origin': 'https://asciigen.com', //only to local host
        'Access-Control-Allow-Methods': 'OPTIONS, POST',
        'Access-Control-Allow-Headers': 'Content-Type', }
  });
}

// Handle /existing route
async function handleExisting(req) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('host').split(':')[0];
  
  if (!checkRateLimit(ip)) {
    return new Response('Rate limit exceeded', { status: 429, CORS_HEADERS });
  }

  const formData = await req.formData();
  const shareKey = formData.get('shareKey');
  const turnstileResponse = formData.get('turnstile');

  if (!await validateTurnstile(turnstileResponse)) {
    return new Response('Invalid Turnstile response', { status: 400, CORS_HEADERS });
  }

  if (typeof shareKey !== 'string' || shareKey.length !== 10) {
    return new Response('Invalid share key', { status: 400, CORS_HEADERS });
  }

  const stmt = db.prepare('SELECT ShareLinks.Hash, ShareLinks.options, ImageHashes.FileType FROM ShareLinks JOIN ImageHashes ON ShareLinks.Hash = ImageHashes.Hash WHERE ShareLinks.link = ?');
  const result = stmt.get(shareKey);

  if (!result) {
    return new Response('Share link not found', { status: 404, CORS_HEADERS });
  }

  const { Hash, options, FileType } = result;
  const fileName = `${Hash}${FileType}`;
  const image = await file(`images/${fileName}`).arrayBuffer();

  const updateViewedStmt = db.prepare('UPDATE ShareLinks SET viewed = viewed + 1 WHERE link = ?');
  updateViewedStmt.run(shareKey);

  return new Response(image, {
    headers: { 
      'Content-Type': FileType.startsWith('.') ? `image/${FileType.slice(1)}` : 'application/octet-stream',
      // 'Content-Disposition': `inline; filename="${fileName}"`,
      'Access-Control-Allow-Origin': 'https://asciigen.com', //only to local host
      'Access-Control-Allow-Methods': 'OPTIONS, POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Expose-Headers': 'Content-Type, Options-data',  // Add this line
      'Options-data': options,
    }
  });
}

// Main server function
function server(req) {
  const url = new URL(req.url);

  if (req.method === 'POST') {
    if (url.pathname === '/new') {
      return handleNew(req);
    } else if (url.pathname === '/existing') {
      return handleExisting(req);
    }
  }

  return new Response('Not Found', { status: 404, CORS_HEADERS });
}

// Background task to clean up rate limit entries
setInterval(() => {
  const now = Date.now();
  const cleanupStmt = db.prepare('DELETE FROM RateLimit WHERE expiry < ?');
  cleanupStmt.run(now);
}, 5000);

// Check if running in HTTP-only mode
const isHttpOnly = process.argv.includes('--http-only');

export default {
  port: 443,
  fetch: server,
  tls: {
    cert: file("cert.pem"),
    key: file('key.pem'),
    ca: file("ca2.pem"),
  },
};

// export default {
//   port: isHttpOnly ? 80 : 443,
//   fetch: server,
//   ...(!isHttpOnly && {
//     tls: {
//       cert: file("cert.pem"),
//       key: file('key.pem'),
//       ca: file("ca.pem"),
//     }
//   })
// };