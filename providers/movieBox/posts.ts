import { Post, ProviderContext } from "../types";

function extractSubjects(items: any[]): any[] {
  const subjects: any[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (item?.type === "BANNER" && item?.banner?.banners) {
      for (const b of item.banner.banners) {
        const s = b?.subject;
        if (s?.subjectId && !seen.has(s.subjectId)) {
          seen.add(s.subjectId);
          subjects.push(s);
        }
      }
    }
    if (Array.isArray(item?.subjects)) {
      for (const s of item.subjects) {
        if (s?.subjectId && !seen.has(s.subjectId)) {
          seen.add(s.subjectId);
          subjects.push(s);
        }
      }
    }
  }
  return subjects;
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
  const posts: Post[] = [];
  const { getBaseUrl } = providerContext;
  if (page > 1) {
    return posts;
  }

  const url = `/wefeed-mobile-bff/tab-operating?page=3&tabId=0&version=2fe0d7c224603ff7b0df294b46d3b84b`;

  const proxyUrl = `https://worker.zendax.me/api/moviebox?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl, { signal });

  const data = await response.json();
  const items = data?.data?.items || [];

  const subjects = extractSubjects(items);
  for (const item of subjects) {
    if (!item?.subjectId || !item?.title) continue;
    posts.push({
      image: item?.cover?.url || "",
      title: item?.title?.replace(/\s*\[.*?\]\s*$/, ""),
      link: `/wefeed-mobile-bff/subject-api/get?subjectId=${item?.subjectId}`,
    });
  }
  return posts;
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
  const { getBaseUrl, axios, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("movieBox");
  const url = `${baseUrl}/wefeed-mobile-bff/subject-api/search/v2`;
  if (page > 1) {
    return [];
  }

  // this is just a proxy please host your own if you want to use this code:- https://github.com/himanshu8443/Cf-Workers/blob/main/src/dob-worker/index.js
  const response = await fetch("https://dob-worker.8man.workers.dev", {
    signal: signal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: url,
      method: "POST",
      body: { page: 1, perPage: 20, keyword: searchQuery, tabId: "Movie" },
    }),
  });

  const data = await response.json();
  const list = data?.data?.results?.[0]?.subjects || [];
  const posts: Post[] = list.map((item: any) => ({
    image: item?.cover?.url,
    title: item?.title,
    link: `${baseUrl}/wefeed-mobile-bff/subject-api/get?subjectId=${item?.subjectId}`,
  }));
  return posts;
};
