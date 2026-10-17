const API = "https://api.github.com";

function config() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH = "main" } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || GITHUB_TOKEN.includes("REPLACE_ME")) {
    const err = new Error("GitHub storage is not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.");
    err.status = 503;
    throw err;
  }
  return { token: GITHUB_TOKEN, owner: GITHUB_OWNER, repo: GITHUB_REPO, branch: GITHUB_BRANCH };
}

async function gh(path, options = {}, retries = 2) {
  const c = config();
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${c.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) return body;
    if (response.status >= 500 && attempt < retries) {
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
    const err = new Error(body.message || `GitHub API error ${response.status}`);
    err.status = response.status === 404 ? 404 : (response.status === 409 || response.status === 422 ? 409 : 502);
    throw err;
  }
}

function repoPath(path) {
  const c = config();
  return `/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function readJson(path) {
  const c = config();
  try {
    const item = await gh(`${repoPath(path)}?ref=${encodeURIComponent(c.branch)}`);
    const decoded = Buffer.from(item.content || "", "base64").toString("utf8");
    return { data: JSON.parse(decoded), sha: item.sha };
  } catch (e) {
    if (e.status === 404) return { data: null, sha: null };
    throw e;
  }
}

async function writeFile(path, content, message, existingSha, autoRetryConflict = false) {
  const c = config();
  const attemptPut = async (sha) => {
    const body = {
      message,
      content: Buffer.isBuffer(content) ? content.toString("base64") : Buffer.from(content).toString("base64"),
      branch: c.branch
    };
    if (sha) body.sha = sha;
    return gh(repoPath(path), { method: "PUT", body: JSON.stringify(body) });
  };

  try {
    return await attemptPut(existingSha);
  } catch (e) {
    if (e.status === 409 && autoRetryConflict) {
      const latest = await readJson(path);
      return await attemptPut(latest.sha);
    }
    throw e;
  }
}

async function readBinary(path) {
  const c = config();
  const item = await gh(`${repoPath(path)}?ref=${encodeURIComponent(c.branch)}`);
  return { item, bytes: Buffer.from(item.content || "", "base64") };
}

module.exports = { readJson, writeFile, readBinary, config };
