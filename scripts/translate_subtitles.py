#!/usr/bin/env python3
"""
Translate ASS Subtitles to Vietnamese with proper anime styling.
"""

import re
import sys
from deep_translator import GoogleTranslator

def translate_ass(input_file: str, output_file: str):
    print(f"[*] Đang đọc file phụ đề: {input_file}")
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    translator = GoogleTranslator(source='en', target='vi')
    output_lines = []
    
    dialogue_pattern = re.compile(r'^(Dialogue:\s*\d+,[^,]+,[^,]+,[^,]+,[^,]*,\d+,\d+,\d+,[^,]*),(.*)$')
    tag_pattern = re.compile(r'(\{.*?\})')

    dialogue_indices = []
    texts_to_translate = []

    print("[*] Đang phân tích các câu thoại...")
    for idx, line in enumerate(lines):
        match = dialogue_pattern.match(line)
        if match:
            header, content = match.group(1), match.group(2)
            dialogue_indices.append((idx, header, content))
            
            # Extract plain text without ASS tags for clean translation
            plain_text = re.sub(r'\{.*?\}', '', content)
            plain_text = plain_text.replace(r'\N', ' [NL] ').replace(r'\n', ' [NL] ').strip()
            texts_to_translate.append(plain_text)
        output_lines.append(line)

    print(f"[*] Tìm thấy {len(texts_to_translate)} câu thoại. Đang dịch sang tiếng Việt...")

    batch_size = 50
    translated_texts = []
    for i in range(0, len(texts_to_translate), batch_size):
        batch = texts_to_translate[i:i+batch_size]
        try:
            # Batch translate
            res = translator.translate_batch(batch)
            translated_texts.extend(res)
            print(f" -> Đã dịch {min(i+batch_size, len(texts_to_translate))}/{len(texts_to_translate)} câu...")
        except Exception as e:
            print(f"[!] Lỗi dịch batch {i}: {e}. Đang dịch từng câu...")
            for single in batch:
                try:
                    if single:
                        translated_texts.append(translator.translate(single))
                    else:
                        translated_texts.append("")
                except:
                    translated_texts.append(single)

    # Reconstruct ASS dialogue lines
    for (idx, header, orig_content), trans in zip(dialogue_indices, translated_texts):
        # Extract original tags (e.g. {\an8})
        tags = "".join(tag_pattern.findall(orig_content))
        
        # Restore newlines
        clean_trans = trans.replace('[NL]', r'\N').replace('[nl]', r'\N').replace('  ', ' ').strip()
        
        # Combine
        final_text = f"{tags}{clean_trans}"
        output_lines[idx] = f"{header},{final_text}\n"

    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(output_lines)

    print(f"[+] Đã lưu phụ đề Vietsub vào: {output_file}")

if __name__ == '__main__':
    inp = sys.argv[1] if len(sys.argv) > 1 else '/tmp/subs_en.ass'
    out = sys.argv[2] if len(sys.argv) > 2 else '/tmp/subs_vi.ass'
    translate_ass(inp, out)
