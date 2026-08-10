import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../data/jobs.json", import.meta.url);
const data = JSON.parse(await readFile(file, "utf8"));
const results = [];

for (const job of data.jobs) {
  try {
    let response;
    try {
      response = await fetch(job.url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "user-agent": "Mozilla/5.0 CareerDesk-LinkChecker/1.0" } });
    } catch {
      response = await fetch(job.url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "accept": "text/html" } });
      await response.body?.cancel();
    }
    results.push({ id: job.id, ok: response.ok || [401, 403, 405, 412, 429, 510].includes(response.status), status: response.status, checkedAt: new Date().toISOString() });
  } catch (error) {
    results.push({ id: job.id, ok: false, status: error.cause?.code || error.name, checkedAt: new Date().toISOString() });
  }
}

data.meta.updatedAt = new Date().toISOString();
data.meta.linkHealth = Object.fromEntries(results.map(result => [result.id, result]));
await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Checked ${results.length} official links; ${results.filter(x => x.ok).length} reachable.`);
if (results.some(x => !x.ok)) console.log("Review:", results.filter(x => !x.ok).map(x => `${x.id}(${x.status})`).join(", "));
