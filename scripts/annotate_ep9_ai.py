import json
import os
import re

WORKSPACE = "/home/taileesin123/Documents/anime-web"
PUBLIC_SUB = os.path.join(WORKSPACE, "public", "subtitles", "the-apothecary-diaries-season-3_9.json")
DATA_SUB = os.path.join(WORKSPACE, "data", "subtitles", "the-apothecary-diaries-season-3_9.json")
DICT_PATH = os.path.join(WORKSPACE, "data", "dict", "quick_words.json")

# Exhaustive, systematically vetted idioms, phrasal verbs, and collocations
# (Strictly 0 literal pairs like 'had tea', 0 basic connectives, 0 cross-punctuation joins)
AI_PHRASES_MAP = {
    3: [{"phrase": "in other words", "type": "idiom", "meaning": "nói cách khác"}],
    14: [{"phrase": "taking it too far", "type": "idiom", "meaning": "làm quá / suy diễn quá xa"}],
    16: [{"phrase": "Help yourself", "type": "idiom", "meaning": "cứ tự nhiên dùng nhé"}],
    36: [{"phrase": "by any chance", "type": "idiom", "meaning": "liệu có thể nào / có tình cờ"}],
    46: [{"phrase": "spend the rest of my days", "type": "idiom", "meaning": "dành trọn phần đời còn lại"}],
    64: [{"phrase": "No wonder", "type": "idiom", "meaning": "hèn chi / chẳng trách"}],
    74: [
        {"phrase": "beating around the bush", "type": "idiom", "meaning": "nói vòng vo tam quốc"},
        {"phrase": "to put it simply", "type": "collocation", "meaning": "nói một cách đơn giản"}
    ],
    81: [{"phrase": "look into", "type": "phrasal", "meaning": "điều tra / tìm hiểu kỹ"}],
    89: [{"phrase": "No can do", "type": "idiom", "meaning": "chịu thôi, không làm được"}],
    95: [
        {"phrase": "checking in on", "type": "phrasal", "meaning": "ghé qua thăm hỏi tình hình"},
        {"phrase": "stitched up", "type": "phrasal", "meaning": "khâu vết thương lại"}
    ],
    98: [{"phrase": "running out", "type": "phrasal", "meaning": "sắp hết / cạn kiệt"}],
    105: [{"phrase": "win our favor", "type": "collocation", "meaning": "chiếm được thiện cảm / lấy lòng"}],
    107: [{"phrase": "deal with", "type": "phrasal", "meaning": "đối phó / giải quyết"}],
    120: [{"phrase": "make it worth your while", "type": "idiom", "meaning": "trả công xứng đáng / không để chịu thiệt"}],
    121: [{"phrase": "come across", "type": "phrasal", "meaning": "tình cờ bắt gặp / có được"}],
    122: [{"phrase": "In other words", "type": "idiom", "meaning": "nói cách khác"}],
    127: [{"phrase": "all the rage", "type": "idiom", "meaning": "cơn sốt thịnh hành"}],
    135: [{"phrase": "piling up", "type": "phrasal", "meaning": "chồng chất lên"}],
    151: [{"phrase": "come off", "type": "phrasal", "meaning": "bong ra / rửa sạch được"}],
    157: [{"phrase": "all this way", "type": "idiom", "meaning": "lặn lội đường xa đến tận đây"}],
    159: [{"phrase": "taking care of", "type": "phrasal", "meaning": "chăm sóc"}],
    186: [{"phrase": "just in case", "type": "idiom", "meaning": "để phòng hờ / phòng khi"}],
    194: [{"phrase": "passed away", "type": "phrasal", "meaning": "qua đời"}],
    198: [{"phrase": "choosing your words carefully", "type": "collocation", "meaning": "cẩn trọng lời ăn tiếng nói"}],
    203: [
        {"phrase": "At the very least", "type": "idiom", "meaning": "ít nhất thì"},
        {"phrase": "off the table", "type": "idiom", "meaning": "bị loại trừ / không được tính đến"}
    ],
    213: [{"phrase": "without question", "type": "idiom", "meaning": "không một chút nghi vấn / không do dự"}],
    217: [{"phrase": "rule out", "type": "phrasal", "meaning": "loại trừ khả năng"}],
    222: [{"phrase": "clean up", "type": "phrasal", "meaning": "dọn dẹp"}],
    228: [{"phrase": "If it's not too much trouble", "type": "collocation", "meaning": "nếu không phiền / nếu không quá bất tiện"}],
    235: [{"phrase": "safe to say", "type": "idiom", "meaning": "có thể chắc chắn rằng / nói không ngoa"}],
    242: [{"phrase": "come this far", "type": "idiom", "meaning": "đã đến nước này / đã nói đến đây"}],
    247: [{"phrase": "now that you mention it", "type": "idiom", "meaning": "giờ nhắc đến mới để ý / nhớ ra"}],
    253: [{"phrase": "line of succession", "type": "collocation", "meaning": "thứ tự kế vị"}],
    261: [{"phrase": "of all people", "type": "idiom", "meaning": "trong bao nhiêu người lại chính là"}],
    263: [{"phrase": "had enough", "type": "idiom", "meaning": "ngán ngẩm lắm rồi / chịu đủ rồi"}],
    264: [{"phrase": "see for yourself", "type": "idiom", "meaning": "tự mình kiểm chứng / tận mắt xem"}],
    267: [{"phrase": "just the other day", "type": "idiom", "meaning": "mới hôm trước thôi"}],
    271: [{"phrase": "causing a scene", "type": "collocation", "meaning": "gây náo loạn / làm ầm ĩ"}]
}

def make_pattern(phrase):
    words = phrase.strip().split()
    return r'\b' + r'\s+'.join(re.escape(w) for w in words) + r'\b'

def tokenize_sentence(sentence, target_phrases, words_idx):
    sorted_phrases = sorted(target_phrases, key=lambda p: len(p['phrase']), reverse=True)
    occupied_spans = []
    
    for p_info in sorted_phrases:
        p_text = p_info['phrase']
        pattern = make_pattern(p_text)
        for m in re.finditer(pattern, sentence, re.IGNORECASE):
            s, e = m.span()
            if not any(s < oe and e > os for os, oe, _ in occupied_spans):
                occupied_spans.append((s, e, p_info))
                
    occupied_spans.sort(key=lambda x: x[0])
    tokens = []
    curr = 0
    
    for s, e, p_info in occupied_spans:
        if s > curr:
            pre_text = sentence[curr:s]
            pre_raw = re.findall(r"[A-Za-z0-9']+|[^\s\w]", pre_text)
            for r in pre_raw:
                is_w = bool(re.match(r'^[A-Za-z0-9]', r))
                cl = r.lower().strip("'") if is_w else ''
                w_data = words_idx.get(cl, {}) if is_w else {}
                tokens.append({
                    'text': r,
                    'clean': cl,
                    'isPhrase': False,
                    'phraseType': 'single' if is_w else 'punct',
                    'meaning': w_data.get('m', '') if is_w else '',
                    'ipa': w_data.get('i', '') if is_w else '',
                    'pos': w_data.get('p', '') if is_w else ''
                })
        
        tokens.append({
            'text': sentence[s:e],
            'clean': p_info['phrase'].lower(),
            'isPhrase': True,
            'phraseType': p_info.get('type', 'idiom'),
            'meaning': p_info.get('meaning', '')
        })
        curr = e
        
    if curr < len(sentence):
        rem_text = sentence[curr:]
        rem_raw = re.findall(r"[A-Za-z0-9']+|[^\s\w]", rem_text)
        for r in rem_raw:
            is_w = bool(re.match(r'^[A-Za-z0-9]', r))
            cl = r.lower().strip("'") if is_w else ''
            w_data = words_idx.get(cl, {}) if is_w else {}
            tokens.append({
                'text': r,
                'clean': cl,
                'isPhrase': False,
                'phraseType': 'single' if is_w else 'punct',
                'meaning': w_data.get('m', '') if is_w else '',
                'ipa': w_data.get('i', '') if is_w else '',
                'pos': w_data.get('p', '') if is_w else ''
            })
            
    return tokens

def main():
    print("[*] Đang tải từ điển đơn quick_words.json...")
    with open(DICT_PATH, "r", encoding="utf-8") as f:
        words_idx = json.load(f)
        
    print("[*] Đang áp dụng bộ lọc toàn diện đầy đủ Idioms & Phrasal Verbs cho Tập 9...")
    with open(PUBLIC_SUB, "r", encoding="utf-8") as f:
        sub_data = json.load(f)
        
    total_phrases = 0
    for idx, cue in enumerate(sub_data['en']):
        target_phrases = AI_PHRASES_MAP.get(idx, [])
        cue['tokens'] = tokenize_sentence(cue['text'], target_phrases, words_idx)
        total_phrases += len(target_phrases)
        
    for p in [PUBLIC_SUB, DATA_SUB]:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(sub_data, f, ensure_ascii=False, indent=2)
            
    print(f"[+] THÀNH CÔNG! Đã gán nhãn chính xác {total_phrases} cụm Idiom, Phrasal Verb và Collocation tinh hoa cho Tập 9.")

if __name__ == "__main__":
    main()
