/**
 * Dual Google Drive Sync & Mirror Tool
 * Primary: lethanhtaicute2009@gmail.com (Folder: anime-vietsub, ID: 1prgO-NQHj-PYzkhX3HAEC3d5NXZuPtVl)
 * Backup Mirror: lethanhtaicute2006@gmail.com (Folder: anime-web, ID: 1vTU_kEXo6AfLeq59hixKb_oZCt0msNL9)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SA_PATH = path.join(process.env.HOME || '', '.config', 'rclone', 'service-account.json');
const ANIME_JSON_PATH = path.join(__dirname, '..', 'data', 'anime.json');
const PUBLIC_ANIME_JSON_PATH = path.join(__dirname, '..', 'public', 'anime.json');

const PRIMARY_FOLDER_ID = '1prgO-NQHj-PYzkhX3HAEC3d5NXZuPtVl'; // anime-vietsub (2009)
const BACKUP_FOLDER_ID = '1vTU_kEXo6AfLeq59hixKb_oZCt0msNL9';  // anime-web (2006)

function getServiceAccount() {
  return JSON.parse(fs.readFileSync(SA_PATH, 'utf-8'));
}

async function getAccessToken() {
  const sa = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  ).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const sig = signer.sign(sa.private_key, 'base64url');
  const assertion = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  const data = await res.json();
  return data.access_token;
}

async function findFileByName(token, folderId, filename) {
  const safeName = filename.replace(/'/g, "\\'");
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+name='${safeName}'+and+trashed=false&fields=files(id,name,mimeType)&pageSize=5&supportsAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

async function createShortcut(token, targetFileId, filename, targetFolderId) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: filename,
      mimeType: 'application/vnd.google-apps.shortcut',
      parents: [targetFolderId],
      shortcutDetails: {
        targetId: targetFileId,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create shortcut: ${err}`);
  }

  const data = await res.json();
  return data.id;
}

async function syncDualDrive(filename, animeSlug, epNum) {
  const token = await getAccessToken();

  // 1. Check primary file
  const primaryFile = await findFileByName(token, PRIMARY_FOLDER_ID, filename);
  if (!primaryFile) {
    return { success: false, error: `File '${filename}' not found in primary folder (${PRIMARY_FOLDER_ID})` };
  }

  const primaryId = primaryFile.id;

  // 2. Check or create backup shortcut
  let backupFile = await findFileByName(token, BACKUP_FOLDER_ID, filename);
  let backupId;
  if (backupFile) {
    backupId = backupFile.id;
  } else {
    backupId = await createShortcut(token, primaryId, filename, BACKUP_FOLDER_ID);
  }

  // 3. Update anime.json files if slug & ep provided
  if (animeSlug && epNum) {
    for (const jsonPath of [ANIME_JSON_PATH, PUBLIC_ANIME_JSON_PATH]) {
      if (fs.existsSync(jsonPath)) {
        const animeList = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        let modified = false;
        for (const a of animeList) {
          if (a.slug === animeSlug || a.id === animeSlug) {
            for (const ep of a.episodes || []) {
              if (ep.episodeNumber === epNum) {
                ep.gdriveId = primaryId;
                ep.backupId = backupId;
                ep.filename = filename;
                ep.videoUrl = `https://drive.google.com/open?id=${primaryId}`;
                modified = true;
              }
            }
          }
        }
        if (modified) {
          fs.writeFileSync(jsonPath, JSON.stringify(animeList, null, 2), 'utf-8');
        }
      }
    }
  }

  return {
    success: true,
    filename,
    primaryId,
    backupId,
  };
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  let filename = '';
  let slug = '';
  let ep = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--filename') filename = args[++i];
    else if (args[i] === '--slug') slug = args[++i];
    else if (args[i] === '--ep') ep = parseInt(args[++i], 10);
  }

  if (!filename) {
    console.error('Usage: node dual_drive_sync.js --filename <filename> [--slug <slug>] [--ep <ep_number>]');
    process.exit(1);
  }

  syncDualDrive(filename, slug, ep)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (!result.success) process.exit(1);
    })
    .catch((err) => {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    });
}

module.exports = { syncDualDrive, getAccessToken, findFileByName, createShortcut, PRIMARY_FOLDER_ID, BACKUP_FOLDER_ID };
