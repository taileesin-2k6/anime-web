#!/usr/bin/env python3
import subprocess
import sys
import time

SLUG = "futsutsuka-na-akujo-dewa-gozaimasu-ga"
QUERY = "Futsutsuka na Akujo dewa Gozaimasu ga"
BILI_URL = "https://www.bilibili.tv/vi/play/2414053"
START_EP = 9
END_EP = 11

print(f"=== TIẾP TỤC CHẠY BATCH TỰ ĐỘNG TỪ TẬP {START_EP} ĐẾN TẬP {END_EP} ===", flush=True)

for ep in range(START_EP, END_EP + 1):
    print(f"\n==========================================", flush=True)
    print(f"[*] BẮT ĐẦU XỬ LÝ TẬP {ep}/{END_EP} CHO {SLUG}", flush=True)
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
        print(f"[!] Tập {ep} thất bại với mã lỗi {res.returncode}. Thử lại lần 2 sau 5s...", flush=True)
        time.sleep(5)
        res2 = subprocess.run(cmd)
        if res2.returncode != 0:
            print(f"[X] Tập {ep} tiếp tục lỗi. Bỏ qua để chạy tập tiếp theo.", flush=True)
        else:
            print(f"[+] Tập {ep} hoàn tất thành công ở lượt retry!", flush=True)
    else:
        print(f"[+] Tập {ep} hoàn tất thành công 100%!", flush=True)

print(f"\n🎉 HOÀN THÀNH TẤT CẢ CÁC TẬP TỪ {START_EP} ĐẾN {END_EP}!", flush=True)
