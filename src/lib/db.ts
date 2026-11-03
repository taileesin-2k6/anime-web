import fs from 'fs';
import path from 'path';
import { Anime } from './types';
import staticAnimeList from '../../data/anime.json';

const dataDir = path.join(process.cwd(), 'data');
const dbFilePath = path.join(dataDir, 'anime.json');

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.CF_PAGES || process.env.CLOUDFLARE);
let memoizedAnimeList: Anime[] | null = null;

function ensureDbFile(): void {
  if (isProduction) return;
  try {
    if (typeof fs !== 'undefined' && fs.existsSync) {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (!fs.existsSync(dbFilePath)) {
        fs.writeFileSync(dbFilePath, JSON.stringify(staticAnimeList || [], null, 2), 'utf-8');
      }
    }
  } catch (e) {
    // Read-only filesystem or edge worker isolate
  }
}

export function getAllAnime(): Anime[] {
  if (memoizedAnimeList) return memoizedAnimeList;

  // In production / Cloudflare Workers, avoid touching the filesystem polyfill completely
  if (isProduction) {
    memoizedAnimeList = (staticAnimeList || []) as unknown as Anime[];
    return memoizedAnimeList;
  }

  try {
    if (typeof fs !== 'undefined' && fs.existsSync && fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoizedAnimeList = parsed as Anime[];
        return memoizedAnimeList;
      }
    }
  } catch (error) {
    // Fallback to static
  }

  memoizedAnimeList = (staticAnimeList || []) as unknown as Anime[];
  return memoizedAnimeList;
}

export function saveAllAnime(animes: Anime[]): void {
  memoizedAnimeList = animes;
  if (isProduction) return;
  try {
    ensureDbFile();
    if (typeof fs !== 'undefined' && fs.writeFileSync) {
      fs.writeFileSync(dbFilePath, JSON.stringify(animes, null, 2), 'utf-8');
    }
  } catch (e) {
    console.warn('Cannot write to filesystem in this runtime:', e);
  }
}

export function getAnimeByIdOrSlug(idOrSlug: string): Anime | null {
  const animes = getAllAnime();
  const lower = idOrSlug.toLowerCase();
  return animes.find(a => a.id.toLowerCase() === lower || a.slug.toLowerCase() === lower) || null;
}

export function createAnime(data: Omit<Anime, 'id' | 'createdAt' | 'updatedAt' | 'episodes'> & { episodes?: Anime['episodes'] }): Anime {
  const animes = getAllAnime();
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const newAnime: Anime = {
    ...data,
    id,
    episodes: data.episodes || [],
    createdAt: now,
    updatedAt: now,
  };

  animes.unshift(newAnime);
  saveAllAnime(animes);
  return newAnime;
}

export function updateAnime(id: string, updates: Partial<Anime>): Anime | null {
  const animes = getAllAnime();
  const index = animes.findIndex(a => a.id === id);
  if (index === -1) return null;

  animes[index] = {
    ...animes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveAllAnime(animes);
  return animes[index];
}

export function deleteAnime(id: string): boolean {
  const animes = getAllAnime();
  const filtered = animes.filter(a => a.id !== id);
  if (filtered.length === animes.length) return false;

  saveAllAnime(filtered);
  return true;
}
