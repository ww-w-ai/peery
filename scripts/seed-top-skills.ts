import { Octokit } from "@octokit/rest";

const PEERY_API_URL = process.env.PEERY_API_URL || "http://localhost:8788";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const TARGET_COUNT = 200;
const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 120_000; // 2 min between batches (wait for Actions to complete)
const SUBMIT_DELAY_MS = 3000; // 3s between submissions

const AWESOME_LISTS = [
  "mattpocock/skills",
  "VoltAgent/awesome-agent-skills",
  "travisvn/awesome-claude-skills",
  "rohitg00/awesome-claude-code-toolkit",
  "punkpeye/awesome-mcp-servers",
  "appcypher/awesome-mcp-servers",
  "modelcontextprotocol/servers",
  "PatrickJS/awesome-cursorrules",
];

const INVALID_URL_PATTERNS = [
  /github\.com\/sponsors\//,
  /github\.com\/user-attachments\//,
  /github\.com\/orgs\//,
  /github\.com\/settings\//,
  /github\.com\/features\//,
  /github\.com\/marketplace$/,
  /github\.com\/topics\//,
  /github\.com\/[^/]+$/,  // just username, no repo
  /github\.com\/[^/]+\/(issues|pulls|discussions|actions|wiki|releases|tags|stargazers)/,
];

function isValidRepoUrl(url: string): boolean {
  if (!url.startsWith("https://github.com/")) return false;
  for (const pattern of INVALID_URL_PATTERNS) {
    if (pattern.test(url)) return false;
  }
  const parts = url.replace("https://github.com/", "").split("/");
  return parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0;
}

function normalizeUrl(url: string): string {
  return url.replace(/\.git$/, "").replace(/\/$/, "").split("#")[0].split("?")[0];
}

async function fetchMcpRegistryServers(limit = 100): Promise<string[]> {
  const urls: string[] = [];
  try {
    let cursor: string | undefined;
    while (urls.length < limit) {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`https://registry.modelcontextprotocol.io/v0/servers?${params}`);
      if (!res.ok) { console.log(`  MCP Registry HTTP ${res.status}`); break; }
      const data = await res.json() as Record<string, unknown>;

      // Try different response shapes
      const servers = (data.servers || data.items || data.results || data) as Record<string, unknown>[];
      if (!Array.isArray(servers) || servers.length === 0) {
        // Maybe it's a dict of server entries
        if (typeof data === "object" && !Array.isArray(data)) {
          for (const [, val] of Object.entries(data)) {
            if (typeof val === "object" && val && "repository" in (val as Record<string, unknown>)) {
              const repo = (val as Record<string, unknown>).repository as string;
              if (repo) urls.push(repo);
            }
          }
        }
        break;
      }

      for (const s of servers) {
        const repo = (s.repository || s.repo || s.url || s.github || s.source_url) as string | undefined;
        if (repo && repo.includes("github.com")) urls.push(repo);
      }

      cursor = (data.next_cursor || data.cursor || data.nextCursor) as string | undefined;
      if (!cursor) break;
    }
  } catch (e) {
    console.log(`  MCP Registry error: ${(e as Error).message}`);
  }
  return urls.slice(0, limit);
}

async function fetchAwesomeListUrls(repo: string, maxUrls = 100): Promise<string[]> {
  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  const [owner, name] = repo.split("/");
  const urls: string[] = [];

  try {
    const { data } = await octokit.repos.getContent({ owner, repo: name, path: "README.md" });
    if ("content" in data) {
      const content = Buffer.from(data.content, "base64").toString();
      const matches = content.match(/https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/g) || [];
      urls.push(...matches);
    }
  } catch {
    // README might not exist, try other files
  }

  // Also check for a list in other common files
  for (const path of ["servers.json", "data/servers.json", "src/data.json"]) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo: name, path });
      if ("content" in data) {
        const content = Buffer.from(data.content, "base64").toString();
        const matches = content.match(/https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/g) || [];
        urls.push(...matches);
      }
    } catch {
      // File doesn't exist, skip
    }
  }

  return [...new Set(urls)].slice(0, maxUrls);
}

async function getAlreadyScanned(): Promise<Set<string>> {
  try {
    const res = await fetch(`${PEERY_API_URL}/api/skills?limit=500`);
    if (!res.ok) return new Set();
    const data = await res.json() as { data: { git_url?: string }[] };
    return new Set(data.data?.map(s => s.git_url).filter(Boolean) as string[]);
  } catch {
    return new Set();
  }
}

async function submitToPerey(gitUrl: string): Promise<boolean> {
  const res = await fetch(`${PEERY_API_URL}/api/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ git_url: gitUrl }),
  });
  if (res.ok) {
    console.log(`  ✓ Submitted: ${gitUrl}`);
    return true;
  } else {
    console.log(`  ✗ Failed (${res.status}): ${gitUrl}`);
    return false;
  }
}

async function main() {
  console.log("=== Peery Seed: Top Skills ===\n");
  console.log(`Target: ${TARGET_COUNT} skills\n`);

  // Step 1: Collect URLs from all sources
  console.log("[1/4] Fetching MCP Registry servers...");
  const mcpUrls = await fetchMcpRegistryServers(100);
  console.log(`  Found ${mcpUrls.length} servers`);

  console.log("[2/4] Fetching awesome-lists...");
  const awesomeUrls: string[] = [];
  for (const repo of AWESOME_LISTS) {
    try {
      const urls = await fetchAwesomeListUrls(repo, 100);
      awesomeUrls.push(...urls);
      console.log(`  ${repo}: ${urls.length} URLs`);
    } catch (e) {
      console.log(`  ${repo}: error - ${(e as Error).message}`);
    }
  }

  // Step 2: Normalize, dedupe, filter
  console.log("\n[3/4] Processing URLs...");
  const allRaw = [...mcpUrls, ...awesomeUrls].map(normalizeUrl);
  const unique = [...new Set(allRaw)].filter(isValidRepoUrl);
  console.log(`  Raw: ${allRaw.length} → Unique: ${unique.length} (after dedup + filter)`);

  // Step 3: Skip already scanned
  const alreadyScanned = await getAlreadyScanned();
  console.log(`  Already scanned: ${alreadyScanned.size}`);
  const toScan = unique.filter(u => !alreadyScanned.has(u)).slice(0, TARGET_COUNT - alreadyScanned.size);
  console.log(`  To scan: ${toScan.length}\n`);

  if (toScan.length === 0) {
    console.log("Nothing new to scan. Done.");
    return;
  }

  // Step 4: Submit in batches
  console.log(`[4/4] Submitting in batches of ${BATCH_SIZE}...\n`);
  let submitted = 0;
  let failed = 0;

  for (let i = 0; i < toScan.length; i += BATCH_SIZE) {
    const batch = toScan.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toScan.length / BATCH_SIZE);
    console.log(`--- Batch ${batchNum}/${totalBatches} (${batch.length} items) ---`);

    for (const url of batch) {
      const ok = await submitToPerey(url);
      if (ok) submitted++;
      else failed++;
      await new Promise(r => setTimeout(r, SUBMIT_DELAY_MS));
    }

    // Wait between batches for Actions to finish
    if (i + BATCH_SIZE < toScan.length) {
      console.log(`\n  Waiting ${BATCH_DELAY_MS / 1000}s for Actions to process...\n`);
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`\n=== Seed Complete ===`);
  console.log(`Submitted: ${submitted}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total in DB (approx): ${alreadyScanned.size + submitted}`);
}

main().catch(console.error);
