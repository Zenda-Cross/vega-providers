import { getBaseUrl } from "../getBaseUrl";
import { Post, ProviderContext } from "../types";
import { absoluteUrl, parseNuxtData, providerValue } from "./utils";

type SubjectPreview = {
  title?: string;
  coverUrl?: string;
  hasResource?: boolean;
};

function collectSubjectPreviews(value: unknown): Map<string, SubjectPreview> {
  const subjects = new Map<string, SubjectPreview>();
  const visited = new Set<object>();

  function visit(current: unknown): void {
    if (!current || typeof current !== "object" || visited.has(current)) return;
    visited.add(current);

    if ("detailPath" in current && typeof current.detailPath === "string") {
      const cover = "cover" in current ? current.cover : undefined;
      subjects.set(current.detailPath, {
        title:
          "title" in current && typeof current.title === "string"
            ? current.title
            : undefined,
        coverUrl:
          cover &&
          typeof cover === "object" &&
          "url" in cover &&
          typeof cover.url === "string"
            ? cover.url
            : undefined,
        hasResource:
          "hasResource" in current && typeof current.hasResource === "boolean"
            ? current.hasResource
            : undefined,
      });
    }
    Object.values(current).forEach(visit);
  }

  visit(value);
  return subjects;
}

async function fetchPosts(
  path: string,
  signal: AbortSignal,
  providerContext: ProviderContext,
): Promise<Post[]> {
  const baseUrl = await getBaseUrl(providerValue);
  const response = await fetch(absoluteUrl(baseUrl, path), { signal });
  if (!response.ok) throw new Error(`MovieBox Web returned ${response.status}`);

  const html = await response.text();
  const $ = providerContext.cheerio.load(html);
  const subjects = collectSubjectPreviews(
    parseNuxtData(html, providerContext.cheerio),
  );
  const posts: Post[] = [];
  const seen = new Set<string>();

  $('a[href^="/moviesDetail/"]').each((_, element) => {
    const card = $(element);
    const href = card.attr("href") || "";
    if (!href.startsWith("/moviesDetail/") || seen.has(href)) return;
    const subject = subjects.get(href.replace("/moviesDetail/", ""));
    if (path === "/upcoming" && subject?.hasResource !== true) return;

    const image = card.find("img").first();
    const title =
      subject?.title?.trim() ||
      card.find("h2, h3").first().attr("title")?.trim() ||
      image.attr("alt")?.trim() ||
      card.find("h2, h3").first().text().trim() ||
      card
        .attr("title")
        ?.replace(/^go to /i, "")
        .replace(/ detail page$/i, "")
        .trim() ||
      "";
    if (!title) return;

    seen.add(href);
    posts.push({
      title,
      link: href,
      image:
        image.attr("data-src") || subject?.coverUrl || image.attr("src") || "",
    });
  });
  return posts;
}

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (page > 1) return [];
  return fetchPosts(filter || "/", signal, providerContext);
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (page > 1 || !searchQuery.trim()) return [];
  return fetchPosts(
    `/newWeb/searchResult?keyword=${encodeURIComponent(searchQuery.trim())}`,
    signal,
    providerContext,
  );
};
