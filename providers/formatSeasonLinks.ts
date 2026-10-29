import { Link } from "./types";

/** Format release headings without changing links, ordering or episode data. */
export function formatSeasonTitle(title: string): string {
  let rest = title.replace(/\s+/g, " ").trim();
  if (/^Season \d+(?:–\d+)? • /.test(rest)) return rest;
  const season = rest.match(/\b(?:season\s*|S)(\d{1,2})(?:\s*[-–]\s*(?:season\s*|S)?(\d{1,2}))?\b/i);
  if (!season) return title;
  rest = rest.replace(season[0], " ");
  const parts = [`Season ${Number(season[1])}${season[2] ? `–${Number(season[2])}` : ""}`];
  const take = (pattern: RegExp, format: (match: RegExpMatchArray) => string) => {
    const match = rest.match(pattern);
    if (match) { parts.push(format(match)); rest = rest.replace(match[0], " "); }
  };
  take(/\bepisodes?\s*[.: -]*0*(\d+)(?:\s*[-–]\s*0*(\d+))?\s*(?:added)?\b/i,
    m => `EP ${Number(m[1])}${m[2] ? `–${Number(m[2])}` : ""}`);
  take(/\{([^{}]+)\}/, m => m[1].trim());
  take(/\b(?:2160p|1080p|720p|480p|360p|4K)\b/i, m => m[0].toLowerCase() === "4k" ? "4K" : m[0].toLowerCase());
  take(/\b(?:WEB[ .-]?(?:DL|Rip)|Blu[ .-]?Ray|BDRip|HDRip|HDTV|DVDRip)\b/i,
    m => /^web/i.test(m[0]) ? (/rip/i.test(m[0]) ? "WEBRip" : "WEB-DL") : m[0]);
  take(/\b(?:DDP?|EAC3|AC3|AAC|DTS(?:-HD)?|TrueHD|Atmos)\s*(?:\d\.\d)?\b/i, m => m[0]);
  take(/\b(?:x26[45]|H[ .]?26[45]|HEVC|AV1)\b/i, m => m[0]);
  take(/\b(\d+(?:\.\d+)?)\s*(GB|MB|TB)\s*(?:\/\s*(?:episodes?|eps?|E)\b)?/i,
    m => `${m[1]} ${m[2].toUpperCase()}${/\//.test(m[0]) ? "/episode" : ""}`);
  // Keep unrecognized details (HDR/DV, editions, language variants, etc.).
  const remaining = rest.replace(/[{}()[\]|•]/g, " ").replace(/\s+/g, " ").replace(/^\s*[-–:]+|[-–:]+\s*$/g, "").trim();
  if (remaining) parts.push(remaining);
  return parts.join(" • ");
}

export function formatSeasonLinks(links: Link[]): Link[] {
  return links.map(link => ({ ...link, title: formatSeasonTitle(link.title) }));
}
