import { Octokit } from "@octokit/rest";

const PEERY_API_URL = process.env.PEERY_API_URL || "http://localhost:8788";

const SEED_SOURCES = {
  mcpRegistry: "https://registry.modelcontextprotocol.io/v0/servers",
  awesomeLists: [
    "mattpocock/skills",
    "VoltAgent/awesome-agent-skills",
    "travisvn/awesome-claude-skills",
    "rohitg00/awesome-claude-code-toolkit",
  ],
};

async function fetchMcpRegistryServers(limit = 50): Promise<string[]> {
  const res = await fetch(`${SEED_SOURCES.mcpRegistry}?limit=${limit}`);
  if (!res.ok) throw new Error(`MCP Registry error: ${res.status}`);
  const data = await res.json();
  return data.servers
    ?.map((s: { repository?: string }) => s.repository)
    .filter(Boolean)
    .slice(0, limit) || [];
}

async function fetchAwesomeListUrls(repo: string): Promise<string[]> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [owner, name] = repo.split("/");
  const { data } = await octokit.repos.getContent({ owner, repo: name, path: "README.md" });
  if (!("content" in data)) return [];
  const content = Buffer.from(data.content, "base64").toString();
  const githubUrls = content.match(/https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+/g) || [];
  return [...new Set(githubUrls)].slice(0, 30);
}

const SEED_SECRET = process.env.PEERY_CALLBACK_SECRET || "";

async function submitToPerey(gitUrl: string): Promise<void> {
  const res = await fetch(`${PEERY_API_URL}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Peery-Seed": SEED_SECRET,
    },
    body: JSON.stringify({ git_url: gitUrl }),
  });
  if (res.ok) {
    console.log(`  ✓ Submitted: ${gitUrl}`);
  } else {
    console.log(`  ✗ Failed (${res.status}): ${gitUrl}`);
  }
}

async function main() {
  console.log("=== Peery Seed: Top Skills ===\n");

  console.log("[1/2] Fetching MCP Registry servers...");
  const mcpUrls = await fetchMcpRegistryServers(50);
  console.log(`  Found ${mcpUrls.length} servers`);

  console.log("[2/2] Fetching awesome-lists...");
  const awesomeUrls: string[] = [];
  for (const repo of SEED_SOURCES.awesomeLists) {
    try {
      const urls = await fetchAwesomeListUrls(repo);
      awesomeUrls.push(...urls);
      console.log(`  ${repo}: ${urls.length} URLs`);
    } catch (e) {
      console.log(`  ${repo}: error - ${(e as Error).message}`);
    }
  }

  const allUrls = [...new Set([...mcpUrls, ...awesomeUrls])];
  console.log(`\nTotal unique URLs: ${allUrls.length}`);
  console.log("\nSubmitting to Peery API...\n");

  for (const url of allUrls) {
    await submitToPerey(url);
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\nDone. ${allUrls.length} skills submitted for scanning.`);
}

main().catch(console.error);
