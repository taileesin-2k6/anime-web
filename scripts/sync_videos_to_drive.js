/**
 * Automated Google Drive Video Uploader & Sync
 * Uploads local .mp4 videos from public/videos/ into the shared Google Drive folder
 * and automatically updates data/anime.json and public/anime.json with gdriveId.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SA_PATH = path.join(process.env.HOME || '', '.config', 'rclone', 'service-account.json');
const ANIME_JSON_PATH = path.join(__dirname, '..', 'data', 'anime.json');
const PUBLIC_ANIME_JSON_PATH = path.join(__dirname, '..', 'public', 'anime.json');
const VIDEOS_DIR = path.join(__dirname, '..', 'public', 'videos');

function getServiceAccount() {
  if (!fs.existsSync(SA_PATH)) {
    throw new Error(`Service account not found at: ${SA_PATH}`);
  }
  return JSON.parse(fs.readFileSync(SA_PATH, 'utf-8'));
}

async function getAccessToken(sa) {
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
  if (!data.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function listWritableFolders(accessToken) {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name,owners,capabilities)&supportsAllDrives=true",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await res.json();
  const folders = data.files || [];
  return folders.filter((f) => f.capabilities && f.capabilities.canAddChildren);
}

async function uploadFileResumable(filePath, folderId, accessToken) {
  const filename = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;

  console.log(`\n🚀 Starting upload for: ${filename} (${(fileSize / (1024 * 1024)).toFixed(1)} MB)...`);

  // 1. Initiate Resumable Upload
  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': fileSize.toString(),
      },
      body: JSON.stringify({
        name: filename,
        parents: [folderId],
      }),
    }
  );

  const uploadUri = initRes.headers.get('location');
  if (!uploadUri) {
    const errText = await initRes.text();
    throw new Error(`Failed to initiate resumable upload (${initRes.status}): ${errText}`);
  }

  // 2. Upload in chunks of 16MB
  const CHUNK_SIZE = 16 * 1024 * 1024;
  let offset = 0;
  const fileDescriptor = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(CHUNK_SIZE);

  while (offset < fileSize) {
    const bytesToRead = Math.min(CHUNK_SIZE, fileSize - offset);
    fs.readSync(fileDescriptor, buffer, 0, bytesToRead, offset);
    const chunk = buffer.subarray(0, bytesToRead);

    const chunkEnd = offset + bytesToRead - 1;
    const progressPct = (((chunkEnd + 1) / fileSize) * 100).toFixed(1);

    const chunkRes = await fetch(uploadUri, {
      method: 'PUT',
      headers: {
        'Content-Length': bytesToRead.toString(),
        'Content-Range': `bytes ${offset}-${chunkEnd}/${fileSize}`,
      },
      body: chunk,
    });

    if (chunkRes.status === 200 || chunkRes.status === 201) {
      const finishedData = await chunkRes.json();
      fs.closeSync(fileDescriptor);
      console.log(`✅ Upload complete: ${filename} -> GDrive ID: ${finishedData.id}`);
      return finishedData.id;
    } else if (chunkRes.status === 308) {
      process.stdout.write(`  ⏳ Uploading ${filename}: ${progressPct}%...\r`);
      offset += bytesToRead;
    } else {
      const errText = await chunkRes.text();
      fs.closeSync(fileDescriptor);
      throw new Error(`Upload failed at offset ${offset} (${chunkRes.status}): ${errText}`);
    }
  }

  fs.closeSync(fileDescriptor);
  throw new Error('Upload loop ended without confirmation');
}

async function main() {
  const sa = getServiceAccount();
  console.log(`🔑 Service Account: ${sa.client_email}`);
  const token = await getAccessToken(sa);

  const writableFolders = await listWritableFolders(token);
  console.log(`📁 Found ${writableFolders.length} writable folder(s):`);
  writableFolders.forEach((f) => {
    const owner = f.owners && f.owners[0] ? f.owners[0].emailAddress : 'unknown';
    console.log(`  - [${f.name}] ID: ${f.id} (Owner: ${owner})`);
  });

  if (writableFolders.length === 0) {
    console.log(`
⚠️  CHƯA CÓ THƯ MỤC CÓ QUYỀN CHỈNH SỬA (EDITOR)!
👉 Hãy mở Chrome bằng tài khoản lethanhtaicute2006@gmail.com:
   1. Vào Google Drive -> Tạo 1 thư mục (ví dụ: anime-web).
   2. Nhấp chuột phải -> Chia sẻ (Share).
   3. Thêm email này: ${sa.client_email}
   4. Chọn quyền: "Người chỉnh sửa" (Editor) -> Nhấn Gửi (Send).
   5. Sau đó chạy lại lệnh này!
`);
    return;
  }

  const targetFolder = writableFolders[0];
  console.log(`\n🎯 Đang chọn thư mục đích: "${targetFolder.name}" (ID: ${targetFolder.id})`);

  // Read anime.json
  const animeData = JSON.parse(fs.readFileSync(ANIME_JSON_PATH, 'utf-8'));
  let updatedCount = 0;

  for (const anime of animeData) {
    for (const ep of anime.episodes || []) {
      const localFilename = ep.filename || (ep.videoUrl && ep.videoUrl.startsWith('/videos/') ? path.basename(ep.videoUrl) : null);
      if (!localFilename) continue;

      const localPath = path.join(VIDEOS_DIR, localFilename);
      // Check if file is still purely local (no gdriveId or videoUrl is local)
      if (fs.existsSync(localPath) && (!ep.gdriveId || ep.videoUrl.startsWith('/videos/'))) {
        try {
          const gdriveId = await uploadFileResumable(localPath, targetFolder.id, token);
          ep.gdriveId = gdriveId;
          ep.videoUrl = `https://drive.google.com/open?id=${gdriveId}`;
          updatedCount++;

          // Save progress incrementally
          fs.writeFileSync(ANIME_JSON_PATH, JSON.stringify(animeData, null, 2), 'utf-8');
          fs.writeFileSync(PUBLIC_ANIME_JSON_PATH, JSON.stringify(animeData, null, 2), 'utf-8');
          console.log(`💾 Cập nhật metadata tập ${ep.episodeNumber || ep.number} của [${anime.title}] thành công!`);
        } catch (uploadErr) {
          console.error(`❌ Lỗi upload ${localFilename}:`, uploadErr.message);
        }
      }
    }
  }

  console.log(`\n🎉 Hoàn tất! Đã đồng bộ ${updatedCount} video lên Google Drive.`);
}

main().catch(console.error);
