#!/usr/bin/env python3
import subprocess
import sys
import time

SLUG = "futsutsuka-na-akujo-dewa-gozaimasu-ga"
QUERY = "Futsutsuka na Akujo dewa Gozaimasu ga"
BILI_URL = "https://www.bilibili.tv/vi/play/2414053"

for ep in [5, 9]:
    print(f"\n==========================================", flush=True)
    print(f"[*] TIẾN HÀNH LÀM LẠI CHUẨN XÁC TẬP {ep}...", flush=True)
    print(f"==========================================", flush=True)
    cmd = [
        "python3",
        "/home/taileesin123/.gemini/config/skills/ep-anime-web/scripts/pipeline.py",
        "--slug", SLUG,
        "--query", QUERY,
        "--ep", str(ep),
        "--bili-url", BILI_URL
    ]
    res = subprocess.run(cmd)
    if res.returncode != 0:
        print(f"[!] Tập {ep} lỗi (code {res.returncode}). Retry lại...", flush=True)
        time.sleep(3)
        res = subprocess.run(cmd)
    print(f"[+] Hoàn tất xử lý tập {ep}!", flush=True)

print("\n🎉 ĐÃ LÀM LẠI THÀNH CÔNG CẢ TẬP 5 VÀ TẬP 9!", flush=True)
