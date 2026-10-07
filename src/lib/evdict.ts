import fs from 'fs';
import path from 'path';

export interface DictEntry {
  word: string;
  short_mean: string;
  full_mean?: string;
  ipa?: string;
  pos?: string;
  html?: string;
  audio_url?: string | null;
}

let quickDictCache: Record<string, { m: string; i?: string; p?: string }> | null = null;
const chunkCache = new Map<string, Record<string, any>>();

function getQuickDict(): Record<string, { m: string; i?: string; p?: string }> {
  if (!quickDictCache) {
    try {
      const filePath = path.join(process.cwd(), 'data/dict/quick_dict.json');
      if (fs.existsSync(filePath)) {
        quickDictCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } else {
        quickDictCache = {};
      }
    } catch (e) {
      console.error('Failed to load quick_dict.json:', e);
      quickDictCache = {};
    }
  }
  return quickDictCache!;
}

function getChunk(char: string): Record<string, any> {
  const key = (char || '_').toLowerCase();
  if (chunkCache.has(key)) return chunkCache.get(key)!;
  try {
    const filePath = path.join(process.cwd(), `data/dict/chunks/${key}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      chunkCache.set(key, data);
      return data;
    }
  } catch (e) {
    console.error(`Failed to load chunk ${key}:`, e);
  }
  return {};
}

export function lookupWord(rawWord: string): DictEntry | null {
  const dict = getQuickDict();
  const clean = rawWord.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
  if (!clean) return null;

  // Direct match
  if (dict[clean]) {
    const d = dict[clean];
    const chunk = getChunk(clean[0]);
    const full = chunk[clean] || {};
    return {
      word: rawWord,
      short_mean: d.m || '',
      full_mean: full.full_mean || d.m || '',
      ipa: full.ipa || d.i || '',
      pos: full.pos || d.p || '',
      html: full.html || '',
    };
  }

  // Stemming variants in order of accuracy
  const candidates: string[] = [];
  if (clean.endsWith('ed')) {
    candidates.push(clean.slice(0, -1)); // hated -> hate
    candidates.push(clean.slice(0, -2)); // walked -> walk
  }
  if (clean.endsWith('ies')) {
    candidates.push(clean.slice(0, -3) + 'y'); // flies -> fly
  }
  if (clean.endsWith('es')) {
    candidates.push(clean.slice(0, -2)); // watches -> watch
    candidates.push(clean.slice(0, -1));
  }
  if (clean.endsWith('s')) {
    candidates.push(clean.slice(0, -1)); // cats -> cat
  }
  if (clean.endsWith('ing')) {
    candidates.push(clean.slice(0, -3) + 'e'); // moving -> move
    candidates.push(clean.slice(0, -3)); // seeing -> see
  }
  if (clean.endsWith('ly')) {
    candidates.push(clean.slice(0, -2)); // quickly -> quick
  }

  for (const cand of candidates) {
    if (dict[cand]) {
      const d = dict[cand];
      const chunk = getChunk(cand[0]);
      const full = chunk[cand] || {};
      return {
        word: rawWord,
        short_mean: d.m || '',
        full_mean: full.full_mean || d.m || '',
        ipa: full.ipa || d.i || '',
        pos: full.pos || d.p || '',
        html: full.html || '',
      };
    }
  }

  return null;
}

export function lookupSentenceWords(sentence: string): Record<string, string> {
  const dict = getQuickDict();
  const words = sentence.split(/\s+/).map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '').toLowerCase()).filter(Boolean);
  const result: Record<string, string> = {};

  for (const w of words) {
    if (!result[w]) {
      const match = lookupWord(w);
      if (match && match.short_mean) {
        result[w] = match.short_mean;
      }
    }
  }

  return result;
}
