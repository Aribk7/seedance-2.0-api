# Seedance 2.0 API examples: Python, Node.js and cURL (Seedance 2.5 too)

Working code for ByteDance's Seedance 2.0 and Seedance 2.5 video models over one REST API: send a request,
poll it, save the MP4. Every request shape the models take is a JSON file in [`requests/`](requests).

The examples call [Revana](https://revana.si), a US API for Seedance and other video, image and music models.
Every field, limit and price is on the [Seedance 2.0 API](https://revana.si/models/seedance-2.0) and
[Seedance 2.5 API](https://revana.si/models/seedance-2.5) pages. To see the model before you write code, try
[Seedance 2.0 free](https://revana.si/try/seedance-2-0) in your browser: your first clip is free.

## Quick start

1. Make a key: sign up at [revana.si](https://revana.si), open **API keys** in the dashboard and press **Create key**.
2. Put it in your shell: `export REVANA_API_KEY="sr_live_..."`
3. Send a request file with whichever language you use:

```bash
./examples/curl.sh requests/seedance-2.0-fast-480p.json             # needs curl and jq
python examples/generate.py requests/seedance-2.0-fast-480p.json    # pip install requests
node examples/generate.mjs requests/seedance-2.0-fast-480p.json     # Node 18 or later
```

`seedance-2.0-fast-480p.json` is the cheapest clip (4 seconds at 480p), so start with it.

Each script does the same four steps:

1. `POST /v1/generations` with the request file and an `Idempotency-Key`. It answers `202` with a generation id.
2. `GET /v1/generations/{id}` every 5 seconds until `status` is `succeeded` or `failed`.
3. `GET /v1/generations/{id}/content` to download the clip. It redirects to a short-lived signed link.
4. Print what the clip cost (`cost_usd`).

## Request files

Swap the `example.com` links for your own public `https://` pictures or clips before you send them.

| file | what it makes |
|---|---|
| [`seedance-2.0-fast-480p.json`](requests/seedance-2.0-fast-480p.json) | Seedance 2.0 Fast from a prompt: 4 s at 480p with sound |
| [`seedance-2.0-text-to-video.json`](requests/seedance-2.0-text-to-video.json) | Seedance 2.0 from a prompt: two shots, 5 s at 720p with sound |
| [`seedance-2.0-image-to-video.json`](requests/seedance-2.0-image-to-video.json) | `image_url` is the exact first frame, 1080p |
| [`seedance-2.0-first-last-frame.json`](requests/seedance-2.0-first-last-frame.json) | `image_url` and `end_image_url`: the clip moves from one to the other |
| [`seedance-2.0-reference-images.json`](requests/seedance-2.0-reference-images.json) | `image_urls`: a person, a place and a product in one vertical clip |
| [`seedance-2.5-30-second-clip.json`](requests/seedance-2.5-30-second-clip.json) | Seedance 2.5: one 30 s vertical ad in four shots at 1080p, from two reference pictures |
| [`seedance-2.5-video-edit.json`](requests/seedance-2.5-video-edit.json) | Seedance 2.5 `"task": "video_edit"`: change a clip you already have |

## Options

| field | Seedance 2.0 | Seedance 2.5 |
|---|---|---|
| `model` | `seedance-2.0`, or `seedance-2.0-fast` (480p and 720p) | `seedance-2.5` |
| `input.prompt` | what happens, shot by shot, plus the sound | same |
| `input.resolution` | `480p`, `720p`, `1080p`, `4K` | `480p`, `720p`, `1080p` |
| `input.duration` | 4 to 15 seconds | 4 to 30 seconds |
| `input.aspect_ratio` | `16:9`, `9:16`, `1:1`, `4:3`, `3:4`, `21:9`, `adaptive` | same |
| `input.audio` | `true` makes sound with the picture | same |
| `input.image_url`, `input.end_image_url` | first frame, last frame | same |
| `input.image_urls` | up to 9 reference pictures | up to 30 |
| `input.video_url` with `"task": "video_edit"` | not available | edit a clip |

## Good to know

- **Retries.** Make one `Idempotency-Key` per job and send it again after a timeout, a `429` or a `5xx`: you get the
  same job back and are never charged twice. The scripts do this for you.
- **Failed jobs are free.** To try a failed job again, send it with a new key: the old key answers with the failure.
- **Prices** change, so they are not copied here. Each model page has the per-second price for every resolution
  and a calculator: [Seedance 2.0](https://revana.si/models/seedance-2.0),
  [Seedance 2.0 Fast](https://revana.si/models/seedance-2.0-fast), [Seedance 2.5](https://revana.si/models/seedance-2.5).
- **Full walkthroughs:** the [Seedance 2.0 API tutorial](https://revana.si/blog/seedance-2-0-api) and the
  [Seedance 2.5 API tutorial](https://revana.si/blog/seedance-2-5-api).
- **SDKs:** [revana-js](https://github.com/Aribk7/revana-js) and [revana-python](https://github.com/Aribk7/revana-python)
  wrap the same calls.

## License

MIT
