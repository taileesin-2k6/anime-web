#!/usr/bin/env python3
"""
Bilingual Anime Generator: Sentence-by-Sentence Shadowing (Vietsub -> Engsub Replay)
Generates an anime video where each dialogue scene plays first with Vietnamese Subtitles,
and then immediately replays the exact same scene with English Subtitles.
"""

import os
import sys
import re
import subprocess
from datetime import datetime

WORKSPACE = "/home/taileesin123/Documents/anime-web"
SOURCE_VIDEO = os.path.join(WORKSPACE, "master_sources", "[SubsPlease] Futsutsuka na Akujo dewa Gozaimasu ga - 01 (1080p) [C8195ABA].mkv")
VI_ASS = os.path.join(WORKSPACE, "bilingual_data", "ep1.vi.ass")
EN_ASS = os.path.join(WORKSPACE, "bilingual_data", "ep1.en.ass")
OUTPUT_VIDEO = os.path.join(WORKSPACE, "public", "videos", "futsutsuka_ep01_bilingual.mp4")
MAPPED_ASS = os.path.join(WORKSPACE, "bilingual_data", "bilingual_mapped.ass")
FFMPEG = "/home/taileesin123/.local/bin/ffmpeg"

def parse_time(t_str):
    parts = t_str.split(':')
    h = int(parts[0])
    m = int(parts[1])
    s = float(parts[2])
    return h * 3600 + m * 60 + s

def format_ass_time(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h}:{m:02d}:{s:05.2f}"

def load_events(ass_file):
    events = []
    with open(ass_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('Dialogue:'):
                parts = line.split(',', 9)
                start = parse_time(parts[1])
                end = parse_time(parts[2])
                style = parts[3]
                text = parts[9].strip()
                if style == 'Default':
                    events.append({
                        'start': start,
                        'end': end,
                        'text': text
                    })
    events.sort(key=lambda x: x['start'])
    return events

def get_video_duration(video_path):
    cmd = [
        FFMPEG, "-i", video_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", res.stderr)
    if m:
        h, mn, s = m.groups()
        return int(h) * 3600 + int(mn) * 60 + float(s)
    return 1429.98 # Default ~23:50

def build_bilingual_timeline():
    print("[*] Đang phân tích dữ liệu phụ đề Việt - Anh...")
    vi_events = load_events(VI_ASS)
    en_events = load_events(EN_ASS)
    total_dur = get_video_duration(SOURCE_VIDEO)

    # Group spoken dialogues (merge if gap < 0.6s and group length <= 8s)
    groups = []
    curr_group = [vi_events[0]]
    for e in vi_events[1:]:
        prev = curr_group[-1]
        group_dur = e['end'] - curr_group[0]['start']
        if (e['start'] - prev['end'] < 0.6) and (group_dur <= 8.0):
            curr_group.append(e)
        else:
            groups.append(curr_group)
            curr_group = [e]
    if curr_group:
        groups.append(curr_group)

    print(f"[+] Đã gom {len(groups)} cụm câu thoại để thực hiện lặp song ngữ.")

    # Match English events for each group
    def get_en_events(start, end):
        matched = []
        for en in en_events:
            if not (en['end'] < start or en['start'] > end):
                matched.append(en)
        return matched

    # Build sequence of timeline cuts & mapped subtitles
    timeline_segments = []
    mapped_dialogues = []

    current_source_time = 0.0
    current_out_time = 0.0

    for i, g in enumerate(groups):
        g_start = max(0.0, g[0]['start'] - 0.15)
        g_end = min(total_dur, g[-1]['end'] + 0.15)
        g_dur = g_end - g_start

        # 1. Non-dialogue segment before this group
        if g_start > current_source_time + 0.05:
            non_dur = g_start - current_source_time
            timeline_segments.append({
                'type': 'normal',
                'src_start': current_source_time,
                'src_end': g_start
            })
            current_out_time += non_dur

        # 2. Pass 1: Vietnamese Dialogue
        timeline_segments.append({
            'type': 'vi_repeat',
            'src_start': g_start,
            'src_end': g_end
        })
        for vi_line in g:
            offset_in_group = vi_line['start'] - g_start
            dur_line = vi_line['end'] - vi_line['start']
            out_start = current_out_time + offset_in_group
            out_end = out_start + dur_line
            # Stylish Vietnamese dialogue with subtle tag
            clean_text = vi_line['text']
            # Clean Aegisub formatting tags for consistency
            clean_text = re.sub(r'\{[^\}]+\}', '', clean_text).replace('\\N', ' \\N ')
            mapped_dialogues.append({
                'start': out_start,
                'end': out_end,
                'style': 'ViStyle',
                'text': f"{{\\c&H00FFFF&}}[VI]{{\\r}} {clean_text}"
            })
        current_out_time += g_dur

        # 3. Pass 2: English Dialogue Replay
        timeline_segments.append({
            'type': 'en_repeat',
            'src_start': g_start,
            'src_end': g_end
        })
        en_matched = get_en_events(g[0]['start'], g[-1]['end'])
        if not en_matched:
            # Fallback if no specific English sub found
            en_matched = [{'start': g[0]['start'], 'end': g[-1]['end'], 'text': g[0]['text']}]

        for en_line in en_matched:
            offset_in_group = max(0.0, en_line['start'] - g_start)
            dur_line = max(0.5, en_line['end'] - en_line['start'])
            out_start = current_out_time + offset_in_group
            out_end = out_start + dur_line
            clean_text = en_line['text']
            clean_text = re.sub(r'\{[^\}]+\}', '', clean_text).replace('\\N', ' \\N ')
            mapped_dialogues.append({
                'start': out_start,
                'end': out_end,
                'style': 'EnStyle',
                'text': f"{{\\c&H38B6FF&}}[EN]{{\\r}} {clean_text}"
            })
        current_out_time += g_dur

        current_source_time = g_end

    # Final non-dialogue segment
    if current_source_time < total_dur:
        timeline_segments.append({
            'type': 'normal',
            'src_start': current_source_time,
            'src_end': total_dur
        })
        current_out_time += (total_dur - current_source_time)

    print(f"[+] Tổng thời lượng video Song ngữ: {format_ass_time(current_out_time)} (gồm {len(timeline_segments)} phân đoạn nối)")

    # Write Mapped ASS File
    ass_header = """[Script Info]
Title: Bilingual Shadowing Subtitle (VI -> EN)
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ViStyle,Arial,58,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3.5,1.5,2,20,20,38,1
Style: EnStyle,Arial,58,&H00E0FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3.5,1.5,2,20,20,38,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ass_lines = [ass_header]
    for d in mapped_dialogues:
        start_str = format_ass_time(d['start'])
        end_str = format_ass_time(d['end'])
        ass_lines.append(f"Dialogue: 0,{start_str},{end_str},{d['style']},,0,0,0,,{d['text']}\n")

    with open(MAPPED_ASS, 'w', encoding='utf-8') as f:
        f.writelines(ass_lines)
    print(f"[+] Đã tạo file phụ đề song ngữ map thời gian: {MAPPED_ASS}")

    return timeline_segments

def render_bilingual_video(timeline_segments):
    print("[*] Đang chuẩn bị luồng FFmpeg ghép video và lặp phân đoạn song ngữ...")
    
    filter_parts = []
    v_labels = []
    a_labels = []

    for i, seg in enumerate(timeline_segments):
        start = round(seg['src_start'], 3)
        end = round(seg['src_end'], 3)
        filter_parts.append(f"[0:v]trim={start}:{end},setpts=PTS-STARTPTS[v{i}];")
        filter_parts.append(f"[0:a]atrim={start}:{end},asetpts=PTS-STARTPTS[a{i}];")
        v_labels.append(f"[v{i}]")
        a_labels.append(f"[a{i}]")

    concat_inputs = "".join([f"{v}{a}" for v, a in zip(v_labels, a_labels)])
    filter_parts.append(f"{concat_inputs}concat=n={len(timeline_segments)}:v=1:a=1[basev][basea];")
    filter_parts.append(f"[basev]ass={MAPPED_ASS}[finalv]")

    filtergraph = "".join(filter_parts)
    filter_script_path = os.path.join(WORKSPACE, "bilingual_data", "filter_complex.txt")
    with open(filter_script_path, "w", encoding="utf-8") as f:
        f.write(filtergraph)

    print(f"[*] Đã xuất filter script ({len(filtergraph)} ký tự). Bắt đầu encode FFmpeg...")
    cmd = [
        FFMPEG, "-y",
        "-i", SOURCE_VIDEO,
        "-filter_complex_script", filter_script_path,
        "-map", "[finalv]",
        "-map", "[basea]",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        "-crf", "21",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        OUTPUT_VIDEO
    ]

    print("[*] Lệnh encode:", " ".join(cmd[:8]), "...")
    proc = subprocess.run(cmd)
    if proc.returncode == 0 and os.path.exists(OUTPUT_VIDEO):
        size_mb = round(os.path.getsize(OUTPUT_VIDEO) / (1024 * 1024), 2)
        print("\n" + "="*60)
        print(f"[+] XUẤT BẢN VIDEO SONG NGỮ (VIETSUB -> ENGSUB REPLAY) THÀNH CÔNG!")
        print(f"[+] File: {OUTPUT_VIDEO} ({size_mb} MB)")
        print("="*60 + "\n")
        return True
    else:
        print("[!] Lỗi khi render FFmpeg.")
        return False

if __name__ == "__main__":
    segments = build_bilingual_timeline()
    render_bilingual_video(segments)
