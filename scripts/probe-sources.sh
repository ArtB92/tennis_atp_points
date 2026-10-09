#!/usr/bin/env bash
# Temporary: compare ESPN's list with TennisExplorer's to check freshness.
curl -sS --max-time 30 "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/rankings" | jq -r '.rankings[0] | .update, (.ranks[:12][] | [.current, .points, .athlete.displayName] | @tsv)'
curl -sS --max-time 30 -A "Mozilla/5.0" "https://www.tennisexplorer.com/ranking/atp-men/" -o /tmp/te.html
grep -o -E '<option value="[0-9-]+"[^>]*selected[^>]*>[^<]*' /tmp/te.html | head -3
grep -o -E 'class="rank[^"]*">[0-9.]+|/player/[^/]+/">[^<]+|class="long-point">[0-9]+' /tmp/te.html | head -36 | paste - - - | head -12
