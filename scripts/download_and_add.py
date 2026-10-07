#!/usr/bin/env python3
"""
Automation Helper: Download Anime Torrent from Nyaa.si
Usage:
    python scripts/download_and_add.py --name "Futsutsuka na Akujo" --ep 1
"""

import sys
import argparse
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

def search_nyaa(anime_name: str, episode: str = ""):
    query = f"{anime_name} {episode}".strip()
    encoded_query = urllib.parse.quote_plus(query)
    url = f"https://nyaa.si/?page=rss&q={encoded_query}"
    
    print(f"[*] Đang tìm kiếm trên Nyaa RSS: {url}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            xml_data = resp.read()
            root = ET.fromstring(xml_data)
            items = root.findall('.//item')
            print(f"[+] Tìm thấy {len(items)} kết quả.")
            for i, item in enumerate(items[:5], 1):
                title = item.find('title').text if item.find('title') is not None else 'No Title'
                link = item.find('link').text if item.find('link') is not None else ''
                print(f" {i}. {title}\n    Link: {link}\n")
    except Exception as e:
        print(f"[!] Không thể kết nối Nyaa (hoặc bị chặn mạng): {e}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Nyaa Anime Downloader Helper")
    parser.add_argument("--name", type=str, default="Futsutsuka na Akujo", help="Tên Anime")
    parser.add_argument("--ep", type=str, default="01", help="Số tập")
    args = parser.parse_args()
    
    search_nyaa(args.name, args.ep)
