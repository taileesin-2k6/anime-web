#!/usr/bin/env python3
import time
import sys
import os
import libtorrent as lt

torrent_file = sys.argv[1] if len(sys.argv) > 1 else '/tmp/2137963.torrent'
save_path = sys.argv[2] if len(sys.argv) > 2 else '/tmp/dl_ep3'

os.makedirs(save_path, exist_ok=True)

settings = {
    'listen_interfaces': '0.0.0.0:6881',
    'enable_dht': True,
    'enable_lsd': True,
    'enable_upnp': True,
    'enable_natpmp': True,
}
ses = lt.session(settings)
ses.add_dht_router('router.bittorrent.com', 6881)
ses.add_dht_router('router.utorrent.com', 6881)
ses.add_dht_router('dht.transmissionbt.com', 6881)

info = lt.torrent_info(torrent_file)
h = ses.add_torrent({'ti': info, 'save_path': save_path})

print(f"[*] Bắt đầu tải torrent: {info.name()}")
print(f"[*] Lưu tại: {save_path}")

while not h.status().is_seeding:
    s = h.status()
    progress = s.progress * 100
    down_speed = s.download_rate / 1024
    peers = s.num_peers
    seeds = s.num_seeds
    print(f"Progress: {progress:.1f}% | Speed: {down_speed:.1f} KB/s | Peers: {peers} (Seeds: {seeds}) | State: {s.state}", flush=True)
    if progress >= 100.0 or s.is_finished:
        break
    time.sleep(3)

print("[+] Tải torrent hoàn tất 100%!")
