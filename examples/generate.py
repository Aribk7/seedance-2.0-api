"""Send a Seedance request file, wait for the clip and save it.

Usage: python examples/generate.py requests/seedance-2.0-text-to-video.json [out.mp4]
Needs: pip install requests, and REVANA_API_KEY in the environment.
"""
import json
import os
import sys
import time
import uuid

import requests

API = "https://api.revana.si/v1"
HEADERS = {"Authorization": f"Bearer {os.environ['REVANA_API_KEY']}"}
RETRY = {429, 500, 502, 503, 504}


def submit(body):
    # One Idempotency-Key per job, made once. Every retry below sends the same key, so a timeout or a 5xx
    # can never start a second job or charge twice.
    key = str(uuid.uuid4())
    for attempt in range(5):
        try:
            r = requests.post(f"{API}/generations", json=body, timeout=60,
                              headers={**HEADERS, "Idempotency-Key": key})
            if r.status_code not in RETRY:
                r.raise_for_status()
                return r.json()
        except (requests.ConnectionError, requests.Timeout):
            pass
        time.sleep(2 ** attempt)
    sys.exit("could not submit after 5 tries")


def main(path, out="out.mp4"):
    with open(path) as f:
        job = submit(json.load(f))
    print("submitted", job["id"])

    while job["status"] in ("queued", "running"):
        time.sleep(5)
        job = requests.get(f"{API}/generations/{job['id']}", headers=HEADERS, timeout=60).json()

    if job["status"] != "succeeded":
        # A failed job costs nothing. To try again, call submit() for a new key: this one answers with the failure.
        sys.exit(f"{job['status']}, not charged: {job.get('error')}")

    # /content redirects to a short-lived signed link; requests drops the key when it follows it.
    with requests.get(f"{API}/generations/{job['id']}/content", headers=HEADERS, stream=True, timeout=300) as v:
        v.raise_for_status()
        with open(out, "wb") as f:
            for chunk in v.iter_content(1 << 20):
                f.write(chunk)
    print(f"saved {out}, cost ${job['cost_usd']}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
