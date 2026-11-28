import fs from 'fs';
import path from 'path';
import { tokenizeSubtitleSentence } from '../src/lib/pipelineDict.ts';

const WORKSPACE = path.resolve(process.cwd());
const PUBLIC_SUBTITLES = path.join(WORKSPACE, 'public', 'subtitles');
const DATA_SUBTITLES = path.join(WORKSPACE, 'data', 'subtitles');

function prebakeFile(filePath) {
  if (!fs.existsSync(filePath)) return { count: 0, phrases: 0 };
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    if (!data.en || !Array.isArray(data.en)) return { count: 0, phrases: 0 };

    let phraseCount = 0;
    for (const cue of data.en) {
      if (cue.text) {
        const tokens = tokenizeSubtitleSentence(cue.text);
        cue.tokens = tokens;
        for (const t of tokens) {
          if (t.isPhrase) phraseCount++;
        }
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { count: data.en.length, phrases: phraseCount };
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
    return { count: 0, phrases: 0 };
  }
}

function main() {
  const args = process.argv.slice(2);
  const fileArgIdx = args.indexOf('--file');

  if (fileArgIdx !== -1 && args[fileArgIdx + 1]) {
    const targetFile = path.resolve(args[fileArgIdx + 1]);
    console.log(`[*] Pre-baking collocations for single file: ${targetFile}`);
    const res = prebakeFile(targetFile);
    console.log(`[+] Hoàn tất: ${res.count} câu thoại, ${res.phrases} cụm từ Collocation/Idiom/Phrasal được nhận diện.`);
    return;
  }

  console.log('[*] Pre-baking collocations & idioms for all anime subtitles...');

  const dirs = [PUBLIC_SUBTITLES, DATA_SUBTITLES];
  const processedFiles = new Set();
  let totalPhrases = 0;
  let totalFiles = 0;

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const res = prebakeFile(fullPath);
      totalPhrases += res.phrases;
      totalFiles++;
      console.log(`  ✓ ${file}: ${res.count} câu, ${res.phrases} cụm từ`);
    }
  }

  console.log(`\n🎉 THÀNH CÔNG! Đã xử lý ${totalFiles} file phụ đề, nhận diện tổng cộng ${totalPhrases} cụm từ tô vàng.`);
}

main();
