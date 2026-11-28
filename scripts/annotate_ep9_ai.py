import json
import os
import re

WORKSPACE = "/home/taileesin123/Documents/anime-web"
PUBLIC_SUB = os.path.join(WORKSPACE, "public", "subtitles", "the-apothecary-diaries-season-3_9.json")
DATA_SUB = os.path.join(WORKSPACE, "data", "subtitles", "the-apothecary-diaries-season-3_9.json")
DICT_PATH = os.path.join(WORKSPACE, "data", "dict", "quick_words.json")

# ONLY True, Authentic, High-Value Idioms, Phrasal Verbs & Collocations
# (Strictly removed all literal word pairs like 'had tea', 'choose a wife', 'a bit', 'right now')
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
    88: [{"phrase": "No can do", "type": "idiom", "meaning": "chịu thôi, không làm được"}],
    104: [{"phrase": "go that far", "type": "idiom", "meaning": "đi xa đến mức đó / làm quá"}],
    109: [{"phrase": "leave it to me", "type": "idiom", "meaning": "cứ để đấy cho tôi / cứ giao cho tôi"}],
    115: [{"phrase": "made up", "type": "phrasal", "meaning": "bịa đặt / dựng chuyện"}],
    122: [{"phrase": "come to think of it", "type": "idiom", "meaning": "nghĩ kỹ lại thì / ngẫm lại mới thấy"}],
    148: [{"phrase": "keep it down", "type": "idiom", "meaning": "nói nhỏ lại / giữ trật tự"}],
    171: [{"phrase": "As expected of", "type": "idiom", "meaning": "đúng như kỳ vọng / quả không hổ danh"}],
    185: [{"phrase": "just in case", "type": "idiom", "meaning": "để phòng hờ / phòng khi"}],
    197: [{"phrase": "choosing your words carefully", "type": "collocation", "meaning": "cẩn trọng từng lời nói"}],
    203: [
        {"phrase": "At the very least", "type": "idiom", "meaning": "ít nhất thì"},
        {"phrase": "off the table", "type": "idiom", "meaning": "bị loại trừ / không được tính đến"}
    ],
    213: [{"phrase": "without question", "type": "idiom", "meaning": "không một chút nghi vấn / không do dự"}],
    217: [{"phrase": "rule out", "type": "phrasal", "meaning": "loại trừ khả năng"}],
    228: [{"phrase": "If it's not too much trouble", "type": "collocation", "meaning": "nếu không phiền / nếu không quá bất tiện"}],
    234: [{"phrase": "safe to say", "type": "idiom", "meaning": "có thể chắc chắn rằng / nói không quá lời rằng"}],
    241: [{"phrase": "come this far", "type": "idiom", "meaning": "đã đến nước này / đã nói đến đây"}],
    247: [{"phrase": "now that you mention it", "type": "idiom", "meaning": "giờ nhắc đến mới để ý / nhớ ra"}],
    260: [{"phrase": "of all people", "type": "idiom", "meaning": "trong bao nhiêu người lại chính là"}],
    263: [
        {"phrase": "had enough", "type": "idiom", "meaning": "ngán ngẩm lắm rồi / chịu đủ rồi"},
        {"phrase": "see for yourself", "type": "idiom", "meaning": "tự mình kiểm chứng / tận mắt xem"}
    ],
    267: [{"phrase": "just the other day", "type": "idiom", "meaning": "mới hôm trước thôi"}],
    271: [{"phrase": "causing a scene", "type": "collocation", "meaning": "gây náo loạn / làm ầm ĩ"}]
}

def tokenize_sentence(sentence, target_phrases, words_idx):
    sorted_phrases = sorted(target_phrases, key=lambda p: len(p['phrase']), reverse=True)
    occupied_spans = []
    
    for p_info in sorted_phrases:
        p_text = p_info['phrase']
        pattern = r'\b' + re.escape(p_text) + r'\b'
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
        
    print("[*] Đang lọc sạch triệt để các cụm từ thừa thãi và gán nhãn tinh hoa cho Tập 9...")
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
            
    print(f"[+] THÀNH CÔNG! Đã giữ lại duy nhất {total_phrases} cụm thành ngữ / collocation tinh hoa thực thụ. Đã xóa sạch 100% 'had tea' và các từ ghép thông thường!")

if __name__ == "__main__":
    main()
