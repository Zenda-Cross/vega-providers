import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "animesub_manifestUrl",
      type: "text",
      label: "Custom Manifest URL",
      description:
        "Optional: Paste your configured AnimeSub+ manifest URL (from https://animesub.duckdns.org/configure)",
      placeholder: "https://animesub.duckdns.org/u_.../manifest.json",
      defaultValue: "",
    },
    {
      key: "animesub_debridService",
      type: "select",
      label: "Debrid Provider",
      description:
        "Select your premium debrid service for high-speed streaming without P2P seeding",
      options: [
        { label: "None (Direct Torrent / P2P)", value: "none" },
        { label: "Real-Debrid", value: "realdebrid" },
        { label: "AllDebrid", value: "alldebrid" },
        { label: "Premiumize", value: "premiumize" },
        { label: "TorBox", value: "torbox" },
        { label: "Debrid-Link", value: "debridlink" },
      ],
      defaultValue: "none",
    },
    {
      key: "animesub_debridApiKey",
      type: "text",
      label: "Debrid API Key / Token",
      description:
        "Your API token from your Debrid provider account (leave empty for regular torrents)",
      placeholder: "e.g. your_debrid_api_token",
      defaultValue: "",
    },
    {
      key: "animesub_qualityFilter",
      type: "select",
      label: "Resolution Filter",
      description: "Limit results to maximum or specific qualities",
      options: [
        { label: "All Qualities (4K, 1080p, 720p, 480p)", value: "all" },
        { label: "Up to 4K / 2160p", value: "2160" },
        { label: "Up to 1080p (Exclude 4K)", value: "1080" },
        { label: "Up to 720p (Exclude 4K & 1080p)", value: "720" },
        { label: "480p SD only", value: "480" },
      ],
      defaultValue: "all",
    },
    {
      key: "animesub_sortBy",
      type: "select",
      label: "Sort Stream Results By",
      description: "Prioritize results order in player stream list",
      options: [
        { label: "Quality then Seeders (Default)", value: "qualitythenseeders" },
        { label: "Seeders (Most seeds first)", value: "seeders" },
        { label: "File Size (Largest first)", value: "size" },
      ],
      defaultValue: "qualitythenseeders",
    },
    {
      key: "animesub_instanceUrl",
      type: "text",
      label: "AnimeSub+ Server URL",
      description:
        "AnimeSub+ instance host (default: https://animesub.duckdns.org)",
      placeholder: "https://animesub.duckdns.org",
      defaultValue: "https://animesub.duckdns.org",
    },
    {
      key: "animesub_enableP2P",
      type: "toggle",
      label: "Enable P2P Fallback",
      description:
        "Include raw P2P torrent links when Debrid has not cached the file or when no Debrid is used",
      defaultValue: true,
    },
    {
      key: "animesub_skipTimings",
      type: "toggle",
      label: "Skip Timings",
      description:
        "Automatically fetch intro and recap skip timestamps from TheIntroDB for verified anime episodes",
      defaultValue: true,
    },
  ];
};
