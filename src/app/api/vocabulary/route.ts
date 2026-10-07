import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const VOCAB_FILE = path.join(process.cwd(), 'data/vocabularies.json');

export interface SavedVocabularyItem {
  id: string;
  userEmail: string;
  word: string;
  meaning: string;
  ipa?: string;
  pos?: string;
  phraseType?: string;
  contextSentence: string;
  animeTitle: string;
  animeSlug: string;
  episodeNumber: number;
  createdAt: string;
}

function getVocabularies(): SavedVocabularyItem[] {
  try {
    if (fs.existsSync(VOCAB_FILE)) {
      return JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading vocabularies.json:', e);
  }
  return [];
}

function saveVocabularies(items: SavedVocabularyItem[]) {
  try {
    fs.writeFileSync(VOCAB_FILE, JSON.stringify(items, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing vocabularies.json:', e);
  }
}

// GET: Fetch saved words for a specific user email
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const email = (searchParams.get('email') || '').trim().toLowerCase();

  if (!email) {
    return NextResponse.json(
      { error: 'Email là bắt buộc để tải danh sách từ vựng cá nhân.' },
      { status: 400 }
    );
  }

  const allVocabs = getVocabularies();
  const userVocabs = allVocabs
    .filter((v) => (v.userEmail || '').toLowerCase() === email)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    vocabularies: userVocabs,
    total: userVocabs.length,
  });
}

// POST: Save a new word to user's notebook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || body.userEmail || '').trim().toLowerCase();
    const word = (body.word || '').trim();
    const meaning = (body.meaning || body.short_mean || '').trim();
    const ipa = body.ipa || '';
    const pos = body.pos || '';
    const phraseType = body.phraseType || body.phrase_type || 'single';
    const contextSentence = (body.contextSentence || body.sentence || '').trim();
    const animeTitle = (body.animeTitle || 'Anime Song Ngữ').trim();
    const animeSlug = (body.animeSlug || '').trim();
    const episodeNumber = Number(body.episodeNumber) || 1;

    if (!email) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để lưu từ vựng vào Sổ tay cá nhân!' },
        { status: 401 }
      );
    }

    if (!word) {
      return NextResponse.json(
        { error: 'Từ vựng không được để trống.' },
        { status: 400 }
      );
    }

    const allVocabs = getVocabularies();

    // Check if duplicate entry exists for this user (same word and same episode/sentence)
    const existingIndex = allVocabs.findIndex(
      (v) =>
        (v.userEmail || '').toLowerCase() === email &&
        v.word.toLowerCase() === word.toLowerCase() &&
        (v.contextSentence === contextSentence || v.episodeNumber === episodeNumber)
    );

    if (existingIndex !== -1) {
      // Update meaning if missing
      if (meaning && !allVocabs[existingIndex].meaning) {
        allVocabs[existingIndex].meaning = meaning;
        saveVocabularies(allVocabs);
      }
      return NextResponse.json({
        success: true,
        item: allVocabs[existingIndex],
        message: 'Từ vựng đã có trong sổ tay của bạn.',
      });
    }

    const newItem: SavedVocabularyItem = {
      id: `voc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userEmail: email,
      word,
      meaning: meaning || 'Đang cập nhật nghĩa...',
      ipa,
      pos,
      phraseType,
      contextSentence,
      animeTitle,
      animeSlug,
      episodeNumber,
      createdAt: new Date().toISOString(),
    };

    allVocabs.unshift(newItem);
    saveVocabularies(allVocabs);

    return NextResponse.json({
      success: true,
      item: newItem,
      message: 'Đã lưu từ vựng vào Sổ tay cá nhân thành công!',
    });
  } catch (error: any) {
    console.error('Save Vocabulary Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi lưu từ vựng' },
      { status: 500 }
    );
  }
}

// DELETE: Remove word from notebook by id or word
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    const word = searchParams.get('word');
    const email = (searchParams.get('email') || '').trim().toLowerCase();

    if (!email || (!id && !word)) {
      return NextResponse.json(
        { error: 'Email và ID hoặc Từ vựng là bắt buộc.' },
        { status: 400 }
      );
    }

    let allVocabs = getVocabularies();
    const initialLen = allVocabs.length;
    allVocabs = allVocabs.filter((v) => {
      if ((v.userEmail || '').toLowerCase() !== email) return true;
      if (id && v.id === id) return false;
      if (word && v.word.toLowerCase() === word.toLowerCase().trim()) return false;
      return true;
    });

    saveVocabularies(allVocabs);
    return NextResponse.json({ success: true, message: 'Đã xoá từ vựng khỏi sổ tay.' });
  } catch (error: any) {
    console.error('Delete Vocabulary Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xoá từ vựng' },
      { status: 500 }
    );
  }
}
