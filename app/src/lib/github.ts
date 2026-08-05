import "server-only";

import { CONTENT_RE } from "./content-regex";
import type { ContentSource } from "./source/local";
import { LocalSource, SnapshotSource } from "./source/local";

export const GITHUB_REPO = process.env.GITHUB_REPO ?? "Reinvy/ReinvyLibrary";
export const GITHUB_BRANCH = process.env.GITHUB_BRANCH ?? "main";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
export const ISR_REVALIDATE = Number(process.env.ISR_REVALIDATE ?? 300);
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const USE_LOCAL_SOURCE = process.env.USE_LOCAL_SOURCE === "true";

const GITHUB_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

/**
 * Resolves the active content source:
 * - USE_LOCAL_SOURCE=true → local repo checkout (dev)
 * - otherwise → GitHub (tree + raw CDN) with a composite offline fallback:
 *   local checkout → snapshot tree (list-only)
 */
export function getContentSource(): ContentSource {
  if (USE_LOCAL_SOURCE) {
    return new LocalSource();
  }
  return new GitHubSource();
}

/**
 * Fallback chain for when GitHub is unreachable:
 * 1. local repo checkout (website/../) — full content
 * 2. snapshot tree — list-only (content throws)
 */
class CompositeFallback implements ContentSource {
  readonly name = "fallback";

  private readonly local = new LocalSource();
  private readonly snapshot = new SnapshotSource();

  async listPaths(): Promise<string[]> {
    try {
      const local = await this.local.listPaths();
      if (local.length > 0) return local;
    } catch {
      /* ignore */
    }
    return this.snapshot.listPaths();
  }

  async fetchFile(contentPath: string): Promise<string> {
    try {
      return await this.local.fetchFile(contentPath);
    } catch {
      return this.snapshot.fetchFile(contentPath);
    }
  }

  async meta() {
    return null;
  }
}

/** GitHub tree + raw content source with fallback on total failure. */
class GitHubSource implements ContentSource {
  readonly name = "github";

  private readonly fallback = new CompositeFallback();

  async listPaths(): Promise<string[]> {
    try {
      const tree = await this.fetchTree();
      if (tree.length > 0) return tree;
    } catch (err) {
      console.warn("[content] GitHub tree fetch failed, using fallback:", err);
    }
    return this.fallback.listPaths();
  }

  async fetchFile(contentPath: string): Promise<string> {
    if (!CONTENT_RE.test(contentPath)) {
      throw new Error(`Refusing to fetch non-content path: ${contentPath}`);
    }
    const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${contentPath}`;
    const res = await fetch(url, { next: { revalidate: ISR_REVALIDATE } });
    if (res.ok) return res.text();
    if (res.status === 404) {
      // File doesn't exist on the synced branch — treat as missing (notFound).
      throw new Error(`Raw fetch 404 for ${contentPath}`);
    }
    // Network/5xx/rate-limit: try local checkout, then snapshot.
    return this.fallback.fetchFile(contentPath);
  }

  async meta(): Promise<{ pushedAt?: string } | null> {
    try {
      const url = `https://api.github.com/repos/${GITHUB_REPO}`;
      const res = await fetch(url, {
        headers: GITHUB_HEADERS,
        next: { revalidate: ISR_REVALIDATE },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { pushed_at?: string };
      return data.pushed_at ? { pushedAt: data.pushed_at } : null;
    } catch {
      return null;
    }
  }

  private async fetchTree(): Promise<string[]> {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;
    const res = await fetch(url, {
      headers: GITHUB_HEADERS,
      next: { revalidate: ISR_REVALIDATE },
    });
    if (!res.ok) {
      throw new Error(`GitHub tree API ${res.status}`);
    }
    const data = (await res.json()) as { tree?: Array<{ path?: string; type?: string }> };
    return (data.tree ?? [])
      .filter((e) => e.type === "blob" && e.path && CONTENT_RE.test(e.path))
      .map((e) => e.path as string)
      .sort();
  }
}

export { SnapshotSource, CompositeFallback };
export type { ContentSource };
