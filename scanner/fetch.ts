/**
 * scanner/fetch.ts — GitHub API raw content fetcher
 * Design Ref: §1.3 — Scanner Logic (fetch module)
 */

export interface FetchOptions {
  url: string;
  sha?: string;
  token?: string;
}

export interface RepoFile {
  path: string;
  content: string;
  size: number;
}

interface GitHubTreeItem {
  path: string;
  type: string;
  sha: string;
  size?: number;
}

interface GitHubTreeResponse {
  tree: GitHubTreeItem[];
  truncated: boolean;
}

/**
 * Parse GitHub URL into owner/repo/ref components
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string; ref?: string } | null {
  const patterns = [
    /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:#(.+))?$/,
    /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\/tree\/(.+))?$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2], ref: match[3] || undefined };
    }
  }
  return null;
}

/**
 * Fetch all text files from a GitHub repository
 * Uses the Trees API for efficient batch fetching
 */
export async function fetchRepoFiles(options: FetchOptions): Promise<RepoFile[]> {
  const parsed = parseGitHubUrl(options.url);
  if (!parsed) {
    throw new Error(`Invalid GitHub URL: ${options.url}`);
  }

  const { owner, repo } = parsed;
  const ref = options.sha || parsed.ref || "main";

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Peery-Scanner/0.1",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  // Get recursive tree
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  const treeRes = await fetch(treeUrl, { headers });

  if (!treeRes.ok) {
    throw new Error(`GitHub API error (${treeRes.status}): ${await treeRes.text()}`);
  }

  const tree: GitHubTreeResponse = await treeRes.json();

  // Filter to text files that are relevant for scanning
  const SCANNABLE_EXTENSIONS = [
    ".md", ".txt", ".yml", ".yaml", ".json", ".toml",
    ".ts", ".js", ".mjs", ".cjs", ".tsx", ".jsx",
    ".py", ".rb", ".go", ".rs", ".sh", ".bash",
    ".zsh", ".fish", ".ps1", ".bat", ".cmd",
  ];

  const MAX_FILE_SIZE = 100_000; // 100KB per file
  const MAX_FILES = 50; // Limit to prevent abuse

  const relevantFiles = tree.tree
    .filter((item) => {
      if (item.type !== "blob") return false;
      if (item.size && item.size > MAX_FILE_SIZE) return false;
      const ext = "." + item.path.split(".").pop()?.toLowerCase();
      return SCANNABLE_EXTENSIONS.includes(ext);
    })
    .slice(0, MAX_FILES);

  // Fetch file contents in parallel (batches of 10)
  const files: RepoFile[] = [];
  const batchSize = 10;

  for (let i = 0; i < relevantFiles.length; i += batchSize) {
    const batch = relevantFiles.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}?ref=${ref}`;
        const res = await fetch(contentUrl, { headers });
        if (!res.ok) return null;

        const data: { content?: string; encoding?: string; size: number } = await res.json();
        if (!data.content || data.encoding !== "base64") return null;

        const content = atob(data.content.replace(/\n/g, ""));
        return { path: item.path, content, size: data.size };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        files.push(result.value);
      }
    }
  }

  return files;
}
