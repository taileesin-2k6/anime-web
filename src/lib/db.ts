import fs from 'fs';
import path from 'path';
import { Anime } from './types';

const dataDir = path.join(process.cwd(), 'data');
const dbFilePath = path.join(dataDir, 'anime.json');

function ensureDbFile(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbFilePath)) {
    fs.writeFileSync(dbFilePath, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getAllAnime(): Anime[] {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading anime db:', error);
    return [];
  }
}

export function saveAllAnime(animes: Anime[]): void {
  ensureDbFile();
  fs.writeFileSync(dbFilePath, JSON.stringify(animes, null, 2), 'utf-8');
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
