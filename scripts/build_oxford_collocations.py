import json
import os
import re

# Comprehensive Oxford & IELTS Collocations Dataset Generator & Merger
COLLOCATIONS_DATA = [
    # --- MAKE Collocations ---
    ("make a decision", "đưa ra quyết định", "choose what to do after thinking", "You need to make a decision quickly.", "collocation"),
    ("make a mistake", "phạm sai lầm", "do something wrong or incorrect", "Everyone makes a mistake sometimes.", "collocation"),
    ("make an effort", "nỗ lực, cố gắng", "try hard to do something", "She made an effort to smile.", "collocation"),
    ("make a difference", "tạo ra sự khác biệt", "have a significant effect on a situation", "Your help can make a difference.", "collocation"),
    ("make an impression", "tạo ấn tượng", "produce a strong effect on someone", "He made a great impression at the interview.", "collocation"),
    ("make sense", "hợp lý, có ý nghĩa", "be logical or understandable", "His explanation makes complete sense.", "collocation"),
    ("make progress", "tiến bộ, đạt bước tiến", "move forward or improve", "The student is making rapid progress.", "collocation"),
    ("make sure", "đảm bảo, chắc chắn", "ensure that something is done", "Make sure all doors are locked.", "collocation"),
    ("make an appointment", "hẹn gặp, đặt lịch hẹn", "arrange a time to see someone", "I made an appointment with the doctor.", "collocation"),
    ("make an excuse", "viện cớ, bào chữa", "give a false reason for doing something wrong", "Stop making excuses for being late.", "collocation"),
    ("make a promise", "hứa, đưa ra lời hứa", "commit to doing something", "Never make a promise you cannot keep.", "collocation"),
    ("make money", "kiếm tiền", "earn money from work or investment", "He made money through hard work.", "collocation"),
    ("make a speech", "phát biểu, diễn thuyết", "deliver a formal talk to an audience", "The president made an inspiring speech.", "collocation"),
    ("make room", "nhường chỗ, tạo không gian", "create space for someone or something", "Please make room for the elderly.", "collocation"),
    ("make an inquiry", "thăm dò, hỏi thăm", "ask for information about something", "They made an inquiry about the train schedule.", "collocation"),
    ("make amends", "chuộc lỗi, đền bù", "compensate or correct a past mistake", "He tried to make amends for his behavior.", "collocation"),
    ("make an appearance", "xuất hiện thoáng qua", "attend an event briefly", "The actor made an appearance at the party.", "collocation"),
    ("make a choice", "lựa chọn", "select from available options", "You have to make a choice now.", "collocation"),
    ("make a comment", "bình luận, đưa ra nhận xét", "express an opinion about something", "She refused to make a comment.", "collocation"),
    ("make a complaint", "khiếu nại, phàn nàn", "express dissatisfaction formally", "He made a complaint about poor service.", "collocation"),
    ("make a point", "nêu ra quan điểm, nhấn mạnh", "state an important idea clearly", "You make a valid point.", "collocation"),
    ("make arrangements", "thu xếp, sắp đặt", "plan and organize details", "We are making arrangements for the trip.", "collocation"),
    ("make peace", "làm hòa, lập lại hòa bình", "end conflict and restore friendship", "The two rivals decided to make peace.", "collocation"),
    ("make contact", "liên lạc, tiếp xúc", "communicate with someone", "They managed to make contact with the base.", "collocation"),

    # --- TAKE Collocations ---
    ("take a break", "nghỉ giải lao", "rest for a short period", "Let's take a break after this lesson.", "collocation"),
    ("take a chance", "nắm bắt cơ hội, mạo hiểm", "try something with a risk of failure", "Take a chance and follow your dream.", "collocation"),
    ("take a risk", "chấp nhận rủi ro", "do something dangerous or uncertain", "Entrepreneurs must take risks.", "collocation"),
    ("take action", "hành động, thực hiện biện pháp", "do something to address a situation", "The government took immediate action.", "collocation"),
    ("take responsibility", "chịu trách nhiệm", "accept duty or blame for an outcome", "He took responsibility for the error.", "collocation"),
    ("take advantage of", "tận dụng, lợi dụng", "use an opportunity or benefit well", "Take advantage of the free trial.", "collocation"),
    ("take into account", "tính đến, xem xét", "consider something when making a decision", "We must take into account all costs.", "collocation"),
    ("take into consideration", "cân nhắc kỹ lưỡng", "carefully think about factors involved", "Take their feelings into consideration.", "collocation"),
    ("take part in", "tham gia vào", "participate in an activity", "Over 500 athletes took part in the event.", "collocation"),
    ("take place", "diễn ra, xảy ra", "happen or occur at a time/location", "The wedding took place in June.", "collocation"),
    ("take care of", "chăm sóc, lo liệu", "look after or handle something", "Please take care of yourself.", "collocation"),
    ("take notes", "ghi chú, ghi chép", "write down key information", "Students were busy taking notes.", "collocation"),
    ("take time", "dành thời gian, tốn thời gian", "require or spend time", "Mastering a skill takes time.", "collocation"),
    ("take effect", "có hiệu lực, phát huy tác dụng", "begin to operate or produce results", "The medicine will take effect soon.", "collocation"),
    ("take pride in", "tự hào về", "feel proud of an achievement or quality", "She takes great pride in her cooking.", "collocation"),
    ("take for granted", "coi là điều hiển nhiên", "fail to appreciate properly", "Never take your family for granted.", "collocation"),
    ("take notice of", "chú ý đến, để mắt tới", "pay attention to something", "Nobody took notice of his strange attire.", "collocation"),
    ("take breath", "hít thở, lấy lại hơi", "pause to breathe or recover", "Stop and take a deep breath.", "collocation"),
    ("take a look", "nhìn qua, xem xét", "examine or inspect briefly", "Come take a look at this painting.", "collocation"),
    ("take charge of", "nắm quyền chỉ huy, đảm trách", "assume control or leadership", "She took charge of the department.", "collocation"),
    ("take measures", "thực hiện các biện pháp", "implement steps to solve a problem", "Urgent measures were taken to prevent flooding.", "collocation"),
    ("take steps", "tiến hành từng bước", "begin a series of actions toward a goal", "We must take steps to reduce pollution.", "collocation"),

    # --- DO Collocations ---
    ("do business", "kinh doanh, làm ăn", "engage in commerce or trade", "They do business with international firms.", "collocation"),
    ("do homework", "làm bài tập về nhà", "complete school assignments", "Have you done your homework yet?", "collocation"),
    ("do research", "làm nghiên cứu", "conduct scientific or academic study", "Scientists are doing research on the vaccine.", "collocation"),
    ("do damage", "gây thiệt hại", "cause harm or destruction", "The storm did severe damage to crops.", "collocation"),
    ("do harm", "gây hại, làm tổn thương", "cause physical or moral injury", "A bit of rain won't do any harm.", "collocation"),
    ("do a favor", "giúp đỡ, làm ơn", "perform a kind or helpful act", "Could you do me a favor?", "collocation"),
    ("do one's best", "cố gắng hết sức", "try as hard as possible", "Just do your best and don't worry.", "collocation"),
    ("do justice to", "thể hiện đúng tầm, đánh giá đúng", "represent or treat something fairly", "Photos cannot do justice to the sunset.", "collocation"),
    ("do good", "làm việc tốt, có lợi", "produce beneficial results", "Exercise will do you good.", "collocation"),
    ("do wonders", "tạo nên điều kỳ diệu", "have a miraculous positive effect", "A good night's sleep will do wonders.", "collocation"),
    ("do an experiment", "làm thí nghiệm", "perform a scientific test", "Students did an experiment in chemistry class.", "collocation"),

    # --- HAVE Collocations ---
    ("have an impact on", "có tác động đến", "affect or influence something strongly", "Climate change has a huge impact on farming.", "collocation"),
    ("have an effect on", "có ảnh hưởng đến", "produce a result or change in", "Diet has a direct effect on health.", "collocation"),
    ("have access to", "có quyền truy cập vào", "possess permission or ability to use", "Students have access to the digital library.", "collocation"),
    ("have confidence in", "tin tưởng vào", "trust or feel certain about someone", "I have full confidence in your abilities.", "collocation"),
    ("have a conversation", "trò chuyện, đàm đạo", "talk together with someone", "We had a long conversation about future plans.", "collocation"),
    ("have an argument", "tranh cãi, cãi nhau", "dispute or quarrel with someone", "They had a heated argument yesterday.", "collocation"),
    ("have a chat", "nói chuyện phiếm", "talk informally with someone", "Let's have a chat over coffee.", "collocation"),
    ("have a doubt", "nghi ngờ, hoài nghi", "feel uncertainty about something", "I have no doubt about her honesty.", "collocation"),
    ("have in common", "có điểm chung", "share characteristics or interests", "The two friends have a lot in common.", "collocation"),
    ("have in mind", "có ý định, nghĩ đến", "plan or envision something", "What kind of present do you have in mind?", "collocation"),
    ("have no choice", "không còn lựa chọn nào khác", "be forced to accept only one option", "We had no choice but to surrender.", "collocation"),
    ("have an interest in", "có hứng thú với", "feel curious or invested in something", "She has an interest in ancient history.", "collocation"),
    ("have a feeling", "có linh cảm, cảm giác", "sense an intuitive perception", "I have a feeling that something good is coming.", "collocation"),
    ("have difficulty in", "gặp khó khăn trong việc", "struggle to perform a task", "He had difficulty in solving the math problem.", "collocation"),

    # --- GIVE Collocations ---
    ("give advice", "đưa ra lời khuyên", "provide guidance or recommendation", "Can you give me some advice on buying a car?", "collocation"),
    ("give a hand", "giúp một tay", "assist someone with physical work", "Could you give me a hand with this box?", "collocation"),
    ("give an explanation", "đưa ra lời giải thích", "provide reasons for an occurrence", "He failed to give an explanation for his absence.", "collocation"),
    ("give information", "cung cấp thông tin", "disclose facts or details", "The brochure gives information about tours.", "collocation"),
    ("give permission", "cho phép, cấp phép", "grant consent to do something", "The teacher gave permission to leave early.", "collocation"),
    ("give priority to", "ưu tiên cho", "treat something as more important", "We must give priority to emergency repairs.", "collocation"),
    ("give an impression", "tạo ấn tượng", "convey a particular feeling to others", "He gave the impression of being confident.", "collocation"),
    ("give rise to", "làm dấy lên, gây ra", "cause or provoke something to happen", "The decision gave rise to widespread protests.", "collocation"),
    ("give birth to", "sinh ra, khai sinh", "deliver a baby or originate an idea", "She gave birth to a healthy daughter.", "collocation"),
    ("give way to", "nhường đường cho, bị thay thế bởi", "yield precedence or collapse under weight", "Panic gave way to relief.", "collocation"),
    ("give thought to", "suy nghĩ kỹ về", "consider something carefully", "Have you given any thought to my proposal?", "collocation"),
    ("give credit to", "công nhận công lao của", "acknowledge praise or contribution", "We must give credit to the volunteers.", "collocation"),

    # --- PAY Collocations ---
    ("pay attention to", "chú ý đến", "listen or observe closely", "Pay attention to the safety instructions.", "collocation"),
    ("pay a visit", "đến thăm, viếng thăm", "visit someone or a place", "We paid a visit to the national museum.", "collocation"),
    ("pay a compliment", "khen ngợi, tán dương", "express admiration to someone", "He paid her a charming compliment.", "collocation"),
    ("pay tribute to", "bày tỏ lòng kính trọng", "honor and remember someone's contributions", "The city paid tribute to fallen heroes.", "collocation"),
    ("pay respect", "thể hiện sự tôn trọng", "show deference or honor", "Citizens came to pay respect to the elders.", "collocation"),
    ("pay a price", "trả giá, chịu hậu quả", "suffer negative consequences for an action", "He paid a heavy price for his carelessness.", "collocation"),
    ("pay homage to", "tôn kính, tưởng nhớ", "publicly show respect and dedication", "The film pays homage to classic cinema.", "collocation"),

    # --- CATCH & HOLD Collocations ---
    ("catch fire", "bắt lửa, bốc cháy", "begin burning", "Dry leaves catch fire easily.", "collocation"),
    ("catch someone's eye", "thu hút ánh nhìn của ai", "attract visual attention", "The sparkling dress caught my eye.", "collocation"),
    ("catch sight of", "thoáng nhìn thấy", "glimpse briefly", "I caught sight of her in the crowded station.", "collocation"),
    ("catch a cold", "bị cảm lạnh", "become infected with a minor illness", "Wear a jacket or you'll catch a cold.", "collocation"),
    ("catch red-handed", "bắt quả tang", "apprehend while committing a crime", "The thief was caught red-handed.", "collocation"),
    ("hold a meeting", "tổ chức cuộc họp", "convene a gathering for discussion", "The board will hold a meeting on Friday.", "collocation"),
    ("hold a conversation", "duy trì cuộc trò chuyện", "keep talking smoothly", "He struggles to hold a conversation in French.", "collocation"),
    ("hold an opinion", "giữ quan điểm, có ý kiến", "maintain a belief", "Scholars hold different opinions on the topic.", "collocation"),
    ("hold someone accountable", "bắt ai chịu trách nhiệm", "require someone to answer for results", "Leaders must be held accountable.", "collocation"),
    ("hold breath", "nín thở, hồi hộp chờ đợi", "stop breathing in anticipation", "The audience held their breath in suspense.", "collocation"),

    # --- POSE & POINT & DRAW & CAST & BEAR Collocations (Academic / Anime High Frequency) ---
    ("pose a threat", "tạo ra mối đe dọa", "represent a danger to safety or peace", "Locust swarms pose a grave threat to crops.", "collocation"),
    ("pose a risk", "tiềm ẩn rủi ro", "create a potential hazard", "Untested herbs pose a serious risk to health.", "collocation"),
    ("pose a challenge", "đặt ra thách thức", "present a difficult obstacle to overcome", "Deciphering the ancient code posed a challenge.", "collocation"),
    ("point ire toward", "hướng cơn thịnh nộ về phía", "direct anger or blame at someone", "The citizenry will point their ire toward the emperor.", "collocation"),
    ("point fingers at", "chỉ trích, đổ lỗi cho", "blame someone for a problem", "Instead of pointing fingers, let's find a solution.", "collocation"),
    ("draw attention to", "hướng sự chú ý vào", "direct focus toward an issue", "Her findings drew attention to the palace conspiracy.", "collocation"),
    ("draw a conclusion", "rút ra kết luận", "form a reasoned judgment", "We cannot draw a conclusion without evidence.", "collocation"),
    ("draw a distinction", "phân biệt ranh giới", "differentiate clearly between two things", "The law draws a distinction between theft and fraud.", "collocation"),
    ("cast a shadow over", "phủ bóng đen lên", "spoil or cast gloom over a situation", "Rumors cast a dark shadow over the entire court.", "collocation"),
    ("cast doubt on", "gieo rắc hoài nghi về", "make people question truth or validity", "New clues cast doubt on the witness testimony.", "collocation"),
    ("cast light on", "làm sáng tỏ điều gì", "reveal truth or explain a mystery", "Her investigation cast light on the hidden poison.", "collocation"),
    ("bear responsibility", "gánh vác trách nhiệm", "carry duty or blame", "The imperial brother must bear heavy responsibility.", "collocation"),
    ("bear in mind", "ghi nhớ trong đầu, khắc ghi", "remember and keep an idea ready", "Bear in mind that the court has many spies.", "collocation"),
    ("bear witness to", "chứng kiến, làm chứng cho", "observe or give evidence of", "The ancient ruins bear witness to the empire's rise.", "collocation"),
    ("bear resemblance to", "mang nét tương đồng với", "look or seem similar to someone", "She bears a striking resemblance to her mother.", "collocation"),
    ("face the consequences", "đối mặt với hậu quả", "accept inevitable repercussions", "The traitor will face the consequences.", "collocation"),
    ("play a role in", "đóng vai trò trong", "be involved and influential in a matter", "Apothecaries play a vital role in palace health.", "collocation"),
    ("shed light on", "làm sáng tỏ, hé lộ", "clarify or provide understanding", "The discovery shed light on the murder mystery.", "collocation"),
    ("meet the requirements", "đáp ứng các yêu cầu", "fulfill all necessary criteria", "Candidates must meet the strict requirements.", "collocation"),
    ("raise awareness", "nâng cao nhận thức", "increase public understanding of an issue", "Campaigns helped raise awareness about poison risks.", "collocation"),
    ("raise a question", "đặt ra câu hỏi, nêu nghi vấn", "bring up a query for debate", "The anomalous symptoms raise serious questions.", "collocation"),

    # --- ADJECTIVE + NOUN Collocations ---
    ("heavy responsibility", "trách nhiệm nặng nề", "major duty with great consequences", "Jinshi carried a heavy responsibility for the nation.", "collocation"),
    ("heavy rain", "mưa to, mưa như trút nước", "intense precipitation", "Heavy rain caused the mountain rivers to swell.", "collocation"),
    ("heavy traffic", "giao thông ùn tắc, đông đúc", "congested road conditions", "We got stuck in heavy traffic on the royal highway.", "collocation"),
    ("deep trouble", "rắc rối sâu sắc, hiểm họa lớn", "severe and serious difficulty", "Anyone who insults the concubine will be in deep trouble.", "collocation"),
    ("deeply troubled", "vô cùng lo lắng, trăn trở", "intensely worried or perturbed", "The master was deeply troubled by the ominous message.", "collocation"),
    ("deep sorrow", "nỗi buồn sâu thẳm", "profound grief or sadness", "The entire harem fell into deep sorrow.", "collocation"),
    ("striking resemblance", "sự giống nhau đáng kinh ngạc", "very strong physical similarity", "She bears a striking resemblance to the former empress.", "collocation"),
    ("vital role", "vai trò sống còn, then chốt", "extremely important function", "Herbal medicine plays a vital role in recovery.", "collocation"),
    ("crucial factor", "yếu tố mang tính quyết định", "pivotal element in an outcome", "Patience was a crucial factor in brewing the remedy.", "collocation"),
    ("profound impact", "tác động sâu sắc", "deep and far-reaching effect", "The empress's demise had a profound impact on the kingdom.", "collocation"),
    ("sharp decline", "sự sụt giảm mạnh", "rapid downward trend", "There was a sharp decline in crop yields after the drought.", "collocation"),
    ("strong opposition", "sự phản đối mạnh mẽ", "vigorous resistance to an idea", "The emperor's decree faced strong opposition from noble clans.", "collocation"),
    ("widespread panic", "nỗi hoảng loạn lan rộng", "fear spreading throughout a population", "News of the locust plague caused widespread panic.", "collocation"),
    ("urgent priority", "ưu tiên cấp bách", "matter needing immediate attention", "Quarantining the sick ward is an urgent priority.", "collocation"),
    ("high stakes", "nguy cơ cao, tiền cược lớn", "situations with large risks and rewards", "Courtiers play a game of high stakes in the inner palace.", "collocation"),
    ("vast majority", "đại đa số, phần lớn", "overwhelming percentage of a group", "The vast majority of servants know nothing of the plot.", "collocation"),
    ("grave danger", "nguy hiểm nghiêm trọng", "serious threat to life or safety", "The concubine's newborn is in grave danger.", "collocation"),
    ("unanimous decision", "quyết định đồng thuận 100%", "agreement reached by everyone", "The imperial council made a unanimous decision.", "collocation"),
    ("drastic measures", "các biện pháp quyết liệt", "extreme actions to solve an issue", "The guard took drastic measures to secure the gates.", "collocation"),
    ("clear evidence", "bằng chứng rõ ràng", "undeniable proof", "There is clear evidence of arsenic in the tea cup.", "collocation"),
    ("golden opportunity", "cơ hội ngàn vàng", "exceptional chance for success", "This festival is a golden opportunity to gather information.", "collocation"),
    ("raw material", "nguyên liệu thô", "basic unrefined substances", "Alchemists need pure raw materials for experiments.", "collocation"),
    ("burning desire", "khát khao cháy bỏng", "intense passion or ambition", "Maomao has a burning desire to test rare poisons.", "collocation"),
    ("bitter enemy", "kẻ thù không đội trời chung", "hostile and hateful foe", "The two consort clans have been bitter enemies for decades.", "collocation"),
    ("acute awareness", "nhận thức sắc bén", "heightened perception and insight", "Her acute awareness helped detect the poisoned powder.", "collocation"),

    # --- PREPOSITIONAL PHRASE & IDIOMATIC COLLOCATIONS ---
    ("in the aftermath of", "trong bối cảnh hậu quả của", "during the period following a major event", "In the aftermath of the rebellion, order was restored.", "collocation"),
    ("in the wake of", "ngay sau khi, do hậu quả của", "following directly behind an event", "In the wake of the locust storm, food prices soared.", "collocation"),
    ("on the verge of", "trên bờ vực của", "at the very brink of something happening", "The nation stood on the verge of civil war.", "collocation"),
    ("at the expense of", "phải trả giá bằng, làm tổn hại", "causing sacrifice or harm to something else", "He sought power at the expense of his family.", "collocation"),
    ("in accordance with", "phù hợp với, chiểu theo", "following or complying with rules", "The trial was held in accordance with imperial law.", "collocation"),
    ("in light of", "xét theo, dựa trên cơ sở", "taking into consideration new facts", "In light of new evidence, the suspect was exonerated.", "collocation"),
    ("on behalf of", "thay mặt cho, đại diện", "representing another person or group", "The minister spoke on behalf of the crown prince.", "collocation"),
    ("with respect to", "liên quan đến, xét về", "concerning or regarding an issue", "With respect to defense, the border fortress is impenetrable.", "collocation"),
    ("by means of", "bằng phương tiện, nhờ vào", "using a particular method", "The poison was delivered by means of cosmetic cream.", "collocation"),
    ("under the pretext of", "dưới chiêu bài, lấy cớ", "giving a false excuse to conceal true motive", "He entered the inner court under the pretext of delivering silk.", "collocation"),
    ("out of curiosity", "vì tò mò", "motivated by a desire to know", "Maomao tasted the powder purely out of curiosity.", "collocation"),
    ("behind closed doors", "trong phòng kín, bí mật", "in private without public knowledge", "Noble elders negotiated behind closed doors.", "collocation"),
    ("for the sake of", "vì lợi ích của, vì mục đích", "in order to help or protect someone", "She endured the trials for the sake of the young prince.", "collocation"),
    ("at a glance", "ngay từ cái nhìn đầu tiên", "upon immediate inspection", "The skilled apothecary knew the herb's properties at a glance.", "collocation"),
    ("in jeopardy", "gặp nguy hiểm, bấp bênh", "in danger of being lost or destroyed", "The heir's life was in grave jeopardy.", "collocation"),
    ("by all means", "bằng mọi cách, hoàn toàn được", "certainly or without hesitation", "By all means, inspect the apothecary records.", "collocation"),
    ("under no circumstances", "trong bất kỳ hoàn cảnh nào cũng không", "never under any condition", "Under no circumstances should the seal be broken.", "collocation"),
    ("to the best of one's knowledge", "theo hiểu biết tốt nhất của ai", "as far as one is aware", "To the best of my knowledge, this fungus is non-toxic.", "collocation"),
]

def main():
    dict_dir = "/home/taileesin123/Documents/anime-web/data/dict"
    os.makedirs(dict_dir, exist_ok=True)
    phrases_index_path = os.path.join(dict_dir, "phrases_index.json")

    existing_phrases = {}
    if os.path.exists(phrases_index_path):
        with open(phrases_index_path, "r", encoding="utf-8") as f:
            existing_phrases = json.load(f)

    print(f"Loaded existing phrases count: {len(existing_phrases)}")

    added_count = 0
    updated_count = 0

    for phrase, mean_vi, mean_en, example, p_type in COLLOCATIONS_DATA:
        key = phrase.lower().strip()
        entry = {
            "t": p_type,
            "m": mean_vi,
            "en": mean_en,
            "ex": example,
            "s": 200 # Higher score so collocations and phrasal chunks are matched with high priority
        }
        if key not in existing_phrases:
            existing_phrases[key] = entry
            added_count += 1
        else:
            # Update meaning and type if richer
            existing_phrases[key]["t"] = p_type
            existing_phrases[key]["m"] = mean_vi
            existing_phrases[key]["en"] = mean_en
            existing_phrases[key]["ex"] = example
            existing_phrases[key]["s"] = 200
            updated_count += 1

    # Save merged phrases index
    with open(phrases_index_path, "w", encoding="utf-8") as f:
        json.dump(existing_phrases, f, ensure_ascii=False, indent=2)

    # Thống kê tổng hợp
    types_count = {}
    for k, v in existing_phrases.items():
        t = v.get("t", "other")
        types_count[t] = types_count.get(t, 0) + 1

    print(f"[+] Hoàn tất hợp nhất Oxford & Cambridge Collocations vào từ điển!")
    print(f"    - Cụm từ mới thêm vào: {added_count}")
    print(f"    - Cụm từ được cập nhật: {updated_count}")
    print(f"    - Tổng số cụm từ trong hệ thống: {len(existing_phrases)}")
    print(f"    - Phân bổ theo loại: {types_count}")

if __name__ == "__main__":
    main()
