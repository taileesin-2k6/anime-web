import { NextRequest, NextResponse } from 'next/server';
import {
  tokenizeSubtitleSentence,
  lookupLocalDb,
  lookupGroqAiFallback,
  getSearchSuggestions,
} from '@/lib/pipelineDict';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const suggest = searchParams.get('suggest') || searchParams.get('q');
  const word = searchParams.get('word');
  const sentence = searchParams.get('sentence');
  const context = searchParams.get('context') || '';

  // 1. Instant prefix suggestions (TFlat style)
  if (suggest) {
    const limit = parseInt(searchParams.get('limit') || '8', 10);
    const suggestions = getSearchSuggestions(suggest, limit);
    return NextResponse.json({ suggestions });
  }

  // 2. Batch sentence tokenization & instant meaning resolution
  if (sentence) {
    const tokens = tokenizeSubtitleSentence(sentence);
    const meaningsMap: Record<string, string> = {};
    for (const t of tokens) {
      if (t.clean && t.meaning) {
        meaningsMap[t.clean] = t.meaning;
      }
    }
    return NextResponse.json({
      tokens,
      meanings: meaningsMap,
    });
  }

  if (!word) {
    return NextResponse.json({ error: 'Word, sentence, or suggest query is required' }, { status: 400 });
  }

  const cleanWord = word.trim();

  // 2. Query Local Database (MinhQND + Kaikki/Wiktionary + Linguatools)
  const localResult = await lookupLocalDb(cleanWord);
  if (localResult) {
    return NextResponse.json(localResult);
  }

  // 3. Fallback: Groq AI
  const aiResult = await lookupGroqAiFallback(cleanWord, context || undefined);
  return NextResponse.json(aiResult);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const word = (body.word || '').trim();
    const sentence = body.batch_sentence || body.sentence;
    const context = body.context || '';

    if (sentence) {
      const tokens = tokenizeSubtitleSentence(sentence);
      const meaningsMap: Record<string, string> = {};
      for (const t of tokens) {
        if (t.clean && t.meaning) {
          meaningsMap[t.clean] = t.meaning;
        }
      }
      return NextResponse.json({
        tokens,
        meanings: meaningsMap,
      });
    }

    if (!word) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    const localResult = await lookupLocalDb(word);
    if (localResult) {
      return NextResponse.json(localResult);
    }

    const aiResult = await lookupGroqAiFallback(word, context || undefined);
    return NextResponse.json(aiResult);
  } catch (error: any) {
    console.error('Dictionary API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
