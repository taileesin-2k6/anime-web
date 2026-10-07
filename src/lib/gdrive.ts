/**
 * Utility functions for parsing Google Drive links and converting to stream/embed URLs.
 */

export function extractGDriveFileId(inputUrl: string): string | null {
  if (!inputUrl) return null;
  const trimmed = inputUrl.trim();

  // If it's already an ID (alphanumeric, underscores, hyphens, typically 25-50 chars)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return trimmed;
  }

  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) {
    return match1[1];
  }

  // https://drive.google.com/open?id=FILE_ID or https://drive.google.com/uc?id=FILE_ID
  const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2 && match2[1]) {
    return match2[1];
  }

  return null;
}

export function formatVideoUrl(url: string): {
  embedUrl: string;
  directUrl?: string;
  gdriveId?: string;
  type: 'gdrive' | 'iframe' | 'direct';
} {
  if (!url) {
    return { embedUrl: '', type: 'direct' };
  }

  const gdriveId = extractGDriveFileId(url);
  if (gdriveId) {
    return {
      embedUrl: `https://drive.google.com/file/d/${gdriveId}/preview`,
      directUrl: `/api/stream?gdriveId=${gdriveId}`,
      gdriveId,
      type: 'gdrive',
    };
  }

  // Check if it's standard direct video (mp4, m3u8, webm)
  if (/\.(mp4|m3u8|webm)(\?.*)?$/i.test(url)) {
    return {
      embedUrl: url,
      directUrl: url,
      type: 'direct',
    };
  }

  // Default to iframe embed
  return {
    embedUrl: url,
    type: 'iframe',
  };
}
