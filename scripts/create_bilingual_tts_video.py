#!/usr/bin/env python3
"""
Bilingual Anime Shadowing with Microsoft Edge Neural TTS Dubbing & Gender Detection
- Pass 1: Plays Japanese audio + Clean Vietsub (No [VI] tag)
- Pass 2: Plays Microsoft Edge Neural TTS (Gender matched: Male/Female) + Clean Engsub (No [EN] tag)
- Original anime voice in Pass 2 is completely replaced by Edge TTS voice.
"""

import os
import sys
import re
import wave
import struct
import random
import asyncio
import subprocess
import numpy as np
import scipy.signal as signal
from datetime import datetime

WORKSPACE = "/home/taileesin123/Documents/anime-web"
SOURCE_VIDEO = os.path.join(WORKSPACE, "master_sources", "[SubsPlease] Futsutsuka na Akujo dewa Gozaimasu ga - 01 (1080p) [C8195ABA].mkv")
VI_ASS = os.path.join(WORKSPACE, "bilingual_data", "ep1.vi.ass")
EN_ASS = os.path.join(WORKSPACE, "bilingual_data", "ep1.en.ass")
TTS_DIR = os.path.join(WORKSPACE, "bilingual_data", "tts_segments")
OUTPUT_VIDEO = os.path.join(WORKSPACE, "public", "videos", "futsutsuka_ep01_bilingual.mp4")
MAPPED_ASS = os.path.join(WORKSPACE, "bilingual_data", "bilingual_clean.ass")
FFMPEG = "/home/taileesin123/.local/bin/ffmpeg"

os.makedirs(TTS_DIR, exist_ok=True)

FEMALE_VOICES_CONFIG = [
    # 1. British English – UK
    "en-GB-SoniaNeural", "en-GB-LibbyNeural", "en-GB-MaisieNeural",
    "en-GB-AbbiNeural", "en-GB-BellaNeural", "en-GB-HollieNeural", "en-GB-OliviaNeural",
    # 2. Australian English – Australia
    "en-AU-NatashaNeural", "en-AU-AnnetteNeural", "en-AU-CarlyNeural", "en-AU-ElsieNeural",
    "en-AU-FreyaNeural", "en-AU-JoanneNeural", "en-AU-KimNeural", "en-AU-TinaNeural",
    # 3. American English – USA
    "en-US-AvaNeural", "en-US-EmmaNeural", "en-US-JennyNeural", "en-US-AriaNeural",
    "en-US-AnaNeural", "en-US-MichelleNeural", "en-US-JaneNeural", "en-US-LunaNeural",
    "en-US-SaraNeural", "en-US-NancyNeural", "en-US-AmberNeural", "en-US-AshleyNeural",
    "en-US-CoraNeural", "en-US-ElizabethNeural", "en-US-MonicaNeural", "en-US-AIGenerate2Neural",
    # 4. Canadian English – Canada
    "en-CA-ClaraNeural",
    # 5. New Zealand English – New Zealand
    "en-NZ-MollyNeural"
]

MALE_VOICES_CONFIG = [
    # 1. British English – UK
    "en-GB-RyanNeural", "en-GB-ThomasNeural", "en-GB-AlfieNeural", "en-GB-ElliotNeural",
    "en-GB-EthanNeural", "en-GB-NoahNeural", "en-GB-OliverNeural",
    # 2. Australian English – Australia
    "en-AU-WilliamNeural", "en-AU-WilliamMultilingualNeural", "en-AU-DarrenNeural",
    "en-AU-DuncanNeural", "en-AU-KenNeural", "en-AU-NeilNeural", "en-AU-TimNeural",
    # 3. American English – USA
    "en-US-AndrewNeural", "en-US-BrianNeural", "en-US-GuyNeural", "en-US-ChristopherNeural",
    "en-US-EricNeural", "en-US-RogerNeural", "en-US-SteffanNeural", "en-US-DavisNeural",
    "en-US-JasonNeural", "en-US-KaiNeural", "en-US-TonyNeural", "en-US-AIGenerate1Neural",
    "en-US-BrandonNeural", "en-US-JacobNeural",
    # 4. Canadian English – Canada
    "en-CA-LiamNeural",
    # 5. New Zealand English – New Zealand
    "en-NZ-MitchellNeural"
]

# Active Edge TTS fallback mapping
FEMALE_VOICES = [
    "en-GB-SoniaNeural", "en-GB-LibbyNeural", "en-GB-MaisieNeural",
    "en-AU-NatashaNeural",
    "en-US-AvaNeural", "en-US-EmmaNeural", "en-US-JennyNeural", "en-US-AriaNeural",
    "en-US-AnaNeural", "en-US-MichelleNeural",
    "en-CA-ClaraNeural",
    "en-NZ-MollyNeural"
]

MALE_VOICES = [
    "en-GB-RyanNeural", "en-GB-ThomasNeural",
    "en-AU-WilliamMultilingualNeural",
    "en-US-AndrewNeural", "en-US-BrianNeural", "en-US-GuyNeural",
    "en-US-ChristopherNeural", "en-US-EricNeural", "en-US-RogerNeural", "en-US-SteffanNeural",
    "en-CA-LiamNeural",
    "en-NZ-MitchellNeural"
]

import edge_tts

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
    cmd = [FFMPEG, "-i", video_path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", res.stderr)
    if m:
        h, mn, s = m.groups()
        return int(h) * 3600 + int(mn) * 60 + float(s)
    return 1429.98

def load_full_audio_for_pitch(source_video):
    print("[*] Trích xuất âm thanh mono 16kHz để phân tích cao độ toàn tập...")
    mono_wav = os.path.join(WORKSPACE, "bilingual_data", "master_mono16k.wav")
    if not os.path.exists(mono_wav) or os.path.getsize(mono_wav) < 1000:
        cmd = [
            FFMPEG, '-y',
            '-i', source_video,
            '-vn', '-ar', '16000', '-ac', '1',
            mono_wav
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    with wave.open(mono_wav, 'r') as wf:
        n_frames = wf.getnframes()
        raw = wf.readframes(n_frames)
        samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
    return samples, 16000

def fast_detect_gender(audio_samples, sr, start_sec, end_sec, text_context=""):
    lower_ctx = text_context.lower()
    male_keywords = ['thái tử', 'thần vũ', 'thuyền trưởng', 'hoàng đế', 'captain', 'prince', 'his highness', 'emperor']
    female_keywords = ['tiểu thư', 'nàng', 'thị nữ', 'linh lâm', 'tuệ nguyệt', 'reirin', 'keigetsu', 'maiden', 'empress', 'consort']

    for kw in male_keywords:
        if kw in lower_ctx:
            return 'male', 120.0
    for kw in female_keywords:
        if kw in lower_ctx:
            return 'female', 240.0

    i_start = int(start_sec * sr)
    i_end = int(end_sec * sr)
    chunk = audio_samples[i_start:i_end]
    if len(chunk) < sr * 0.2:
        return 'female', 220.0

    win_size = int(sr * 0.04) # 640
    hop = int(sr * 0.02)
    min_lag = int(sr / 360)   # 44
    max_lag = int(sr / 75)    # 213

    pitches = []
    for i in range(0, len(chunk) - win_size, hop):
        frame = chunk[i:i+win_size]
        if np.mean(frame**2) < 500000:
            continue
        corr = signal.correlate(frame, frame, mode='full')
        corr = corr[len(frame)-1:]
        search_region = corr[min_lag:max_lag]
        if len(search_region) == 0:
            continue
        peak_idx = np.argmax(search_region) + min_lag
        if corr[0] > 0 and corr[peak_idx] / corr[0] > 0.35:
            p = sr / peak_idx
            if 75 <= p <= 360:
                pitches.append(p)

    if not pitches:
        return 'female', 220.0
    avg_p = float(np.mean(pitches))
    return ('female' if avg_p > 170 else 'male'), avg_p

async def generate_tts_for_group(group_idx, en_text, voice, target_dur, offset=0.08):
    clean_en = re.sub(r'\{[^\}]+\}', '', en_text).replace('\\N', ' ').replace('\n', ' ').strip()
    spoken_text = re.sub(r'[^\w\s\',.?!-]', '', clean_en).strip()

    raw_mp3 = os.path.join(TTS_DIR, f"raw_{group_idx}.mp3")
    raw_wav = os.path.join(TTS_DIR, f"raw_{group_idx}.wav")
    out_wav = os.path.join(TTS_DIR, f"tts_group_{group_idx}.wav")
    offset_ms = int(max(0.04, offset) * 1000)

    # Check if out_wav already generated and valid
    if os.path.exists(out_wav) and os.path.getsize(out_wav) > 1000:
        return out_wav

    # If text has no words, generate clean silence matching target_dur
    if not re.search(r'[a-zA-Z0-9]', spoken_text):
        pad_cmd = [
            FFMPEG, '-y',
            '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
            '-t', str(round(target_dur, 3)),
            out_wav
        ]
        subprocess.run(pad_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return out_wav

    # 1. Estimate initial rate for natural Edge TTS prosody
    est_words = len(spoken_text.split())
    est_dur = max(0.4, est_words / 2.6)
    rate_str = "+0%"
    if est_dur > target_dur and target_dur > 0.5:
        speed_factor = min(1.35, est_dur / target_dur)
        pct = int((speed_factor - 1.0) * 100)
        rate_str = f"+{pct}%"

    # Retry up to 4 times with backoff
    for attempt in range(4):
        try:
            comm = edge_tts.Communicate(spoken_text, voice, rate=rate_str)
            await comm.save(raw_mp3)
            if os.path.exists(raw_mp3) and os.path.getsize(raw_mp3) > 200:
                break
        except Exception as e:
            if attempt < 3:
                await asyncio.sleep(0.3 * (attempt + 1))
            else:
                print(f"[!] Warning on TTS group {group_idx} after retries: {e}")

    try:
        # Decode to 44.1kHz stereo WAV to measure exact duration
        cmd_decode = [
            FFMPEG, '-y',
            '-i', raw_mp3,
            '-ar', '44100', '-ac', '2',
            raw_wav
        ]
        subprocess.run(cmd_decode, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        if os.path.exists(raw_wav) and os.path.getsize(raw_wav) > 500:
            with wave.open(raw_wav, 'r') as wf:
                n_frames = wf.getnframes()
                rate = wf.getframerate()
                t_raw = n_frames / float(rate)

            # Available duration for spoken words (leaving start offset + trailing cushion)
            cushion = 0.08 if target_dur >= 1.2 else 0.03
            start_off = offset if target_dur >= 1.2 else 0.04
            t_avail = max(0.25, target_dur - (start_off + cushion))

            # Adaptive dynamic stretching: if speech is longer than available time, speed up
            if t_raw > t_avail:
                ratio = t_raw / t_avail
                ratio = min(2.8, ratio) # Cap at 2.8x for maximum clarity
                if ratio <= 2.0:
                    tempo_filter = f"atempo={ratio:.4f}"
                else:
                    tempo_filter = f"atempo=2.0,atempo={ratio/2.0:.4f}"
            else:
                tempo_filter = "atempo=1.0"

            # Combine: atempo -> adelay -> volume=1.20 (120% audio gain) -> apad -> exact trim to target_dur
            af_chain = f"{tempo_filter},adelay={offset_ms}|{offset_ms},volume=1.20,apad=pad_dur={round(target_dur + 1.0, 3)}"

            pad_cmd = [
                FFMPEG, '-y',
                '-i', raw_wav,
                '-af', af_chain,
                '-t', str(round(target_dur, 3)),
                '-ar', '44100', '-ac', '2',
                out_wav
            ]
            subprocess.run(pad_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return out_wav
    except Exception as e:
        print(f"[!] Warning on audio processing group {group_idx}: {e}")

    # Fallback to silence
    pad_cmd = [
        FFMPEG, '-y',
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
        '-t', str(round(target_dur, 3)),
        out_wav
    ]
    subprocess.run(pad_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return out_wav

def build_bilingual_plan():
    print("[*] Đang phân tích dữ liệu và phân đoạn hội thoại (từng câu độc lập - Sentence by Sentence)...")
    vi_events = load_events(VI_ASS)
    en_events = load_events(EN_ASS)
    total_dur = get_video_duration(SOURCE_VIDEO)
    audio_samples, sr = load_full_audio_for_pitch(SOURCE_VIDEO)

    def clean_text(t):
        return re.sub(r'\{[^\}]+\}', '', t).replace('\\N', ' ').strip()

    print(f"[+] Tổng cộng {len(vi_events)} câu thoại tiếng Việt.")

    timeline_segments = []
    mapped_dialogues = []
    tts_tasks = []

    current_src = 0.0
    current_out = 0.0

    male_count = 0
    female_count = 0

    for idx, vi in enumerate(vi_events):
        v_start = max(0.0, vi['start'] - 0.10)
        v_end = min(total_dur, vi['end'] + 0.10)
        v_dur = max(0.5, v_end - v_start)

        # Non-dialogue segment before this sentence
        if v_start > current_src + 0.04:
            non_dur = v_start - current_src
            timeline_segments.append({
                'type': 'normal',
                'src_start': current_src,
                'src_end': v_start,
                'audio_source': 'video'
            })
            current_out += non_dur

        # Find best matching English lines
        v_mid = (vi['start'] + vi['end']) / 2.0
        best_ens = []
        for en in en_events:
            overlap = max(0.0, min(vi['end'], en['end']) - max(vi['start'], en['start']))
            if overlap > 0.25:
                best_ens.append(en)
        if not best_ens:
            best_en = min(en_events, key=lambda e: abs((e['start'] + e['end'])/2.0 - v_mid))
            best_ens = [best_en]

        combined_en = " ".join([clean_text(e['text']) for e in best_ens])
        if not combined_en.strip():
            combined_en = clean_text(vi['text'])

        # Gender Detection
        gender, pitch = fast_detect_gender(audio_samples, sr, v_start, v_end, vi['text'])
        if gender == 'female':
            female_count += 1
            chosen_voice = random.choice(FEMALE_VOICES)
        else:
            male_count += 1
            chosen_voice = random.choice(MALE_VOICES)

        # Pass 1: Vietnamese (Original Voice + Clean Vietsub - NO [VI] TAG)
        timeline_segments.append({
            'type': 'vi_repeat',
            'src_start': v_start,
            'src_end': v_end,
            'audio_source': 'video'
        })
        mapped_dialogues.append({
            'start': current_out + 0.05,
            'end': current_out + v_dur - 0.05,
            'style': 'ViStyle',
            'text': re.sub(r'\{[^\}]+\}', '', vi['text']).replace('\\N', ' \\N ')
        })
        current_out += v_dur

        # Pass 2: English (Edge Neural TTS + Clean Engsub - NO [EN] TAG)
        tts_tasks.append((idx, combined_en, chosen_voice, v_dur, 0.06))

        timeline_segments.append({
            'type': 'en_tts_repeat',
            'src_start': v_start,
            'src_end': v_end,
            'audio_source': 'tts',
            'tts_wav': os.path.join(TTS_DIR, f"tts_group_{idx}.wav"),
            'gender': gender,
            'voice': chosen_voice
        })
        mapped_dialogues.append({
            'start': current_out + 0.05,
            'end': current_out + v_dur - 0.05,
            'style': 'EnStyle',
            'text': combined_en
        })
        current_out += v_dur

        current_src = v_end

    if current_src < total_dur:
        timeline_segments.append({
            'type': 'normal',
            'src_start': current_src,
            'src_end': total_dur,
            'audio_source': 'video'
        })
        current_out += (total_dur - current_src)

    print(f"[+] Phân loại giới tính nhân vật: {female_count} Nữ (Female) | {male_count} Nam (Male)")
    print(f"[+] Kế hoạch dựng: {len(timeline_segments)} phân đoạn, thời lượng {format_ass_time(current_out)}")

    # Write clean ASS Subtitle (NO [VI] / [EN] tags)
    ass_header = """[Script Info]
Title: Bilingual Shadowing Subtitle Clean
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ViStyle,Arial,58,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3.5,1.5,2,20,20,38,1
Style: EnStyle,Arial,58,&H00FFFFE0,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3.5,1.5,2,20,20,38,1

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
    print(f"[+] Đã tạo file phụ đề sạch không có tag [VI]/[EN]: {MAPPED_ASS}")

    return timeline_segments, tts_tasks

async def generate_all_tts(tts_tasks):
    print(f"[*] Bắt đầu sinh {len(tts_tasks)} file lồng tiếng Edge Neural TTS (Nam/Nữ)...")
    sem = asyncio.Semaphore(5)

    async def worker(task):
        async with sem:
            idx, text, voice, dur, off = task
            await generate_tts_for_group(idx, text, voice, dur, off)

    await asyncio.gather(*[worker(t) for t in tts_tasks])
    print(f"[+] Đã hoàn thành toàn bộ {len(tts_tasks)} file lồng tiếng Edge TTS!")

def assemble_full_audio(timeline_segments):
    print("[*] Đang ghép nối luồng âm thanh tổng thể (Vietsub gốc + Engsub Edge TTS)...")
    full_audio_path = os.path.join(WORKSPACE, "bilingual_data", "full_bilingual_audio.wav")
    chunk_list_file = os.path.join(WORKSPACE, "bilingual_data", "audio_chunks.txt")
    lines = []

    for i, seg in enumerate(timeline_segments):
        start = round(seg['src_start'], 3)
        end = round(seg['src_end'], 3)
        dur = round(end - start, 3)

        if seg['audio_source'] == 'video':
            chunk_wav = os.path.join(TTS_DIR, f"src_audio_{i}.wav")
            cmd = [
                FFMPEG, "-y",
                "-ss", str(max(0.0, start - 1.0)),
                "-i", SOURCE_VIDEO,
                "-ss", str(min(1.0, start)),
                "-t", str(dur),
                "-vn", "-ar", "44100", "-ac", "2",
                chunk_wav
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            lines.append(f"file '{chunk_wav}'\n")
        else:
            tts_wav = seg['tts_wav']
            lines.append(f"file '{tts_wav}'\n")

    with open(chunk_list_file, "w", encoding="utf-8") as f:
        f.writelines(lines)

    concat_cmd = [
        FFMPEG, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", chunk_list_file,
        "-c:a", "pcm_s16le",
        "-ar", "44100", "-ac", "2",
        full_audio_path
    ]
    subprocess.run(concat_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[+] Đã hoàn thành file âm thanh tổng thể: {full_audio_path}")
    return full_audio_path

def render_bilingual_video(timeline_segments, full_audio_path):
    print("[*] Đang chuẩn bị các đoạn video mảnh (video chunks) để ghép nối chuẩn xác 100% không lỗi NAL...")
    video_chunks_dir = os.path.join(WORKSPACE, "bilingual_data", "video_chunks")
    os.makedirs(video_chunks_dir, exist_ok=True)

    unique_cuts = {}
    for seg in timeline_segments:
        start = round(seg['src_start'], 3)
        end = round(seg['src_end'], 3)
        dur = round(end - start, 3)
        key = (start, dur)
        if key not in unique_cuts:
            unique_cuts[key] = f"cut_{start}_{dur}.ts"

    print(f"[+] Trích xuất {len(unique_cuts)} phân cảnh độc nhất từ video gốc (đa luồng)...")
    from concurrent.futures import ThreadPoolExecutor

    def extract_cut(cut_item):
        (start, dur), fname = cut_item
        out_path = os.path.join(video_chunks_dir, fname)
        if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
            return
        cmd = [
            FFMPEG, "-y",
            "-ss", str(max(0.0, start - 1.0)),
            "-i", SOURCE_VIDEO,
            "-ss", str(min(1.0, start)),
            "-t", str(dur),
            "-an",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-f", "mpegts",
            out_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    with ThreadPoolExecutor(max_workers=8) as executor:
        list(executor.map(extract_cut, unique_cuts.items()))

    print(f"[+] Đã hoàn thành toàn bộ {len(unique_cuts)} video mảnh!")

    concat_list_file = os.path.join(WORKSPACE, "bilingual_data", "video_chunks.txt")
    with open(concat_list_file, "w", encoding="utf-8") as f:
        for seg in timeline_segments:
            start = round(seg['src_start'], 3)
            end = round(seg['src_end'], 3)
            dur = round(end - start, 3)
            fname = unique_cuts[(start, dur)]
            fpath = os.path.join(video_chunks_dir, fname)
            f.write(f"file '{fpath}'\n")

    print("[*] Đang ghép nối toàn bộ video và hardsub phụ đề tiếng Việt / tiếng Anh...")
    cmd = [
        FFMPEG, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list_file,
        "-i", full_audio_path,
        "-vf", f"ass={MAPPED_ASS}",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        "-crf", "21",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        OUTPUT_VIDEO
    ]

    print("[*] Bắt đầu nén video hoàn chỉnh (FFmpeg)...")
    proc = subprocess.run(cmd)
    if proc.returncode == 0 and os.path.exists(OUTPUT_VIDEO):
        size_mb = round(os.path.getsize(OUTPUT_VIDEO) / (1024 * 1024), 2)
        print("\n" + "="*60)
        print(f"[+] XUẤT BẢN VIDEO SONG NGỮ LỒNG TIẾNG EDGE TTS THÀNH CÔNG!")
        print(f"[+] File: {OUTPUT_VIDEO} ({size_mb} MB)")
        print("="*60 + "\n")
        return True
    else:
        print("[!] Lỗi khi render FFmpeg.")
        return False

if __name__ == "__main__":
    segments, tasks = build_bilingual_plan()
    asyncio.run(generate_all_tts(tasks))
    full_audio = assemble_full_audio(segments)
    render_bilingual_video(segments, full_audio)
