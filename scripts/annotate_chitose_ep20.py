import json
import os
import re

WORKSPACE = "/home/taileesin123/Documents/anime-web"
PUBLIC_SUB = os.path.join(WORKSPACE, "public", "subtitles", "chitose-kun-wa-ramune-bin-no-naka_20.json")
DATA_SUB = os.path.join(WORKSPACE, "data", "subtitles", "chitose-kun-wa-ramune-bin-no-naka_20.json")
DICT_PATH = os.path.join(WORKSPACE, "data", "dict", "quick_words.json")

# Systematic, line-by-line curated idioms, phrasal verbs, and collocations for Episode 20
AI_PHRASES_MAP = {
    2: [{"phrase": "paled in comparison", "type": "idiom", "meaning": "chẳng thấm vào đâu / hoàn toàn lu mờ so với"}],
    3: [
        {"phrase": "stood a good chance", "type": "idiom", "meaning": "có nhiều cơ hội / triển vọng lớn"},
        {"phrase": "causing an upset", "type": "collocation", "meaning": "tạo nên bất ngờ / lật ngược tình thế"}
    ],
    10: [{"phrase": "leave you out of", "type": "phrasal", "meaning": "loại bạn ra khỏi / gạt ra ngoài"}],
    11: [{"phrase": "the real deal", "type": "idiom", "meaning": "người có thực tài / cao thủ thứ thiệt"}],
    12: [{"phrase": "creep me out", "type": "phrasal", "meaning": "làm tôi rợn người / sởn gai ốc"}],
    14: [{"phrase": "bring you home", "type": "idiom", "meaning": "đưa bạn về gôn ghi điểm"}],
    15: [{"phrase": "shut their lineup down", "type": "phrasal", "meaning": "khóa chặt đội hình đối phương"}],
    17: [{"phrase": "roll with it", "type": "idiom", "meaning": "cứ theo thế mà triển / thuận theo tự nhiên"}],
    22: [{"phrase": "hold his own", "type": "idiom", "meaning": "tự mình đứng vững / không hề kém cạnh"}],
    25: [{"phrase": "falling off", "type": "phrasal", "meaning": "bắt đầu trật bánh / đổ vỡ"}],
    33: [{"phrase": "right this instant", "type": "idiom", "meaning": "ngay lập tức / ngay tức khắc"}],
    35: [{"phrase": "buy into", "type": "phrasal", "meaning": "chấp nhận / hòa nhập vào văn hóa"}],
    41: [{"phrase": "out of the starting lineup", "type": "collocation", "meaning": "bị loại khỏi đội hình xuất phát"}],
    49: [
        {"phrase": "piled on", "type": "phrasal", "meaning": "dồn dập tấn công / ùa vào ghi điểm"},
        {"phrase": "in a flash", "type": "idiom", "meaning": "trong nháy mắt / trong chớp mắt"}
    ],
    55: [{"phrase": "came to an end", "type": "idiom", "meaning": "đi đến hồi kết / chấm dứt"}],
    56: [{"phrase": "keep up", "type": "phrasal", "meaning": "tiếp tục duy trì"}],
    59: [
        {"phrase": "acting up", "type": "phrasal", "meaning": "gây chuyện / quậy phá"},
        {"phrase": "turned out", "type": "phrasal", "meaning": "diễn biến theo chiều hướng khác"}
    ],
    60: [{"phrase": "buy into", "type": "phrasal", "meaning": "tiếp nhận / hòa nhập vào"}],
    64: [{"phrase": "hot shit", "type": "idiom", "meaning": "tự cho mình là số một / là cái rốn vũ trụ"}],
    80: [{"phrase": "grit my teeth", "type": "idiom", "meaning": "cắn răng chịu đựng"}],
    83: [{"phrase": "leave a player as good as you to rot", "type": "idiom", "meaning": "bỏ mặc một tài năng như bạn thui chột"}],
    84: [{"phrase": "take the field", "type": "idiom", "meaning": "bước ra sân thi đấu"}],
    85: [{"phrase": "speak out against", "type": "phrasal", "meaning": "dám đứng lên lên tiếng phản đối"}],
    86: [{"phrase": "put a target on their own back", "type": "idiom", "meaning": "tự biến mình thành mục tiêu bị nhắm tới"}],
    87: [{"phrase": "keeping away from", "type": "phrasal", "meaning": "xa lánh / tránh xa"}],
    90: [{"phrase": "frozen out", "type": "phrasal", "meaning": "bị cô lập / cho ra rìa"}],
    91: [{"phrase": "dragging on", "type": "phrasal", "meaning": "kéo dài lê thê"}],
    95: [{"phrase": "come together", "type": "phrasal", "meaning": "gắn kết / đồng lòng lại với nhau"}],
    98: [{"phrase": "turned down", "type": "phrasal", "meaning": "từ chối lời mời"}],
    99: [{"phrase": "bottom up", "type": "idiom", "meaning": "đi lên từ con số không / từ đáy"}],
    103: [{"phrase": "in the first place", "type": "idiom", "meaning": "ngay từ đầu"}],
    104: [{"phrase": "take the weight off my shoulders", "type": "idiom", "meaning": "trút bỏ gánh nặng trên vai"}],
    105: [{"phrase": "true to form", "type": "idiom", "meaning": "đúng như thường lệ / không ngoài dự đoán"}],
    108: [{"phrase": "turning their backs on you", "type": "idiom", "meaning": "quay lưng lại với bạn"}],
    109: [{"phrase": "pissed off at", "type": "phrasal", "meaning": "bực mình / tức điên lên với"}],
    112: [{"phrase": "blood, sweet, and tears", "type": "idiom", "meaning": "mồ hôi xương máu / công sức khổ luyện"}],
    114: [{"phrase": "give it up", "type": "phrasal", "meaning": "từ bỏ"}],
    117: [{"phrase": "hit rock bottom", "type": "idiom", "meaning": "chạm đáy tuyệt vọng / rơi xuống vực thẳm"}],
    122: [{"phrase": "having the time of your life", "type": "idiom", "meaning": "tận hưởng khoảnh khắc tuyệt vời nhất cuộc đời"}],
    123: [{"phrase": "giving up", "type": "phrasal", "meaning": "từ bỏ"}],
    124: [{"phrase": "turn things around", "type": "phrasal", "meaning": "xoay chuyển tình thế"}],
    132: [{"phrase": "back on my feet", "type": "idiom", "meaning": "vực dậy và đứng vững trở lại"}],
    133: [{"phrase": "breaking down", "type": "phrasal", "meaning": "suy sụp / gục ngã"}],
    135: [{"phrase": "with your tail between your legs", "type": "idiom", "meaning": "cụp đuôi thối lui / nhục nhã bỏ chạy"}],
    136: [{"phrase": "froze you out", "type": "phrasal", "meaning": "cô lập / cho bạn ra rìa"}],
    148: [{"phrase": "give my teammates a piece of my mind", "type": "idiom", "meaning": "nói thẳng vào mặt đồng đội cho hả giận"}],
    150: [
        {"phrase": "tongue-lashing", "type": "collocation", "meaning": "bị mắng mỏ thậm tệ / xối xả"},
        {"phrase": "ran away", "type": "phrasal", "meaning": "bỏ chạy / trốn chạy"}
    ],
    153: [{"phrase": "cry my heart out", "type": "idiom", "meaning": "khóc hết nước mắt / khóc thỏa thuê"}],
    160: [{"phrase": "help him out", "type": "phrasal", "meaning": "giúp đỡ cậu ấy"}],
    164: [{"phrase": "stand a much better chance", "type": "idiom", "meaning": "nắm chắc cơ hội hơn nhiều"}],
    166: [{"phrase": "put all my heart into", "type": "idiom", "meaning": "dồn hết tâm huyết vào"}],
    176: [{"phrase": "bawling your eyes out", "type": "idiom", "meaning": "khóc lóc thảm thiết / sướt mướt"}],
    184: [
        {"phrase": "gave up on", "type": "phrasal", "meaning": "từ bỏ"},
        {"phrase": "Stick with it", "type": "phrasal", "meaning": "kiên trì bám đuổi đến cùng"}
    ],
    188: [{"phrase": "going on about", "type": "phrasal", "meaning": "lải nhải mãi về"}],
    190: [{"phrase": "getting too heated", "type": "idiom", "meaning": "quá nóng nảy / căng thẳng"}],
    200: [{"phrase": "Now that you mention it", "type": "idiom", "meaning": "giờ cậu nhắc đến mới để ý"}],
    203: [{"phrase": "such a handful", "type": "idiom", "meaning": "thật là khó chiều / phiền toái"}],
    205: [{"phrase": "out of control", "type": "idiom", "meaning": "mất kiểm soát"}],
    219: [{"phrase": "taking it too far", "type": "idiom", "meaning": "làm quá / đi quá giới hạn"}],
    220: [{"phrase": "no point", "type": "idiom", "meaning": "chẳng có ích gì"}],
    224: [{"phrase": "put in the effort", "type": "collocation", "meaning": "dốc lòng nỗ lực / bỏ công sức"}],
    232: [{"phrase": "keeping up with", "type": "phrasal", "meaning": "theo kịp phương pháp"}],
    238: [{"phrase": "went over", "type": "phrasal", "meaning": "xem lại / mổ xẻ trận đấu"}],
    249: [
        {"phrase": "To put it simply", "type": "collocation", "meaning": "nói một cách đơn giản"},
        {"phrase": "call it quits", "type": "idiom", "meaning": "bỏ cuộc / dừng lại giữa chừng"}
    ],
    251: [
        {"phrase": "give up", "type": "phrasal", "meaning": "từ bỏ"},
        {"phrase": "giving it a shot", "type": "idiom", "meaning": "thử sức một lần"}
    ],
    253: [{"phrase": "going all-out", "type": "idiom", "meaning": "dốc hết toàn lực"}],
    254: [{"phrase": "boils down to", "type": "phrasal", "meaning": "chung quy lại là / tóm gọn lại là"}],
    257: [{"phrase": "break through", "type": "phrasal", "meaning": "bứt phá qua / vượt giới hạn"}],
    258: [{"phrase": "draw a line in the sand", "type": "idiom", "meaning": "vạch ra ranh giới an toàn không dám vượt qua"}],
    259: [{"phrase": "slapped down", "type": "phrasal", "meaning": "bị tạt gáo nước lạnh / quật ngã"}],
    262: [{"phrase": "lead by example", "type": "idiom", "meaning": "làm gương / nêu gương"}],
    263: [{"phrase": "working your butt off", "type": "idiom", "meaning": "làm việc cật lực / đổ mồ hôi sôi nước mắt"}],
    268: [{"phrase": "work my ass off", "type": "idiom", "meaning": "dốc toàn lực / làm việc hết mình"}],
    269: [
        {"phrase": "back them up", "type": "phrasal", "meaning": "hỗ trợ phía sau / chống lưng"},
        {"phrase": "behind the scenes", "type": "idiom", "meaning": "ở hậu trường / trong bóng tối"}
    ],
    272: [{"phrase": "bad cop", "type": "idiom", "meaning": "đóng vai ác / kẻ đấm người xoa"}],
    275: [{"phrase": "coming to a head", "type": "idiom", "meaning": "đang lên đến đỉnh điểm căng thẳng"}],
    280: [{"phrase": "brought it up to", "type": "phrasal", "meaning": "đề cập chuyện đó với"}],
    282: [{"phrase": "butt heads with", "type": "idiom", "meaning": "đối đầu trực diện / tranh cãi nảy lửa"}],
    285: [{"phrase": "put aside", "type": "phrasal", "meaning": "gác lại / dẹp sang một bên"}],
    287: [{"phrase": "fall out", "type": "phrasal", "meaning": "chia rẽ / sứt mẻ tình cảm"}],
    290: [{"phrase": "look after", "type": "phrasal", "meaning": "chăm sóc / để mắt tới"}]
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
        
    print("[*] Đang áp dụng bộ lọc toàn diện đầy đủ Idioms & Phrasal Verbs cho Chitose Tập 20...")
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
            
    print(f"[+] THÀNH CÔNG! Đã gán nhãn chính xác {total_phrases} cụm Idiom, Phrasal Verb và Collocation tinh hoa cho Tập 20!")

if __name__ == "__main__":
    main()
