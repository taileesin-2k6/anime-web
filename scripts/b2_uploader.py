#!/usr/bin/env python3
"""
Backblaze B2 Uploader & Link Generator
Usage:
    python scripts/b2_uploader.py --file /path/to/video.mp4 --key-id <KEY_ID> --app-key <APPLICATION_KEY>
"""

import sys
import os
import argparse
from b2sdk.v2 import B2Api, InMemoryAccountInfo

BUCKET_NAME = "anime-lethanhtai"

def upload_file_to_b2(file_path: str, key_id: str, app_key: str, dest_name: str = None):
    if not os.path.exists(file_path):
        print(f"[!] File không tồn tại: {file_path}")
        return None

    if not dest_name:
        dest_name = os.path.basename(file_path)

    print(f"[*] Đang xác thực tài khoản Backblaze B2...")
    info = InMemoryAccountInfo()
    b2_api = B2Api(info)
    b2_api.authorize_account("production", key_id, app_key)

    print(f"[*] Đang kết nối bucket '{BUCKET_NAME}'...")
    bucket = b2_api.get_bucket_by_name(BUCKET_NAME)

    print(f"[*] Bắt đầu tải lên: {dest_name} ({round(os.path.getsize(file_path)/(1024*1024), 2)} MB)...")
    uploaded_file = bucket.upload_local_file(
        local_file=file_path,
        file_name=dest_name,
    )

    download_url = b2_api.get_download_url_for_file_name(BUCKET_NAME, dest_name)
    print("\n" + "="*50)
    print(f"[+] UPLOAD THÀNH CÔNG!")
    print(f"[+] Link video phát trực tuyến: {download_url}")
    print("="*50 + "\n")
    return download_url

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Upload video to Backblaze B2 bucket anime-lethanhtai")
    parser.add_argument("--file", type=str, required=True, help="Đường dẫn file video trên máy")
    parser.add_argument("--key-id", type=str, default=os.getenv("B2_KEY_ID", ""), help="Backblaze Key ID")
    parser.add_argument("--app-key", type=str, default=os.getenv("B2_APP_KEY", ""), help="Backblaze Application Key")
    parser.add_argument("--name", type=str, default=None, help="Tên file lưu trên B2")
    args = parser.parse_args()

    if not args.key_id or not args.app_key:
        print("[!] Thiếu Key ID hoặc Application Key.")
        print("[*] Bạn có thể lấy tại: Backblaze Console -> Application Keys -> Add a New Application Key")
        sys.exit(1)

    upload_file_to_b2(args.file, args.key_id, args.app_key, args.name)
