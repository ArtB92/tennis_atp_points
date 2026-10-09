#!/usr/bin/env bash
# Temporary: check which ranking sources are reachable from CI.
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"
for u in \
  "https://www.atptour.com/en/rankings/singles?rankRange=1-200" \
  "https://www.atptour.com/en/-/www/rank/sglroll/250?v=1" \
  "https://app.atptour.com/api/gateway/rankings.ranksglrollrange?fromRank=1&toRank=200" \
  "https://sports.core.api.espn.com/v2/sports/tennis/leagues/atp/rankings" \
  "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/rankings" \
  "https://site.web.api.espn.com/apis/site/v2/sports/tennis/atp/rankings" \
  "https://www.espn.com/tennis/rankings" \
  "https://live-tennis.eu/en/atp-live-ranking" \
  "https://www.tennisexplorer.com/ranking/atp-men/" \
  "https://stats.tennismylife.org/data/atp_rankings.csv" \
  "https://stats.tennismylife.org/rankings" \
  ; do
  code=$(curl -sS -L -A "$UA" -o /tmp/probe.out -w "%{http_code} %{size_download} %{content_type}" --max-time 25 "$u" 2>&1)
  echo "=== $u -> $code"
  head -c 600 /tmp/probe.out | tr '\n' ' ' | sed 's/  */ /g'; echo
  grep -o -i -E '(sinner|zverev)[^<]{0,120}' /tmp/probe.out | head -3
done
