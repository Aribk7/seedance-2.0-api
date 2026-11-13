#!/usr/bin/env bash
# Send a Seedance request file, wait for the clip and save it.
# Usage: ./examples/curl.sh requests/seedance-2.0-text-to-video.json [out.mp4]
# Needs curl and jq, and REVANA_API_KEY in the environment.
set -euo pipefail

API=https://api.revana.si/v1
BODY=${1:?usage: curl.sh request.json [out.mp4]}
OUT=${2:-out.mp4}
AUTH="Authorization: Bearer ${REVANA_API_KEY:?set REVANA_API_KEY first}"

# One Idempotency-Key per job, made once. If the POST times out or answers 429 or 5xx, send it again
# with the same key: you get the same job back and are never charged twice.
KEY=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)

job=$(curl -sS --fail-with-body --retry 4 --retry-all-errors "$API/generations" \
  -H "$AUTH" -H "Content-Type: application/json" -H "Idempotency-Key: $KEY" \
  --data @"$BODY")
id=$(jq -r .id <<<"$job")
echo "submitted $id"

while :; do
  status=$(jq -r .status <<<"$job")
  case $status in
    succeeded) break ;;
    queued|running) sleep 5; job=$(curl -sS --fail-with-body --retry 4 "$API/generations/$id" -H "$AUTH") ;;
    *) echo "$status, not charged: $(jq -c .error <<<"$job")" >&2; exit 1 ;;
  esac
done

# /content answers with a short-lived signed link to the MP4. curl does not send the key on to it.
curl -sSL --fail "$API/generations/$id/content" -H "$AUTH" -o "$OUT"
echo "saved $OUT, cost \$$(jq -r .cost_usd <<<"$job")"
