import fs from 'fs';
import path from 'path';

export interface DefinitionItem {
  pos: string;
  meaning: string;
  example?: string | null;
}

export interface SubtitleToken {
  text: string;
  clean: string;
  isPhrase: boolean;
  phraseType: 'single' | 'phrasal' | 'idiom' | 'collocation' | 'slang' | 'punct';
  meaning: string;
  ipa?: string;
  pos?: string;
  score?: number;
}

export interface WordInflection {
  root: string;
  type: string;
  label: string;
}

export interface DictLookupResult {
  word: string;
  root_word?: string;
  inflection?: WordInflection;
  short_mean: string;
  full_mean?: string;
  ipa?: string;
  pos?: string;
  pos_list?: string[];
  definitions?: DefinitionItem[];
  related_words?: string[];
  examples?: string;
  phrase_type?: 'single' | 'phrasal' | 'idiom' | 'collocation' | 'slang';
  audio_url?: string;
  audio_us_url?: string;
  audio_uk_url?: string;
  source: string;
  is_ai?: boolean;
}

let phrasesIndexCache: Record<string, { t: string; m: string; en?: string; ex?: string; s: number }> | null = null;
let quickWordsCache: Record<string, { m: string; i?: string; p?: string }> | null = null;
let inflectionsCache: Record<string, WordInflection> | null = null;
const letterChunksCache = new Map<string, Record<string, any>>();

function getPhrasesIndex(): Record<string, { t: string; m: string; en?: string; ex?: string; s: number }> {
  if (!phrasesIndexCache) {
    try {
      const pPath = path.join(process.cwd(), 'data/dict/phrases_index.json');
      if (fs.existsSync(pPath)) {
        phrasesIndexCache = JSON.parse(fs.readFileSync(pPath, 'utf8'));
      } else {
        phrasesIndexCache = {};
      }
    } catch (e) {
      console.error('Failed to load phrases_index.json:', e);
      phrasesIndexCache = {};
    }
  }
  return phrasesIndexCache!;
}

function getQuickWords(): Record<string, { m: string; i?: string; p?: string }> {
  if (!quickWordsCache) {
    try {
      const wPath = path.join(process.cwd(), 'data/dict/quick_words.json');
      if (fs.existsSync(wPath)) {
        quickWordsCache = JSON.parse(fs.readFileSync(wPath, 'utf8'));
      } else {
        quickWordsCache = {};
      }
    } catch (e) {
      console.error('Failed to load quick_words.json:', e);
      quickWordsCache = {};
    }
  }
  return quickWordsCache!;
}

function getInflections(): Record<string, WordInflection> {
  if (!inflectionsCache) {
    try {
      const iPath = path.join(process.cwd(), 'data/dict/inflections.json');
      if (fs.existsSync(iPath)) {
        inflectionsCache = JSON.parse(fs.readFileSync(iPath, 'utf8'));
      } else {
        inflectionsCache = {};
      }
    } catch (e) {
      console.error('Failed to load inflections.json:', e);
      inflectionsCache = {};
    }
  }
  return inflectionsCache!;
}

function getLetterChunk(char: string): Record<string, any> {
  const key = (char || '_').toLowerCase();
  if (letterChunksCache.has(key)) return letterChunksCache.get(key)!;
  try {
    const filePath = path.join(process.cwd(), `data/dict/pipeline_chunks/${key}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      letterChunksCache.set(key, data);
      return data;
    }
  } catch (e) {
    console.error(`Failed to load chunk ${key}:`, e);
  }
  return {};
}

/**
 * Detect word inflections (irregular verbs, past tense, past participle, V-ing, plurals, comparatives)
 */
export function detectInflection(word: string): WordInflection | null {
  const w = word.toLowerCase().trim();
  if (!w || w.length <= 2) return null;

  const irreg = getInflections();
  if (irreg[w]) {
    return irreg[w];
  }

  const wordsIdx = getQuickWords();

  // V-ing
  if (w.endsWith('ing') && w.length > 4) {
    const cand1 = w.slice(0, -3) + 'e'; // making -> make, dancing -> dance
    const cand2 = w.slice(0, -3);       // starting -> start, walking -> walk
    const cand3 = w.length > 5 && w[w.length - 4] === w[w.length - 5] ? w.slice(0, -4) : null; // running -> run, swimming -> swim
    const cand4 = w.endsWith('ying') ? w.slice(0, -4) + 'ie' : null; // dying -> die, lying -> lie

    for (const cand of [cand1, cand2, cand3, cand4]) {
      if (cand && wordsIdx[cand] && cand !== w) {
        return { root: cand, type: 'v_ing', label: 'Dạng V-ing của' };
      }
    }
  }

  // V-ed / Past
  if (w.endsWith('ed') && w.length > 3) {
    const cand1 = w.slice(0, -1); // liked -> like, lived -> live
    const cand2 = w.slice(0, -2); // started -> start, walked -> walk
    const cand3 = w.endsWith('ied') ? w.slice(0, -3) + 'y' : null; // studied -> study
    const cand4 = w.length > 4 && w[w.length - 3] === w[w.length - 4] ? w.slice(0, -3) : null; // stopped -> stop

    for (const cand of [cand1, cand2, cand3, cand4]) {
      if (cand && wordsIdx[cand] && cand !== w) {
        return { root: cand, type: 'past', label: 'Dạng Quá khứ / Phân từ (V-ed) của' };
      }
    }
  }

  // Helper for -s/-es/-ies endings: accurately distinguish Noun Plural vs Verb 3rd singular
  const getPluralOr3rdLabel = (cand: string) => {
    const entry = wordsIdx[cand];
    const pos = entry?.p || '';
    if (pos.includes('Động từ') && !pos.includes('Danh từ')) {
      return { type: '3rd_singular', label: 'Ngôi thứ 3 số ít của' };
    }
    return { type: 'plural', label: 'Dạng số nhiều của' };
  };

  // Plural / 3rd singular
  if (w.endsWith('ies') && w.length > 4) {
    const cand = w.slice(0, -3) + 'y';
    if (wordsIdx[cand] && cand !== w) {
      const info = getPluralOr3rdLabel(cand);
      return { root: cand, type: info.type, label: info.label };
    }
  }

  if (w.endsWith('es') && w.length > 3) {
    const isSpecialEnding = /(sses|shes|ches|xes|zes|oes)$/.test(w);
    const candOrder = isSpecialEnding
      ? [w.slice(0, -2), w.slice(0, -1)]
      : [w.slice(0, -1), w.slice(0, -2)];

    for (const cand of candOrder) {
      if (wordsIdx[cand] && cand !== w) {
        const info = getPluralOr3rdLabel(cand);
        return { root: cand, type: info.type, label: info.label };
      }
    }
  }

  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    const cand = w.slice(0, -1);
    if (wordsIdx[cand] && cand !== w) {
      const info = getPluralOr3rdLabel(cand);
      return { root: cand, type: info.type, label: info.label };
    }
  }

  // Comparative / Superlative
  if (w.endsWith('est') && w.length > 4) {
    const cand1 = w.slice(0, -3);
    const cand2 = w.slice(0, -2);
    const cand3 = w.endsWith('iest') ? w.slice(0, -4) + 'y' : null;
    const cand4 = w.length > 5 && w[w.length - 4] === w[w.length - 5] ? w.slice(0, -4) : null;
    for (const cand of [cand1, cand2, cand3, cand4]) {
      if (cand && wordsIdx[cand] && cand !== w) {
        return { root: cand, type: 'superlative', label: 'Dạng so sánh nhất của' };
      }
    }
  }

  if (w.endsWith('er') && w.length > 4) {
    const cand1 = w.slice(0, -2);
    const cand2 = w.slice(0, -1);
    const cand3 = w.endsWith('ier') ? w.slice(0, -3) + 'y' : null;
    const cand4 = w.length > 5 && w[w.length - 3] === w[w.length - 4] ? w.slice(0, -3) : null;
    for (const cand of [cand1, cand2, cand3, cand4]) {
      if (cand && wordsIdx[cand] && cand !== w) {
        return { root: cand, type: 'comparative', label: 'Dạng so sánh hơn của' };
      }
    }
  }

  return null;
}

const DETERMINERS_AND_POSSESSIVES = new Set([
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'whose',
  'some', 'any', 'every', 'each', 'no', 'another', 'such', 'what', 'which',
  'many', 'few', 'several', 'much', 'enough', 'all', 'both', 'one',
]);

const VERB_INDICATORS = new Set([
  'to', 'will', 'would', 'can', 'could', 'shall', 'should', 'may', 'might', 'must',
  'do', 'does', 'did', 'done',
  'have', 'has', 'had', 'having',
  'is', 'am', 'are', 'was', 'were', 'been', 'being',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'who', 'whom',
  'please', 'let', 'lets', 'not', "don't", "doesn't", "didn't", "won't", "can't",
  'always', 'never', 'often', 'usually', 'suddenly', 'quickly', 'slowly', 'just', 'already', 'then',
]);

const PARTICLES_OR_PREPOSITIONS = new Set([
  'in', 'on', 'at', 'to', 'into', 'of', 'by', 'for', 'with', 'from', 'about',
  'between', 'through', 'under', 'over', 'out', 'up', 'down', 'off', 'away', 'back',
]);

function isAdjectiveWord(word: string, wordsIdx: Record<string, any>): boolean {
  if (!word) return false;
  const w = word.toLowerCase();
  const entry = wordsIdx[w];
  if (entry && entry.p && (entry.p.includes('Tính từ') || entry.p.toLowerCase().includes('adj'))) {
    return true;
  }
  return /(ful|ous|ive|able|ible|ic|al|ent|ant|less|ary|ory|est)$/.test(w);
}

/**
 * Validates whether a candidate phrase match makes sense syntactically in context
 */
function isPosValidPhrase(
  firstWord: string,
  pData: { t?: string; m?: string },
  prevWord1: string,
  prevWord2: string,
  wordsIdx: Record<string, any>
): boolean {
  const pType = pData.t || 'phrasal';

  // Check 2-word Phrasal Verbs (e.g. "figure in", "point to", "hand on", "water down")
  if (pType === 'phrasal') {
    if (prevWord1) {
      // Case 1: [Determiner / Article / Possessive] + [FirstWord]
      // e.g. "a figure in", "the point in", "his hand on", "their face in"
      if (DETERMINERS_AND_POSSESSIVES.has(prevWord1)) {
        return false;
      }

      // Case 2: [Adjective] + [FirstWord]
      // e.g. "powerful figure in", "main point to", "cold water in", "small room on"
      if (isAdjectiveWord(prevWord1, wordsIdx) && !VERB_INDICATORS.has(prevWord1)) {
        return false;
      }

      // Case 3: [Determiner] + [Adverb/Adjective] + [FirstWord]
      // e.g. "a most powerful figure in", "the very best point to"
      if (
        prevWord2 &&
        DETERMINERS_AND_POSSESSIVES.has(prevWord2) &&
        (isAdjectiveWord(prevWord1, wordsIdx) || ['most', 'more', 'very', 'quite', 'so', 'too'].includes(prevWord1))
      ) {
        return false;
      }

      // Case 4: [Noun] + [FirstWord] (Compound Noun)
      // e.g. "palace figure in", "table room on"
      const prev1Entry = wordsIdx[prevWord1];
      if (
        prev1Entry &&
        prev1Entry.p &&
        prev1Entry.p.includes('Danh từ') &&
        !prev1Entry.p.includes('Động từ') &&
        !VERB_INDICATORS.has(prevWord1)
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Tokenize a subtitle sentence into words and phrases
 * (greedy longest n-gram matching with inflected verb stemming & POS context validation)
 */
export function tokenizeSubtitleSentence(sentence: string): SubtitleToken[] {
  if (!sentence) return [];
  const phrasesIdx = getPhrasesIndex();
  const wordsIdx = getQuickWords();

  // Split sentence into words and puncts
  const rawTokens = sentence.match(/[A-Za-z0-9']+|[^\s\w]/g) || [];
  const tokens: SubtitleToken[] = [];
  let i = 0;
  const n = rawTokens.length;

  while (i < n) {
    const raw = rawTokens[i];
    if (!/^[A-Za-z0-9]/.test(raw)) {
      tokens.push({
        text: raw,
        clean: '',
        isPhrase: false,
        phraseType: 'punct',
        meaning: '',
      });
      i += 1;
      continue;
    }

    let matchedPhraseKey: string | null = null;
    let matchedData: { t: string; m: string; en?: string; ex?: string; s: number } | null = null;
    let matchedRawLen = 0;

    // Check longest phrase window from 10 down to 2 raw tokens (captures idioms with punctuation like "blood, sweat, and tears")
    for (let k = Math.min(10, n - i); k >= 2; k--) {
      const sliceRaw = rawTokens.slice(i, i + k);
      const wordsInWindow = sliceRaw
        .filter((t) => /^[A-Za-z0-9]/.test(t))
        .map((t) => t.toLowerCase().replace(/^'+|'+$/g, ''));

      if (wordsInWindow.length < 2) continue;

      const candJoined = wordsInWindow.join(' ');
      let pEntry = phrasesIdx[candJoined];
      let rootKey = candJoined;

      // Stemmed first word check (e.g. 'puts in' -> 'put in', 'taking off' -> 'take off', 'gave up' -> 'give up')
      if (!pEntry && wordsInWindow.length >= 2) {
        const firstInf = detectInflection(wordsInWindow[0]);
        if (firstInf) {
          const stemmedCand = [firstInf.root, ...wordsInWindow.slice(1)].join(' ');
          if (phrasesIdx[stemmedCand]) {
            pEntry = phrasesIdx[stemmedCand];
            rootKey = stemmedCand;
          }
        }
      }

      if (pEntry) {
        const prevWords = rawTokens
          .slice(0, i)
          .filter((t) => /^[A-Za-z0-9]/.test(t))
          .map((t) => t.toLowerCase().replace(/^'+|'+$/g, ''));
        const prev1 = prevWords.length > 0 ? prevWords[prevWords.length - 1] : '';
        const prev2 = prevWords.length > 1 ? prevWords[prevWords.length - 2] : '';

        if (isPosValidPhrase(wordsInWindow[0], pEntry, prev1, prev2, wordsIdx)) {
          matchedPhraseKey = rootKey;
          matchedData = pEntry;
          matchedRawLen = k;
          break;
        }
      }
    }

    if (matchedPhraseKey && matchedData) {
      // Reconstruct raw text cleanly with spaces between words
      let rawText = '';
      for (let j = 0; j < matchedRawLen; j++) {
        const tok = rawTokens[i + j];
        if (j > 0 && /^[A-Za-z0-9]/.test(tok)) rawText += ' ';
        rawText += tok;
      }

      tokens.push({
        text: rawText,
        clean: matchedPhraseKey,
        isPhrase: true,
        phraseType: (matchedData.t as any) || 'phrasal',
        meaning: matchedData.m || '',
        score: matchedData.s || 100,
      });
      i += matchedRawLen;
    } else {
      const wClean = raw.toLowerCase().replace(/^'+|'+$/g, '');
      let wData = wordsIdx[wClean];

      // Accurate Inflection & Stemming fallback for single words
      if (!wData) {
        const inf = detectInflection(wClean);
        if (inf && wordsIdx[inf.root]) {
          wData = wordsIdx[inf.root];
        }
      }

      tokens.push({
        text: raw,
        clean: wClean,
        isPhrase: false,
        phraseType: 'single',
        meaning: wData?.m || '',
        ipa: wData?.i || '',
        pos: wData?.p || '',
      });
      i += 1;
    }
  }

  return tokens;
}

/**
 * Perform local lookup in Skypedia & Phrases
 */
export function lookupLocalDb(term: string): DictLookupResult | null {
  const clean = term.toLowerCase().trim().replace(/^[^a-z0-9\s]+|[^a-z0-9\s]+$/g, '');
  if (!clean) return null;

  // 1. Check phrases if multi-word (Direct & Inflected Form)
  if (clean.includes(' ')) {
    const phrasesIdx = getPhrasesIndex();
    if (phrasesIdx[clean]) {
      const p = phrasesIdx[clean];
      return {
        word: term,
        short_mean: p.m,
        full_mean: p.en || p.m,
        examples: p.ex || '',
        phrase_type: (p.t as any) || 'phrasal',
        audio_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=2`,
        audio_us_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=2`,
        audio_uk_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=1`,
        source: p.t === 'collocation' ? 'Oxford & Cambridge Collocations' : 'Phrasal Verbs & Idioms',
      };
    }

    // Stemmed multiword lookup (e.g. "puts in" -> "put in", "took off" -> "take off")
    const words = clean.split(/\s+/);
    if (words.length >= 2) {
      const firstInf = detectInflection(words[0]);
      if (firstInf) {
        const rootKey = [firstInf.root, ...words.slice(1)].join(' ');
        if (phrasesIdx[rootKey]) {
          const p = phrasesIdx[rootKey];
          let infLabel = `Dạng chia thì của cụm từ gốc "${rootKey}"`;
          if (firstInf.type === 'past') {
            infLabel = `Dạng Quá khứ / Phân từ của cụm từ gốc "${rootKey}"`;
          } else if (firstInf.type === 'v_ing') {
            infLabel = `Dạng V-ing của cụm từ gốc "${rootKey}"`;
          } else if (firstInf.type === '3rd_singular' || firstInf.type === 'plural') {
            infLabel = `Ngôi thứ 3 số ít (Hiện tại đơn) của cụm từ gốc "${rootKey}"`;
          }

          return {
            word: term,
            root_word: rootKey,
            inflection: {
              root: rootKey,
              type: firstInf.type,
              label: infLabel,
            },
            short_mean: p.m,
            full_mean: p.en || p.m,
            examples: p.ex || '',
            phrase_type: (p.t as any) || 'phrasal',
            audio_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(rootKey)}&type=2`,
            audio_us_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(rootKey)}&type=2`,
            audio_uk_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(rootKey)}&type=1`,
            source: p.t === 'collocation' ? 'Oxford & Cambridge Collocations' : 'Phrasal Verbs & Idioms',
          };
        }
      }
    }
    return null;
  }


  const inflection = detectInflection(clean) || undefined;

  // 2. Pure Skypedia single word lookup
  const chunk = getLetterChunk(clean[0] || '_');

  if (chunk[clean]) {
    const entry = chunk[clean];
    return {
      word: term,
      root_word: inflection?.root,
      inflection: inflection,
      short_mean: entry.short_mean || '',
      ipa: entry.ipa || '',
      pos: entry.pos || '',
      pos_list: entry.pos_list || (entry.pos ? entry.pos.split(' / ') : []),
      definitions: entry.definitions || [],
      related_words: entry.related_words || [],
      phrase_type: 'single',
      audio_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=2`,
      audio_us_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=2`,
      audio_uk_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=1`,
      source: 'Từ Điển Anh - Việt (Skypedia)',
    };
  }

  // 3. If inflection root word exists, load root word entry
  if (inflection?.root) {
    const rootChunk = getLetterChunk(inflection.root[0] || '_');
    if (rootChunk[inflection.root]) {
      const entry = rootChunk[inflection.root];
      return {
        word: term,
        root_word: inflection.root,
        inflection: inflection,
        short_mean: entry.short_mean || '',
        ipa: entry.ipa || '',
        pos: entry.pos || '',
        pos_list: entry.pos_list || (entry.pos ? entry.pos.split(' / ') : []),
        definitions: entry.definitions || [],
        related_words: entry.related_words || [],
        phrase_type: 'single',
        audio_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(inflection.root)}&type=2`,
        audio_us_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(inflection.root)}&type=2`,
        audio_uk_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(inflection.root)}&type=1`,
        source: 'Từ Điển Anh - Việt (Skypedia)',
      };
    }
  }

  return null;
}

/**
 * AI Fallback: Groq openai/gpt-oss-120b for contextual word/phrase translation
 */
export async function lookupGroqAiFallback(
  term: string,
  contextSentence?: string
): Promise<DictLookupResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      word: term,
      short_mean: 'Không tìm thấy từ trong từ điển',
      full_mean: 'Vui lòng cấu hình GROQ_API_KEY để kích hoạt tính năng dịch AI theo ngữ cảnh.',
      audio_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(term)}&type=2`,
      source: 'Local Fallback',
    };
  }

  try {
    const prompt = `You are a concise English-to-Vietnamese translation assistant for anime subtitles.
Context sentence: "${contextSentence || term}"
Target word or phrase to explain: "${term}"

Return ONLY a JSON object with this exact schema:
{
  "short_mean": "Ngắn gọn nghĩa tiếng Việt đúng ngữ cảnh (dưới 10 từ)",
  "full_mean": "Giải thích chi tiết nghĩa và ngữ cảnh sử dụng trong câu",
  "pos": "từ loại (noun, verb, phrasal verb, idiom, collocation, adj, adv)",
  "ipa": "/phiên âm IPA nếu có/"
}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq API error: ${res.statusText}`);
    }

    const data = await res.json();
    const content = JSON.parse(data.choices[0]?.message?.content || '{}');

    return {
      word: term,
      short_mean: content.short_mean || 'Dịch AI theo ngữ cảnh',
      full_mean: content.full_mean || '',
      ipa: content.ipa || '',
      pos: content.pos || '',
      audio_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(term)}&type=2`,
      audio_us_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(term)}&type=2`,
      audio_uk_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(term)}&type=1`,
      source: 'Groq AI (Contextual)',
      is_ai: true,
    };
  } catch (error: any) {
    console.error('Groq AI lookup error:', error);
    return {
      word: term,
      short_mean: 'Không tìm thấy từ trong từ điển',
      full_mean: error.message,
      audio_url: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(term)}&type=2`,
      source: 'Groq Fallback Error',
    };
  }
}

export interface SearchSuggestionItem {
  word: string;
  ipa?: string;
  pos?: string;
  short_mean: string;
  phrase_type?: 'single' | 'phrasal' | 'idiom' | 'collocation' | 'slang';
  is_phrase?: boolean;
}

/**
 * Fast prefix auto-complete search suggestions (similar to TFlat)
 */
export function getSearchSuggestions(query: string, limit: number = 8): SearchSuggestionItem[] {
  const q = (query || '').toLowerCase().trim();
  if (!q || q.length < 1) return [];

  const results: SearchSuggestionItem[] = [];
  const seen = new Set<string>();

  const quickWords = getQuickWords();
  const phrasesIdx = getPhrasesIndex();

  // 1. Exact match first if exists
  if (phrasesIdx[q]) {
    const p = phrasesIdx[q];
    results.push({
      word: q,
      short_mean: p.m,
      phrase_type: (p.t as any) || 'phrasal',
      is_phrase: true,
    });
    seen.add(q);
  } else if (quickWords[q]) {
    const w = quickWords[q];
    results.push({
      word: q,
      ipa: w.i,
      pos: w.p,
      short_mean: w.m,
      phrase_type: 'single',
    });
    seen.add(q);
  }

  // 2. Prefix match for Collocations & Phrases
  for (const [key, p] of Object.entries(phrasesIdx)) {
    if (results.length >= limit) break;
    if (!seen.has(key) && key.startsWith(q)) {
      results.push({
        word: key,
        short_mean: p.m,
        phrase_type: (p.t as any) || 'phrasal',
        is_phrase: true,
      });
      seen.add(key);
    }
  }

  // 3. Prefix match for Words
  for (const [key, w] of Object.entries(quickWords)) {
    if (results.length >= limit) break;
    if (!seen.has(key) && key.startsWith(q)) {
      results.push({
        word: key,
        ipa: w.i,
        pos: w.p,
        short_mean: w.m,
        phrase_type: 'single',
      });
      seen.add(key);
    }
  }

  // 4. Substring contains match if still under limit
  if (results.length < limit && q.length >= 3) {
    for (const [key, p] of Object.entries(phrasesIdx)) {
      if (results.length >= limit) break;
      if (!seen.has(key) && key.includes(q)) {
        results.push({
          word: key,
          short_mean: p.m,
          phrase_type: (p.t as any) || 'phrasal',
          is_phrase: true,
        });
        seen.add(key);
      }
    }
  }

  return results;
}
