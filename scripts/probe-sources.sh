#!/usr/bin/env bash
# Temporary: inspect ESPN's ATP rankings payload from CI.
curl -sS --max-time 30 -o /tmp/espn.json "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/rankings"
jq -c 'keys' /tmp/espn.json
jq -c '.rankings | length' /tmp/espn.json
jq -c '.rankings[] | {id, name, type, date: (.date // .lastUpdated), n: (.ranks | length)}' /tmp/espn.json
jq -c '.rankings[0] | del(.ranks)' /tmp/espn.json | head -c 1500; echo
jq -c '.rankings[0].ranks[0]' /tmp/espn.json | head -c 2500; echo
jq -r '.rankings[0].ranks[] | [.current, .points, .athlete.displayName, (.athlete.id // ""), (.athlete.flag.alt // .athlete.citizenshipCountry // "")] | @tsv' /tmp/espn.json | head -12
jq -r '.rankings[0].ranks[] | [.current, .points, .athlete.displayName] | @tsv' /tmp/espn.json | tail -3
