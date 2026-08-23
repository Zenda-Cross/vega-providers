import { throwProviderError } from "../providerErrors";

const GOFILE_API = "https://api.gofile.io";
const GOFILE_LANGUAGE = "en-US";
const GOFILE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/131.0.0.0 Safari/537.36";

type GofileContent = {
  id?: string;
  type?: string;
  link?: string;
  children?: Record<string, GofileContent>;
};

let cachedAccountToken: string | null = null;
let cachedGenerateWT: ((token: string) => string) | null = null;
let cachedWTTime = 0;

async function getOrFetchGenerateWT(axios: any): Promise<(token: string) => string> {
  const now = Date.now();
  if (cachedGenerateWT && now - cachedWTTime < 3 * 60 * 60 * 1000) {
    return cachedGenerateWT;
  }

  try {
    const res = await axios.get("https://gofile.io/js/wt.obf.js", {
      headers: {
        "User-Agent": GOFILE_USER_AGENT,
        Referer: "https://gofile.io/",
      },
    });

    const code = res.data;
    const runner = new Function(
      "navigator",
      "window",
      "document",
      "location",
      `${code}\nreturn generateWT;`,
    );
    const fakeNav = {
      userAgent: GOFILE_USER_AGENT,
      language: GOFILE_LANGUAGE,
    };
    const fakeWin = {
      navigator: fakeNav,
      location: {
        href: "https://gofile.io/",
        protocol: "https:",
        host: "gofile.io",
      },
    };

    const generateWT = runner(fakeNav, fakeWin, {}, fakeWin.location);
    if (typeof generateWT === "function") {
      cachedGenerateWT = generateWT;
      cachedWTTime = now;
      return generateWT;
    }
  } catch (err: any) {
    console.warn("gofile: failed to fetch/execute wt.obf.js:", err?.message || err);
  }

  // Fallback if wt.obf.js is unreachable
  return (accountToken: string) => accountToken;
}

async function getOrFetchToken(axios: any, providerContext?: any): Promise<string> {
  if (cachedAccountToken) return cachedAccountToken;

  const kvStore = providerContext?.kvStore;
  try {
    const saved = await kvStore?.get("gofile_account_token");
    if (saved && typeof saved === "string") {
      cachedAccountToken = saved;
      return saved;
    }
  } catch {}

  const accountResponse = await axios.post(
    `${GOFILE_API}/accounts`,
    {},
    {
      headers: {
        "User-Agent": GOFILE_USER_AGENT,
        Origin: "https://gofile.io",
        Referer: "https://gofile.io/",
      },
    },
  );
  const token = accountResponse.data?.data?.token;

  if (!token) throw new Error("Gofile did not return an account token");

  cachedAccountToken = token;
  try {
    await kvStore?.set("gofile_account_token", token);
  } catch {}

  return token;
}

function findFirstFile(content: GofileContent): GofileContent | undefined {
  if (content?.type === "file" && content?.link) return content;

  for (const child of Object.values(content?.children ?? {})) {
    const file = findFirstFile(child);
    if (file) return file;
  }

  return undefined;
}

export async function gofileExtractor(
  id: string,
  axios: any,
  providerContext?: any,
): Promise<{ link: string; token: string }> {
  try {
    const token = await getOrFetchToken(axios, providerContext);
    const generateWT = await getOrFetchGenerateWT(axios);
    const websiteToken = generateWT(token);

    const response = await axios.get(`${GOFILE_API}/contents/${id}`, {
      params: {
        contentFilter: "",
        page: 1,
        pageSize: 1000,
        sortField: "name",
        sortDirection: 1,
      },
      headers: {
        Accept: "*/*",
        "Accept-Language": `${GOFILE_LANGUAGE},en;q=0.9`,
        Authorization: `Bearer ${token}`,
        Origin: "https://gofile.io",
        Referer: "https://gofile.io/",
        "User-Agent": GOFILE_USER_AGENT,
        "X-BL": GOFILE_LANGUAGE,
        "X-Website-Token": websiteToken,
      },
    });

    if (response.data?.status !== "ok") {
      // If unauthorized, clear cached token
      if (response.data?.status === "error-auth" || response.status === 401) {
        cachedAccountToken = null;
        try {
          await providerContext?.kvStore?.delete("gofile_account_token");
        } catch {}
      }
      throw new Error(
        `Gofile API returned ${response.data?.status ?? "invalid data"}`,
      );
    }

    const file = findFirstFile(response.data.data);
    if (!file?.link) throw new Error("No downloadable file found in Gofile response");

    return { link: file.link, token };
  } catch (error: any) {
    if (error?.response?.status === 401) {
      cachedAccountToken = null;
      try {
        await providerContext?.kvStore?.delete("gofile_account_token");
      } catch {}
    }
    throwProviderError("Gofile", `extract ${id}`, error);
  }
}

