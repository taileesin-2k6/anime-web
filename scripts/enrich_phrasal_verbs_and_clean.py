import json
import os
import re

# Comprehensive list of English Phrasal Verbs & Essential Idioms with high-quality Vietnamese definitions
PHRASAL_VERBS_DATA = [
    # --- PUT Phrasal Verbs ---
    ("put in", "bỏ ra (công sức, thời gian); lắp đặt; đệ trình", "spend time/effort; install; submit", "He puts in blood, sweat, and tears for his dream.", "phrasal"),
    ("put on", "mặc vào, đeo vào; bật (thiết bị); giả vờ", "wear clothing; start a device; pretend", "She put on a warm coat before going out.", "phrasal"),
    ("put out", "dập tắt (lửa); làm phiền; phát hành", "extinguish; cause inconvenience; publish", "Firefighters quickly put out the flame.", "phrasal"),
    ("put off", "trì hoãn, hoãn lại; làm nản lòng", "postpone; discourage", "Never put off until tomorrow what you can do today.", "phrasal"),
    ("put up", "dựng lên, xây dựng; cho ở nhờ; tăng giá", "build; accommodate; raise prices", "They put up a new tent in the yard.", "phrasal"),
    ("put up with", "chịu đựng, nhẫn nhịn", "tolerate or endure", "I can't put up with this noise any longer.", "phrasal"),
    ("put down", "đặt xuống; ghi chép lại; chỉ trích/hạ thấp; dẹp yên", "place down; write; criticize; suppress", "Put down your weapon and surrender.", "phrasal"),
    ("put away", "cất đi, dọn dẹp; để dành (tiền)", "store in proper place; save money", "Put away your toys after playing.", "phrasal"),
    ("put forward", "đề xuất, nêu ra (ý kiến, kế hoạch)", "propose or suggest an idea", "He put forward an innovative solution.", "phrasal"),
    ("put across", "truyền đạt thành công, giải thích rõ", "communicate ideas effectively", "She put across her argument convincingly.", "phrasal"),
    ("put through", "nối máy điện thoại; bắt trải qua (thử thách)", "connect by phone; make someone experience", "Please put me through to the manager.", "phrasal"),
    ("put aside", "gác lại, để dành (thời gian, tiền bạc)", "set aside; save for future", "Let's put aside our differences and cooperate.", "phrasal"),
    ("put together", "lắp ráp, ghép lại, tổ chức", "assemble or organize parts", "They put together a strong team.", "phrasal"),
    ("put back", "đặt lại chỗ cũ; lùi thời gian", "return to original place; delay", "Please put the book back on the shelf.", "phrasal"),

    # --- TAKE Phrasal Verbs ---
    ("take off", "cất cánh; cởi (quần áo); phất lên nhanh chóng", "leave ground; remove clothes; become successful", "The plane took off on time.", "phrasal"),
    ("take in", "tiếp thu (kiến thức); lừa gạt; nhận nuôi/chăm sóc", "absorb knowledge; deceive; accommodate", "It was hard to take in so much information.", "phrasal"),
    ("take out", "mang ra ngoài; đưa ai đi chơi/ăn; rút (tiền)", "remove; treat someone; withdraw money", "He took her out for dinner.", "phrasal"),
    ("take on", "đảm nhận (trách nhiệm/việc); thuê nhân viên; đối đầu", "accept responsibility; hire; compete against", "She took on the difficult assignment.", "phrasal"),
    ("take up", "bắt đầu một sở thích/thói quen; chiếm (không gian)", "start a hobby; occupy space/time", "He took up jogging recently.", "phrasal"),
    ("take over", "tiếp quản, nắm quyền kiểm soát", "assume control of something", "The company was taken over by a rival.", "phrasal"),
    ("take after", "giống (ai đó trong gia đình về ngoại hình/tính cách)", "resemble a parent or relative", "She takes after her mother in looks.", "phrasal"),
    ("take back", "rút lại lời nói; trả lại hàng đã mua", "retract a statement; return purchased goods", "I take back what I said earlier.", "phrasal"),
    ("take apart", "tháo rời ra từng bộ phận", "dismantle into pieces", "He took the engine apart to inspect it.", "phrasal"),
    ("take down", "ghi chép lại; hạ gục; tháo gỡ", "write notes; defeat; dismantle", "Please take down these important points.", "phrasal"),

    # --- LOOK Phrasal Verbs ---
    ("look for", "tìm kiếm", "search for someone or something", "I am looking for my lost keys.", "phrasal"),
    ("look at", "nhìn vào, ngắm nhìn; xem xét", "direct gaze toward; examine", "Look at the beautiful sunrise.", "phrasal"),
    ("look after", "chăm sóc, trông nom", "take care of someone or something", "She looks after her younger brother.", "phrasal"),
    ("look into", "điều tra, nghiên cứu kỹ", "investigate or examine a problem", "The police will look into the incident.", "phrasal"),
    ("look forward to", "trông mong, háo hức chờ đợi", "anticipate with pleasure", "I look forward to hearing from you.", "phrasal"),
    ("look up to", "ngưỡng mộ, kính trọng", "respect and admire someone", "Young students look up to their teacher.", "phrasal"),
    ("look down on", "coi thường, khinh miệt", "view someone with contempt", "Never look down on others.", "phrasal"),
    ("look out", "cẩn thận, coi chừng", "be careful or beware", "Look out! A car is approaching fast.", "phrasal"),
    ("look through", "đọc lướt qua; kiểm tra nhanh", "browse or read quickly", "He looked through the newspaper headlines.", "phrasal"),
    ("look over", "kiểm tra, duyệt qua", "inspect or review something", "Please look over my essay for mistakes.", "phrasal"),

    # --- GIVE Phrasal Verbs ---
    ("give in", "nhượng bộ, đầu hàng, chịu thua", "yield or surrender", "The rebel forces finally gave in.", "phrasal"),
    ("give away", "cho đi, tặng miễn phí; để lộ bí mật", "donate; reveal a secret", "He gave away all his old books.", "phrasal"),
    ("give back", "trả lại", "return something to its owner", "Give me back my pencil, please.", "phrasal"),
    ("give out", "phân phát; cạn kiệt (năng lượng/sức lực)", "distribute; become exhausted", "Volunteers gave out food to refugees.", "phrasal"),
    ("give off", "tỏa ra, phát ra (mùi, nhiệt, ánh sáng)", "emit or release smell/heat", "The flowers gave off a sweet fragrance.", "phrasal"),

    # --- COME Phrasal Verbs ---
    ("come in", "đi vào, bước vào; về đích", "enter a place; arrive", "Please come in and have a seat.", "phrasal"),
    ("come across", "tình cờ bắt gặp, tình cờ thấy", "find or meet by chance", "I came across an old photo in the attic.", "phrasal"),
    ("come up with", "nghĩ ra (ý tưởng, giải pháp, sáng kiến)", "produce or suggest an idea/plan", "She came up with a brilliant idea.", "phrasal"),
    ("come out", "xuất bản, phát hành; lộ ra; nở hoa", "be published; emerge; bloom", "His new album came out yesterday.", "phrasal"),
    ("come back", "quay trở lại", "return to a place", "When will you come back from vacation?", "phrasal"),
    ("come on", "cố lên, nhanh lên; thôi nào", "hurry up; encourage; show disbelief", "Come on, we're going to be late!", "phrasal"),
    ("come down with", "bị ốm, mắc bệnh nhẹ", "fall ill with a minor illness", "He came down with a bad cold.", "phrasal"),
    ("come along", "đi cùng; tiến triển tốt", "accompany; make progress", "How is your new project coming along?", "phrasal"),
    ("come up", "xuất hiện bất ngờ; được đề cập đến", "arise unexpectedly; be mentioned", "An urgent issue came up this morning.", "phrasal"),

    # --- GET Phrasal Verbs ---
    ("get in", "đi vào, lên xe (ô tô/taxi); trúng tuyển", "enter a vehicle/place; be admitted", "Get in the car quickly.", "phrasal"),
    ("get out", "ra ngoài; thoát khỏi; lộ ra ngoài", "leave or escape; become known", "Get out of the burning building!", "phrasal"),
    ("get on", "lên (xe buýt, tàu, máy bay); tiến bộ; già đi", "board a bus/train; make progress", "We got on the morning train to Tokyo.", "phrasal"),
    ("get off", "xuống (xe buýt, tàu xe); tan làm", "leave a vehicle; finish work", "I get off work at five o'clock.", "phrasal"),
    ("get along with", "hòa thuận với, ăn ý với ai", "have a friendly relationship with", "She gets along well with her colleagues.", "phrasal"),
    ("get away with", "thoát tội, không bị trừng phạt", "escape punishment for a wrongdoing", "He thought he could get away with cheating.", "phrasal"),
    ("get over", "vượt qua (nỗi buồn/cơn bệnh); hồi phục", "recover from illness or sadness", "It took months to get over the loss.", "phrasal"),
    ("get through", "vượt qua (khó khăn); liên lạc được (điện thoại)", "endure a difficult period; reach by phone", "We will get through this tough time together.", "phrasal"),
    ("get by", "xoay xở đủ sống qua ngày", "manage to survive with limited means", "He earns enough to get by.", "phrasal"),
    ("get rid of", "tống khứ, loại bỏ, vứt bỏ", "eliminate or throw away", "We need to get rid of unnecessary junk.", "phrasal"),

    # --- BRING Phrasal Verbs ---
    ("bring in", "mang lại (thu nhập/lợi nhuận); đưa vào áp dụng", "earn money; introduce a law/rule", "The new shop brings in good profit.", "phrasal"),
    ("bring out", "làm nổi bật; tung ra sản phẩm mới", "highlight a quality; launch a product", "The spice brings out the flavor of the dish.", "phrasal"),
    ("bring about", "mang lại, gây ra, dẫn đến", "cause something to happen", "The reform brought about major changes.", "phrasal"),
    ("bring down", "hạ bệ, lật đổ; làm giảm giá", "overthrow; reduce prices", "Protests brought down the corrupt government.", "phrasal"),
    ("bring back", "mang trả lại; gợi nhớ lại kỷ niệm", "return something; recall memories", "This melody brings back sweet memories.", "phrasal"),

    # --- SET Phrasal Verbs ---
    ("set in", "bắt đầu diễn ra (thường là thời tiết xấu/bệnh tật)", "begin and seem likely to continue", "Winter has set in early this year.", "phrasal"),
    ("set off", "khởi hành; kích hoạt (chuông/bom); gây ra", "start a journey; trigger an alarm/explosion", "They set off on a journey at dawn.", "phrasal"),
    ("set up", "thiết lập, cài đặt; gài bẫy", "establish, install; frame someone", "He set up his own company last year.", "phrasal"),
    ("set out", "khởi hành; đặt mục tiêu thực hiện", "begin a journey or project with purpose", "She set out to break the world record.", "phrasal"),

    # --- STAND / RUN / TURN / CALL / BREAK / PASS Phrasal Verbs ---
    ("stand out", "nổi bật, vượt trội", "be conspicuous or noticeably better", "Her brilliant talent made her stand out.", "phrasal"),
    ("stand up for", "đứng lên bảo vệ, ủng hộ", "defend or support someone/something", "Always stand up for your rights.", "phrasal"),
    ("stand by", "sẵn sàng hỗ trợ; đứng nhìn thờ ơ", "be ready to help; watch without acting", "I will stand by you through thick and thin.", "phrasal"),
    ("run into", "tình cờ gặp; đâm vào (va chạm)", "encounter unexpectedly; collide with", "I ran into an old classmate yesterday.", "phrasal"),
    ("run out of", "hết sạch, cạn kiệt (tiền, xăng, thời gian)", "exhaust the supply of something", "We are running out of time.", "phrasal"),
    ("run away", "chạy trốn, bỏ trốn", "flee or escape", "The cat ran away when the dog barked.", "phrasal"),
    ("turn in", "đi ngủ; nộp (bài/vũ khí)", "go to bed; submit work/weapon", "I'm exhausted and going to turn in early.", "phrasal"),
    ("turn into", "biến thành, chuyển thành", "transform or change into", "The caterpillar turned into a butterfly.", "phrasal"),
    ("turn down", "từ chối (lời mời/đề nghị); vặn nhỏ âm lượng", "reject an offer; reduce volume", "He turned down the job offer.", "phrasal"),
    ("turn out", "hóa ra là; tham gia đông đủ", "prove to be; attend in large numbers", "The mystery turned out to be a misunderstanding.", "phrasal"),
    ("call in", "mời đến, triệu tập (chuyên gia); gọi điện", "summon someone's help; phone in", "They decided to call in a specialist.", "phrasal"),
    ("call for", "đòi hỏi, yêu cầu; đón ai", "require or demand; pick someone up", "This emergency calls for immediate action.", "phrasal"),
    ("call on", "kêu gọi; ghé thăm", "appeal to; visit someone", "The president called on citizens for unity.", "phrasal"),
    ("break out", "bùng phát, nổ ra (chiến tranh, dịch bệnh, hỏa hoạn)", "start suddenly (war, fire, disease)", "A fire broke out in the warehouse.", "phrasal"),
    ("break in", "đột nhập; cắt ngang câu chuyện", "enter illegally; interrupt", "Burglars tried to break in last night.", "phrasal"),
    ("break through", "đột phá, vượt qua rào cản", "make a breakthrough; pass through barrier", "Scientists broke through in cancer research.", "phrasal"),
    ("pass away", "qua đời, tạ thế", "die (euphemistic)", "His grandfather passed away peacefully.", "phrasal"),
    ("pass by", "đi ngang qua, trôi qua", "go past; elapse", "Time passes by so quickly.", "phrasal"),
    ("hand in", "nộp (bài, đơn, tài liệu)", "submit an assignment or document", "Students must hand in their essays by Friday.", "phrasal"),
    ("hand out", "phân phát cho mọi người", "distribute to people", "The teacher handed out the exam papers.", "phrasal"),
    ("hand over", "bàn giao lại (quyền lực, đồ vật, chìa khóa)", "transfer control or possession", "The outgoing manager handed over the keys.", "phrasal"),
    ("carry on", "tiếp tục thực hiện", "continue doing something", "Carry on with your work despite distractions.", "phrasal"),

    # --- Essential Multiword Idioms & Expressions ---
    ("blood sweat and tears", "mồ hôi, công sức và nước mắt (sự nỗ lực tột cùng)", "immense effort and hard work", "He put in blood, sweat, and tears for his goal.", "idiom"),
    ("in hopes of", "với hy vọng, mong muốn điều gì", "with the expectation or desire of", "He trained hard in hopes of winning the title.", "collocation"),
    ("in hope of", "với hy vọng, mong ước", "hoping for something", "They set sail in hope of finding new lands.", "collocation"),
    ("in order to", "để, nhằm mục đích", "with the purpose of", "Study hard in order to pass the exam.", "collocation"),
    ("as well as", "cũng như, cùng với", "in addition to", "He speaks English as well as Japanese.", "collocation"),
    ("as long as", "miễn là; trong suốt khoảng thời gian", "provided that; for the duration of", "You can stay here as long as you keep quiet.", "collocation"),
    ("as soon as", "ngay khi", "immediately when", "Call me as soon as you arrive.", "collocation"),
    ("all of a sudden", "bất thình lình, đột ngột", "suddenly and unexpectedly", "All of a sudden, the lights went out.", "idiom"),
    ("out of the blue", "hoàn toàn bất ngờ, từ trên trời rơi xuống", "completely unexpected", "The good news came out of the blue.", "idiom"),
    ("once in a blue moon", "hiếm khi, năm thì mười họa", "very rarely", "He visits home once in a blue moon.", "idiom"),
    ("piece of cake", "dễ như ăn cháo, rất dễ dàng", "very easy task", "The exam was a piece of cake for him.", "idiom"),
    ("cost an arm and a leg", "đắt cắt cổ, tốn kém vô cùng", "be extremely expensive", "That luxury car costs an arm and a leg.", "idiom"),
    ("burn the midnight oil", "thức khuya học/làm việc miệt mài", "work or study late into the night", "Students burned the midnight oil before exams.", "idiom"),
]

# Unwanted fragment phrases to remove from index because they break full verbs/idioms
FRAGMENT_PHRASES_TO_REMOVE = {
    "in blood",
    "at table",
    "on table",
    "to home",
    "in head",
    "at heart",
    "in heart",
    "of mind",
}

def main():
    dict_dir = "/home/taileesin123/Documents/anime-web/data/dict"
    phrases_index_path = os.path.join(dict_dir, "phrases_index.json")

    existing_phrases = {}
    if os.path.exists(phrases_index_path):
        with open(phrases_index_path, "r", encoding="utf-8") as f:
            existing_phrases = json.load(f)

    print(f"Loaded existing phrases count: {len(existing_phrases)}")

    # 1. Remove fragments
    removed_count = 0
    for frag in FRAGMENT_PHRASES_TO_REMOVE:
        if frag in existing_phrases:
            del existing_phrases[frag]
            removed_count += 1
            print(f"[-] Removed fragment: {frag}")

    # 2. Add / update phrasal verbs and idioms
    added_count = 0
    updated_count = 0

    for phrase, mean_vi, mean_en, example, p_type in PHRASAL_VERBS_DATA:
        key = phrase.lower().strip()
        entry = {
            "t": p_type,
            "m": mean_vi,
            "en": mean_en,
            "ex": example,
            "s": 200 # Top priority score
        }
        if key not in existing_phrases:
            existing_phrases[key] = entry
            added_count += 1
        else:
            existing_phrases[key]["t"] = p_type
            existing_phrases[key]["m"] = mean_vi
            existing_phrases[key]["en"] = mean_en
            existing_phrases[key]["ex"] = example
            existing_phrases[key]["s"] = 200
            updated_count += 1

    # Save
    with open(phrases_index_path, "w", encoding="utf-8") as f:
        json.dump(existing_phrases, f, ensure_ascii=False, indent=2)

    print(f"[+] Hoàn tất bổ sung Phrasal Verbs & dọn dẹp cụm rác!")
    print(f"    - Đã xóa mảnh rác: {removed_count}")
    print(f"    - Thêm mới: {added_count}")
    print(f"    - Cập nhật: {updated_count}")
    print(f"    - Tổng cụm trong hệ thống: {len(existing_phrases)}")

if __name__ == "__main__":
    main()
