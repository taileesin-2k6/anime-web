import os
import json
import sqlite3
import urllib.request
import re

DICT_DIR = "data/dict"
os.makedirs(DICT_DIR, exist_ok=True)
SKYPE_DB_PATH = os.path.join(DICT_DIR, "skypedia.db")
PHRASES_JSON_PATH = os.path.join(DICT_DIR, "phrases.json")
CHUNKS_DIR = os.path.join(DICT_DIR, "pipeline_chunks")
os.makedirs(CHUNKS_DIR, exist_ok=True)

print("=== Step 1: Downloading & Prepping Skypedia English-Vietnamese Dictionary ===")
if not os.path.exists(SKYPE_DB_PATH) or os.path.getsize(SKYPE_DB_PATH) < 10000000:
    url = "https://raw.githubusercontent.com/skypediacode/english-vietnamese-dictionary/main/dictionary_en_vi.db"
    print(f"Downloading from {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as res:
        with open(SKYPE_DB_PATH, "wb") as f:
            f.write(res.read())
    print("Downloaded skypedia.db successfully!")
else:
    print("skypedia.db ready.")

POS_MAP = {
    'N': 'Danh từ',
    'NOUN': 'Danh từ',
    'V': 'Động từ',
    'VERB': 'Động từ',
    'A': 'Tính từ',
    'ADJ': 'Tính từ',
    'ADJECTIVE': 'Tính từ',
    'D': 'Phó từ',
    'ADV': 'Phó từ',
    'ADVERB': 'Phó từ',
    'E': 'Giới từ',
    'PREP': 'Giới từ',
    'PREPOSITION': 'Giới từ',
    'C': 'Liên từ',
    'CONJ': 'Liên từ',
    'CONJUNCTION': 'Liên từ',
    'P': 'Đại từ',
    'PRON': 'Đại từ',
    'PRONOUN': 'Đại từ',
    'I': 'Thán từ',
    'INTERJ': 'Thán từ',
    'INTERJECTION': 'Thán từ',
    'X': 'Cụm từ',
    'PHRASE': 'Cụm từ',
    'NUM': 'Số từ',
    'ART': 'Mạo từ',
}

# Core fundamental words to guarantee 100% correct primary pronoun/adverb/article meanings
CORE_ESSENTIAL_WORDS = {
    "who": {
        "ipa": "/huː/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Ai, người nào, người mà.", "example": "Who is that person?"},
            {"pos": "Đại từ quan hệ", "meaning": "Người mà, kẻ mà (dùng làm chủ ngữ mệnh đề quan hệ).", "example": "The man who called you is my friend."},
            {"pos": "Danh từ", "meaning": "Tổ chức Y tế Thế giới (viết tắt WHO).", "example": "WHO helps countries improve public health."}
        ]
    },
    "why": {
        "ipa": "/waɪ/",
        "pos": "Phó từ",
        "definitions": [
            {"pos": "Phó từ", "meaning": "Tại sao, vì sao, vì lẽ gì.", "example": "Why are you crying?"},
            {"pos": "Liên từ", "meaning": "Lý do mà, vì sao.", "example": "That is why I love anime."},
            {"pos": "Thán từ", "meaning": "Ủa, chà (thể hiện sự ngạc nhiên).", "example": "Why, look who is here!"}
        ]
    },
    "which": {
        "ipa": "/wɪtʃ/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Cái nào, con nào, người nào.", "example": "Which do you prefer?"},
            {"pos": "Đại từ quan hệ", "meaning": "Cái mà, điều mà.", "example": "The movie which we watched was great."},
            {"pos": "Tính từ", "meaning": "Nào, nào đó.", "example": "Which way is the station?"}
        ]
    },
    "whom": {
        "ipa": "/huːm/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Ai, người nào (ở vị trí tân ngữ).", "example": "Whom did you meet?"},
            {"pos": "Đại từ quan hệ", "meaning": "Người mà (tân ngữ mệnh đề quan hệ).", "example": "The girl whom I saw yesterday."}
        ]
    },
    "whose": {
        "ipa": "/huːz/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Của ai.", "example": "Whose turn is it?"},
            {"pos": "Đại từ quan hệ", "meaning": "Của người mà, mà có.", "example": "The author whose book won the award."}
        ]
    },
    "what": {
        "ipa": "/wʌt/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Cái gì, điều gì.", "example": "What are you doing?"},
            {"pos": "Tính từ", "meaning": "Gì, nào.", "example": "What time is it?"}
        ]
    },
    "where": {
        "ipa": "/wer/",
        "pos": "Phó từ",
        "definitions": [
            {"pos": "Phó từ", "meaning": "Ở đâu, nơi nào, đâu.", "example": "Where are you going?"},
            {"pos": "Liên từ", "meaning": "Nơi mà, chỗ mà.", "example": "This is where we first met."}
        ]
    },
    "when": {
        "ipa": "/wen/",
        "pos": "Phó từ",
        "definitions": [
            {"pos": "Phó từ", "meaning": "Khi nào, bao giờ, lúc nào.", "example": "When will you arrive?"},
            {"pos": "Liên từ", "meaning": "Khi, lúc, vào thời điểm.", "example": "Call me when you are ready."}
        ]
    },
    "how": {
        "ipa": "/haʊ/",
        "pos": "Phó từ",
        "definitions": [
            {"pos": "Phó từ", "meaning": "Như thế nào, ra sao, bằng cách nào.", "example": "How does this work?"},
            {"pos": "Phó từ", "meaning": "Bao nhiêu (kết hợp với tính từ/trạng từ: how much, how far, how long).", "example": "How old are you?"}
        ]
    },
    "i": {
        "ipa": "/aɪ/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Tôi, ta, tao, tớ, mình.", "example": "I want to go home."},
            {"pos": "Danh từ", "meaning": "Cái tôi, bản ngã.", "example": "The ego and the I."}
        ]
    },
    "you": {
        "ipa": "/juː/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Bạn, anh, chị, em, cậu, mày, các bạn.", "example": "Thank you very much."}
        ]
    },
    "he": {
        "ipa": "/hiː/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Anh ấy, ông ấy, cậu ấy, nó (nam giới).", "example": "He is a doctor."}
        ]
    },
    "she": {
        "ipa": "/ʃiː/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Cô ấy, bà ấy, chị ấy, nó (nữ giới).", "example": "She is reading a book."}
        ]
    },
    "it": {
        "ipa": "/ɪt/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Nó, cái đó, điều đó.", "example": "It is raining outside."}
        ]
    },
    "we": {
        "ipa": "/wiː/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Chúng tôi, chúng ta, chúng mình.", "example": "We are learning English."}
        ]
    },
    "they": {
        "ipa": "/ðeɪ/",
        "pos": "Đại từ",
        "definitions": [
            {"pos": "Đại từ", "meaning": "Họ, chúng nó, bọn họ.", "example": "They went to school."}
        ]
    },
    "a": {
        "ipa": "/ə/",
        "pos": "Mạo từ",
        "definitions": [
            {"pos": "Mạo từ", "meaning": "Một (mạo từ không xác định trước phụ âm).", "example": "A cat is sleeping."}
        ]
    },
    "an": {
        "ipa": "/ən/",
        "pos": "Mạo từ",
        "definitions": [
            {"pos": "Mạo từ", "meaning": "Một (mạo từ không xác định trước nguyên âm).", "example": "An apple a day keeps the doctor away."}
        ]
    },
    "the": {
        "ipa": "/ðə/",
        "pos": "Mạo từ",
        "definitions": [
            {"pos": "Mạo từ", "meaning": "Cái, con, người (mạo từ xác định).", "example": "The sun rises in the east."}
        ]
    }
}

print("=== Step 2: Processing Skypedia Dictionary Entries ===")
conn_sky = sqlite3.connect(SKYPE_DB_PATH)
cur_sky = conn_sky.cursor()

# 1. Pronunciations map
cur_sky.execute("SELECT w.word, p.ipa FROM words w JOIN pronunciations p ON w.id = p.word_id WHERE p.ipa IS NOT NULL AND p.ipa != ''")
ipa_map = {}
for w, ipa in cur_sky:
    clean_w = w.strip().lower()
    if clean_w not in ipa_map:
        ipa_map[clean_w] = ipa

# 2. Extract definitions and examples
cur_sky.execute("""
SELECT w.word, d.pos, d.definition, wd.example
FROM words w
JOIN word_definitions wd ON w.id = wd.word_id
JOIN definitions d ON wd.definition_id = d.id
""")

word_data_map = {}
skype_phrase_map = {}

for w, pos, definition, example in cur_sky:
    if not w or not definition:
        continue
    clean_w = w.strip().lower()
    pos_label = POS_MAP.get((pos or '').upper(), pos or 'Từ vựng')
    is_multi = ' ' in clean_w or '-' in clean_w

    entry_def = {
        'pos': pos_label,
        'meaning': definition.strip(),
        'example': example.strip() if example else None
    }

    if not is_multi:
        if clean_w not in word_data_map:
            word_data_map[clean_w] = {
                'word': clean_w,
                'ipa': ipa_map.get(clean_w, ''),
                'pos_list': [],
                'definitions': []
            }
        if pos_label not in word_data_map[clean_w]['pos_list']:
            word_data_map[clean_w]['pos_list'].append(pos_label)
        if not any(d['meaning'] == entry_def['meaning'] for d in word_data_map[clean_w]['definitions']):
            word_data_map[clean_w]['definitions'].append(entry_def)
    else:
        if clean_w not in skype_phrase_map:
            skype_phrase_map[clean_w] = {
                'phrase': clean_w,
                'pos_list': [pos_label],
                'definitions': []
            }
        if not any(d['meaning'] == entry_def['meaning'] for d in skype_phrase_map[clean_w]['definitions']):
            skype_phrase_map[clean_w]['definitions'].append(entry_def)

# Inject & prioritize core essential words
for w, cdata in CORE_ESSENTIAL_WORDS.items():
    pos_set = []
    for d in cdata['definitions']:
        if d['pos'] not in pos_set:
            pos_set.append(d['pos'])
    word_data_map[w] = {
        'word': w,
        'ipa': cdata['ipa'],
        'pos_list': pos_set or [cdata['pos']],
        'definitions': cdata['definitions']
    }

print(f"Loaded {len(word_data_map)} structured single words from Skypedia Dictionary.")

# Generate letter chunks and quick words index
quick_words = {}
letter_chunks = {}

for clean_w, data in word_data_map.items():
    short_m = data['definitions'][0]['meaning'] if data['definitions'] else ''
    primary_p = " / ".join(data['pos_list']) if data.get('pos_list') else (data['definitions'][0]['pos'] if data['definitions'] else '')
    
    quick_words[clean_w] = {
        'm': short_m[:100],
        'i': data['ipa'],
        'p': primary_p
    }
    
    char = clean_w[0].lower() if clean_w[0].isalpha() else '_'
    if char not in letter_chunks:
        letter_chunks[char] = {}
    letter_chunks[char][clean_w] = {
        'word': clean_w,
        'ipa': data['ipa'],
        'pos': primary_p,
        'pos_list': data.get('pos_list', []),
        'short_mean': short_m,
        'definitions': data['definitions'],
    }

for char, chunk_data in letter_chunks.items():
    with open(os.path.join(CHUNKS_DIR, f"{char}.json"), "w", encoding="utf-8") as f:
        json.dump(chunk_data, f, ensure_ascii=False)

with open(os.path.join(DICT_DIR, "quick_words.json"), "w", encoding="utf-8") as f:
    json.dump(quick_words, f, ensure_ascii=False)

print(f"Exported quick_words.json ({len(quick_words)} words) and {len(letter_chunks)} chunk files.")

print("=== Step 3: Loading Kaikki / Wiktionary & Collocations Datasets ===")
with open(PHRASES_JSON_PATH, "r", encoding="utf-8") as f:
    raw_kaikki = json.load(f)

if isinstance(raw_kaikki, dict) and 'dictionary' in raw_kaikki:
    kaikki_phrases = raw_kaikki['dictionary']
elif isinstance(raw_kaikki, list):
    kaikki_phrases = raw_kaikki
else:
    kaikki_phrases = list(raw_kaikki.values())

phrases_to_insert = {}

CURATED_PHRASAL_IDIOMS = {
    "give up": ("từ bỏ, đầu hàng, bỏ cuộc", "stop trying or surrender", "phrasal", "Never give up on your dreams"),
    "give in": ("nhượng bộ, chịu thua", "yield or surrender", "phrasal", "He refused to give in to their demands"),
    "give back": ("trả lại", "return something", "phrasal", "Give back what you took"),
    "give away": ("cho đi, tiết lộ", "reveal or donate", "phrasal", "Don't give away the secret"),
    "give off": ("phát ra, tỏa ra", "emit or produce", "phrasal", "The flowers give off a sweet smell"),
    "get over": ("vượt qua, bình phục", "recover from illness or emotional shock", "phrasal", "She will get over the heartbreak"),
    "get by": ("xoay xở, sống qua ngày", "manage with limited resources", "phrasal", "We can get by on this budget"),
    "get along with": ("hòa hợp với ai", "have a friendly relationship with", "phrasal", "I get along with all my classmates"),
    "get along": ("hòa thuận, tiến bộ", "have a good relationship", "phrasal", "They get along very well"),
    "get away with": ("thoát tội, không bị phạt", "escape punishment for", "phrasal", "You can't get away with cheating"),
    "get through": ("vượt qua khó khăn, liên lạc được", "succeed in communicating or endure", "phrasal", "We will get through this crisis"),
    "take care of": ("chăm sóc, lo liệu", "look after or handle", "phrasal", "Take care of yourself"),
    "take off": ("cất cánh, cởi bỏ, phất lên", "depart into air or remove clothing", "phrasal", "The plane took off on time"),
    "take part in": ("tham gia vào", "participate in", "phrasal", "They take part in the anime festival"),
    "look forward to": ("mong đợi, háo hức chờ đón", "anticipate with pleasure", "phrasal", "I look forward to meeting you"),
    "look after": ("chăm sóc, trông nom", "take care of", "phrasal", "Can you look after my cat?"),
    "look down on": ("coi thường, khinh bỉ", "feel superior to", "phrasal", "Never look down on others"),
    "look up to": ("ngưỡng mộ, kính trọng", "respect and admire", "phrasal", "He looks up to his older brother"),
    "make up one's mind": ("đưa ra quyết định, dứt khoát", "make a firm decision", "idiom", "She made up her mind to study abroad"),
    "make sense": ("hợp lý, có ý nghĩa", "be logical or understandable", "phrasal", "His explanation makes a lot of sense"),
    "make sure": ("đảm bảo, chắc chắn", "ensure or verify", "phrasal", "Make sure the door is locked"),
    "put up with": ("chịu đựng", "tolerate or endure", "phrasal", "I can't put up with this noise"),
    "break down": ("hỏng hóc, suy sụp tinh thần", "stop functioning or collapse emotionally", "phrasal", "His car broke down on the road"),
    "fall in love": ("phải lòng, rơi vào lưới tình", "develop romantic feelings", "idiom", "They fell in love at first sight"),
    "piece of cake": ("dễ ợt, chuyện nhỏ", "something very easy", "idiom", "That exam was a piece of cake"),
    "at the end of the day": ("suy cho cùng, rốt cuộc thì", "ultimately, in conclusion", "idiom", "At the end of the day, family comes first"),
    "once in a blue moon": ("hiếm khi, năm thì mười họa", "very rarely", "idiom", "He visits once in a blue moon"),
}

for phr, (m_vi, m_en, p_type, ex) in CURATED_PHRASAL_IDIOMS.items():
    phrases_to_insert[phr.lower()] = {
        'type': p_type,
        'meaning_vi': m_vi,
        'meaning_en': m_en,
        'example': ex,
        'score': 150
    }

for item in kaikki_phrases:
    p = (item.get('phrase') or '').strip().lower()
    if not p or len(p.split()) < 2:
        continue
    clean_p = re.sub(r'[\(\)\[\]]', '', p).strip().lower()
    clean_p = re.sub(r'\s+', ' ', clean_p)
    
    definition = item.get('definition') or ''
    m_vi = ''
    ex = ''
    if clean_p in skype_phrase_map and skype_phrase_map[clean_p]['definitions']:
        m_vi = "; ".join(d['meaning'] for d in skype_phrase_map[clean_p]['definitions'][:2])
        ex = skype_phrase_map[clean_p]['definitions'][0].get('example') or ''
    
    patterns = item.get('patterns') or []
    for pat in [clean_p] + patterns:
        pat_clean = pat.strip().lower()
        if pat_clean and len(pat_clean.split()) >= 2 and pat_clean not in phrases_to_insert:
            phrases_to_insert[pat_clean] = {
                'type': 'phrasal' if any(w in ['up', 'down', 'in', 'out', 'on', 'off', 'over', 'by', 'away', 'back', 'through', 'into'] for w in pat_clean.split()[1:]) else 'idiom',
                'meaning_vi': m_vi,
                'meaning_en': definition[:250],
                'example': ex,
                'score': 100
            }

COLLOCATIONS_DATASET = {
    "make a decision": ("đưa ra quyết định", "choose what to do", "We need to make a decision today", 140),
    "make decision": ("đưa ra quyết định", "reach conclusion", "Make decision quickly", 130),
    "make a mistake": ("mắc sai lầm", "do something wrong", "Don't be afraid to make a mistake", 130),
    "make progress": ("tiến bộ", "improve", "You are making great progress", 130),
    "make an effort": ("nỗ lực, cố gắng", "try hard", "He made an effort to smile", 130),
    "take a break": ("nghỉ giải lao", "rest briefly", "Let's take a break for 10 minutes", 130),
    "take a seat": ("ngồi xuống", "sit down", "Please take a seat", 130),
    "take advantage of": ("tận dụng, lợi dụng", "utilize opportunity", "Take advantage of this discount", 140),
    "pay attention": ("chú ý, tập trung", "listen closely", "Pay attention to the teacher", 140),
    "pay attention to": ("chú ý tới", "concentrate on", "Pay attention to details", 140),
    "catch a cold": ("bị cảm lạnh", "become sick with cold", "Wear warm clothes so you don't catch a cold", 130),
    "heavy rain": ("mưa như trút nước, mưa to", "intense rain", "The match was canceled due to heavy rain", 140),
    "deeply concerned": ("hết sức lo ngại, quan tâm sâu sắc", "very worried", "They are deeply concerned about the future", 140),
    "strong coffee": ("cà phê đậm đặc", "concentrated coffee", "I need a cup of strong coffee", 120),
    "fast food": ("thức ăn nhanh", "quick meals", "Eating too much fast food is unhealthy", 120),
    "do homework": ("làm bài tập về nhà", "complete assignments", "Finish your homework before watching anime", 130),
    "tell the truth": ("nói thật", "speak honestly", "Always tell the truth", 135),
    "vitally important": ("vô cùng quan trọng, sống còn", "crucially essential", "Teamwork is vitally important", 140),
    "highly likely": ("rất có thể, khả năng cao", "very probable", "It is highly likely to succeed", 140),
    "strictly forbidden": ("nghiêm cấm tuyệt đối", "completely prohibited", "Smoking is strictly forbidden here", 135),
}

for col, (m_vi, m_en, ex, score) in COLLOCATIONS_DATASET.items():
    phrases_to_insert[col.lower()] = {
        'type': 'collocation',
        'meaning_vi': m_vi,
        'meaning_en': m_en,
        'example': ex,
        'score': score
    }

phrases_index = {}
for p, pdata in phrases_to_insert.items():
    words = p.split()
    if len(words) >= 2 and len(words) <= 6:
        phrases_index[p] = {
            't': pdata['type'],
            'm': pdata.get('meaning_vi') or pdata.get('meaning_en', ''),
            'en': pdata.get('meaning_en', ''),
            'ex': pdata.get('example', ''),
            's': pdata.get('score', 100)
        }

with open(os.path.join(DICT_DIR, "phrases_index.json"), "w", encoding="utf-8") as f:
    json.dump(phrases_index, f, ensure_ascii=False)

conn_sky.close()
print("=== SKYPEDIA PIPELINE READY SUCCESSFULLY! ===")
