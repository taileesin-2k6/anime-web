#!/usr/bin/env bash
set -e

DIR="/home/taileesin123/Documents/anime-web"
cd "$DIR"

# Kill existing node and cloudflared if running on 3000
fuser -k 3000/tcp 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# Start Next.js dev server using node directly via setsid
setsid npx next dev -H 0.0.0.0 -p 3000 > /tmp/nextjs.log 2>&1 &

# Wait until port 3000 responds
for i in {1..20}; do
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ | grep -E "200|304|404"; then
    echo "Next.js server is ready on port 3000!"
    break
  fi
  sleep 0.5
done

# Start Cloudflare Tunnel using setsid
rm -f /tmp/cloudflared.log
setsid /home/taileesin123/.local/bin/cloudflared tunnel --url http://127.0.0.1:3000 --logfile /tmp/cloudflared.log > /dev/null 2>&1 &

# Wait for tunnel URL
for i in {1..20}; do
  URL=$(grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com" /tmp/cloudflared.log 2>/dev/null | tail -n 1 || true)
  if [ -n "$URL" ]; then
    echo "Cloudflare Tunnel URL: $URL"
    echo "$URL" > /tmp/cf_url.txt
    break
  fi
  sleep 0.5
done
