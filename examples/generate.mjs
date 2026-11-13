// Send a Seedance request file, wait for the clip and save it.
// Usage: node examples/generate.mjs requests/seedance-2.0-text-to-video.json [out.mp4]
// Needs Node 18 or later and REVANA_API_KEY in the environment.
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const API = "https://api.revana.si/v1";
const headers = { Authorization: `Bearer ${process.env.REVANA_API_KEY}` };
const [path, out = "out.mp4"] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One Idempotency-Key per job, made once. Every retry sends the same key, so a timeout or a 5xx
// can never start a second job or charge twice.
async function submit(body) {
  const key = randomUUID();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${API}/generations`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json", "Idempotency-Key": key },
        body,
        signal: AbortSignal.timeout(60_000),
      });
      if (![429, 500, 502, 503, 504].includes(res.status)) {
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        return res.json();
      }
    } catch (err) {
      if (!(err.name === "TimeoutError" || err.cause)) throw err; // retry timeouts and network errors only
    }
    await sleep(2 ** attempt * 1000);
  }
  throw new Error("could not submit after 5 tries");
}

let job = await submit(await readFile(path, "utf8"));
console.log("submitted", job.id);

while (job.status === "queued" || job.status === "running") {
  await sleep(5000);
  job = await (await fetch(`${API}/generations/${job.id}`, { headers })).json();
}
if (job.status !== "succeeded") {
  // A failed job costs nothing. To try again, submit with a new key: this one answers with the failure.
  console.error(`${job.status}, not charged:`, job.error);
  process.exit(1);
}

// /content answers with a short-lived signed link to the MP4; fetch that link without the key.
const res = await fetch(`${API}/generations/${job.id}/content`, { headers, redirect: "manual" });
const link = res.headers.get("location");
const file = link ? await fetch(link) : res;
if (!file.ok) throw new Error(`download ${file.status}`);
await writeFile(out, Buffer.from(await file.arrayBuffer()));
console.log(`saved ${out}, cost $${job.cost_usd}`);
