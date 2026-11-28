import json
import os
import re

WORKSPACE = "/home/taileesin123/Documents/anime-web"
PUBLIC_SUB = os.path.join(WORKSPACE, "public", "subtitles", "the-apothecary-diaries-season-3_9.json")
DATA_SUB = os.path.join(WORKSPACE, "data", "subtitles", "the-apothecary-diaries-season-3_9.json")
DICT_PATH = os.path.join(WORKSPACE, "data", "dict", "quick_words.json")

# AI Curated Contextual Phrases for Episode 9
AI_PHRASES_MAP = {
    0: [{"phrase": "choose a wife", "type": "collocation", "meaning": "chọn vợ / tuyển chọn thê tử"}],
    3: [{"phrase": "in other words", "type": "idiom", "meaning": "nói cách khác"}],
    6: [{"phrase": "fit to be", "type": "idiom", "meaning": "thích hợp / đủ tư cách để làm"}],
    8: [{"phrase": "best outcome", "type": "collocation", "meaning": "kết cục tốt nhất"}],
    11: [{"phrase": "topple nations", "type": "idiom", "meaning": "khuynh đảo quốc gia / khuynh quốc khuynh thành"}],
    13: [{"phrase": "related to", "type": "collocation", "meaning": "liên quan đến"}],
    14: [{"phrase": "taking it too far", "type": "idiom", "meaning": "làm quá / suy diễn quá xa"}],
    16: [
        {"phrase": "Help yourself", "type": "idiom", "meaning": "cứ tự nhiên dùng nhé"},
        {"phrase": "lady-in-waiting", "type": "collocation", "meaning": "thị nữ / tỳ nữ hầu cận"}
    ],
    19: [{"phrase": "a bit", "type": "idiom", "meaning": "hơi / một chút"}],
    20: [{"phrase": "used to", "type": "phrasal", "meaning": "đã quen với"}],
    26: [{"phrase": "get engaged to", "type": "collocation", "meaning": "đính hôn với"}],
    29: [{"phrase": "at least", "type": "idiom", "meaning": "ít nhất thì"}],
    32: [
        {"phrase": "In that case", "type": "idiom", "meaning": "trong trường hợp đó / nếu vậy thì"},
        {"phrase": "think of", "type": "phrasal", "meaning": "nghĩ ra"}
    ],
    33: [{"phrase": "right now", "type": "idiom", "meaning": "ngay lúc này"}],
    36: [
        {"phrase": "by any chance", "type": "idiom", "meaning": "liệu có thể nào / có tình cờ"},
        {"phrase": "blood-related", "type": "collocation", "meaning": "cùng huyết thống / ruột thịt"}
    ],
    44: [
        {"phrase": "supposed to", "type": "collocation", "meaning": "lẽ ra phải"},
        {"phrase": "go back to", "type": "phrasal", "meaning": "quay trở lại"}
    ],
    46: [{"phrase": "spend the rest of my days", "type": "idiom", "meaning": "dành trọn phần đời còn lại"}],
    55: [{"phrase": "via rumor", "type": "collocation", "meaning": "qua lời đồn"}],
    56: [{"phrase": "sit on his lap", "type": "collocation", "meaning": "ngồi vào lòng"}],
    59: [{"phrase": "looks like", "type": "phrasal", "meaning": "có vẻ như"}],
    60: [{"phrase": "paternity test", "type": "collocation", "meaning": "xét nghiệm quan hệ cha con / huyết thống"}],
    61: [{"phrase": "friends with", "type": "collocation", "meaning": "làm bạn với"}],
    62: [{"phrase": "had tea", "type": "collocation", "meaning": "uống trà"}],
    64: [
        {"phrase": "No wonder", "type": "idiom", "meaning": "hèn chi / chẳng trách"},
        {"phrase": "care about", "type": "phrasal", "meaning": "quan tâm đến"}
    ],
    74: [
        {"phrase": "beating around the bush", "type": "idiom", "meaning": "nói vòng vo tam quốc"},
        {"phrase": "to put it simply", "type": "collocation", "meaning": "nói một cách đơn giản"}
    ],
    77: [{"phrase": "no time to", "type": "idiom", "meaning": "không phải lúc để"}],
    80: [{"phrase": "look into", "type": "phrasal", "meaning": "điều tra / tìm hiểu kỹ"}],
    82: [{"phrase": "Now that", "type": "idiom", "meaning": "giờ khi mà / một khi đã"}],
    84: [{"phrase": "did it", "type": "idiom", "meaning": "quan hệ / làm chuyện đó"}],
    88: [{"phrase": "No can do", "type": "idiom", "meaning": "chịu thôi, không làm được"}],
    94: [{"phrase": "checking in on", "type": "phrasal", "meaning": "ghé qua kiểm tra tình hình"}],
    101: [{"phrase": "take a look", "type": "collocation", "meaning": "xem qua / kiểm tra thử"}],
    104: [{"phrase": "go that far", "type": "idiom", "meaning": "đi xa đến mức đó / làm quá"}],
    109: [{"phrase": "leave it to me", "type": "idiom", "meaning": "cứ để đấy cho tôi / cứ giao cho tôi"}],
    115: [{"phrase": "made up", "type": "phrasal", "meaning": "bịa đặt / dựng chuyện"}],
    122: [
        {"phrase": "come to think of it", "type": "idiom", "meaning": "nghĩ kỹ lại thì / ngẫm lại mới thấy"},
        {"phrase": "look like", "type": "phrasal", "meaning": "trông giống"}
    ],
    138: [{"phrase": "make sure", "type": "collocation", "meaning": "đảm bảo chắc chắn"}],
    148: [{"phrase": "keep it down", "type": "idiom", "meaning": "nói nhỏ lại / giữ trật tự"}],
    171: [{"phrase": "As expected of", "type": "idiom", "meaning": "đúng như kỳ vọng / quả không hổ danh"}],
    183: [{"phrase": "leave Lady Lishu's side", "type": "collocation", "meaning": "rời khỏi bên cạnh nương nương"}],
    185: [{"phrase": "just in case", "type": "idiom", "meaning": "để phòng hờ / phòng khi"}],
    193: [{"phrase": "passed away", "type": "phrasal", "meaning": "qua đời"}],
    197: [{"phrase": "choosing your words carefully", "type": "collocation", "meaning": "cẩn trọng từng lời nói"}],
    203: [
        {"phrase": "At the very least", "type": "idiom", "meaning": "ít nhất thì"},
        {"phrase": "off the table", "type": "idiom", "meaning": "bị loại trừ / không được tính đến"}
    ],
    207: [{"phrase": "No matter", "type": "idiom", "meaning": "bất kể / dù cho"}],
    209: [{"phrase": "held responsible", "type": "collocation", "meaning": "bị quy trách nhiệm"}],
    210: [{"phrase": "feel really bad for", "type": "idiom", "meaning": "thấy rất thương cảm / tội nghiệp cho"}],
    212: [{"phrase": "Thank you for", "type": "collocation", "meaning": "cảm ơn vì"}],
    213: [{"phrase": "without question", "type": "idiom", "meaning": "không một chút nghi vấn / không do dự"}],
    216: [{"phrase": "check for poisons", "type": "collocation", "meaning": "thử độc / kiểm tra độc tính"}],
    217: [{"phrase": "rule out", "type": "phrasal", "meaning": "loại trừ khả năng"}],
    222: [{"phrase": "clean up", "type": "phrasal", "meaning": "dọn dẹp"}],
    228: [{"phrase": "If it's not too much trouble", "type": "collocation", "meaning": "nếu không phiền / nếu không quá bất tiện"}],
    234: [{"phrase": "safe to say", "type": "idiom", "meaning": "có thể chắc chắn rằng / nói không quá lời rằng"}],
    241: [{"phrase": "come this far", "type": "idiom", "meaning": "đã đến nước này / đã nói đến đây"}],
    243: [{"phrase": "There are talks of", "type": "collocation", "meaning": "đang có tin đồn / bàn tán về"}],
    247: [{"phrase": "now that you mention it", "type": "idiom", "meaning": "giờ nhắc đến mới để ý / nhớ ra"}],
    252: [{"phrase": "line of succession", "type": "collocation", "meaning": "thứ tự kế vị ngai vàng"}],
    254: [{"phrase": "mother of the nation", "type": "collocation", "meaning": "mẫu nghi thiên hạ / hoàng hậu"}],
    257: [{"phrase": "there's no way", "type": "idiom", "meaning": "không đời nào / làm sao mà"}],
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
        
    print("[*] Đang xử lý file phụ đề Tập 9...")
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
            
    print(f"[+] THÀNH CÔNG! Đã gán {total_phrases} cụm từ Collocation/Idiom tinh hoa vào {len(sub_data['en'])} câu thoại Tập 9!")

if __name__ == "__main__":
    main()
