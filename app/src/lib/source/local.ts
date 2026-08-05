import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { CONTENT_RE } from "../content-regex";

export interface ContentSource {
  name: string;
  /** List every content markdown path (category/technology/typeDir/slug.md). */
  listPaths(): Promise<string[]>;
  /** Fetch a single markdown file by content path. */
  fetchFile(contentPath: string): Promise<string>;
  /** Optional last-sync metadata (tolerated failure). */
  meta?(): Promise<{ pushedAt?: string } | null>;
}

/**
 * Reads directly from the checked-out repository on disk (website/../).
 * Used for local development and as the offline fallback content provider.
 */
export class LocalSource implements ContentSource {
  readonly name = "local";

  private readonly root: string;

  constructor(root = path.resolve(process.cwd(), "..")) {
    this.root = root;
  }

  private contentRoot() {
    return path.join(this.root, "content");
  }

  /** The actual content directories at the repo root (not nested under /content). */
  private static CONTENT_DIRS = ["backend", "frontend", "mobile", "devops", "database"];

  async listPaths(): Promise<string[]> {
    const out: string[] = [];
    for (const dir of LocalSource.CONTENT_DIRS) {
      await this.walk(path.join(this.root, dir), dir, out);
    }
    return out.sort();
  }

  private async walk(dir: string, prefix: string, out: string[]) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walk(full, `${prefix}/${entry.name}`, out);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const rel = `${prefix}/${entry.name}`;
        if (CONTENT_RE.test(rel)) out.push(rel);
      }
    }
  }

  async fetchFile(contentPath: string): Promise<string> {
    // Content lives at repo root, e.g. frontend/nextjs/tutorials/x.md
    const file = path.join(this.root, contentPath);
    return fs.readFile(file, "utf8");
  }

  async meta() {
    return null;
  }
}

/** Reads the checked-in fallback tree snapshot (never fails). */
export class SnapshotSource implements ContentSource {
  readonly name = "snapshot";

  private readonly treePath: string;

  constructor(treePath = path.resolve(process.cwd(), "src/lib/fallback-tree.json")) {
    this.treePath = treePath;
  }

  async listPaths(): Promise<string[]> {
    const raw = await fs.readFile(this.treePath, "utf8");
    const data = JSON.parse(raw) as string[];
    return data.filter((p) => CONTENT_RE.test(p));
  }

  async fetchFile(contentPath: string): Promise<string> {
    throw new Error(
      `SnapshotSource cannot fetch file content: ${contentPath} (network unavailable)`
    );
  }
}
