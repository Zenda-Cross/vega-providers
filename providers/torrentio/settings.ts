import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "debridService",
      type: "select",
      label: "Debrid Provider",
      description: "Select your premium debrid service for high-speed streaming without P2P seeding",
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
      key: "debridApiKey",
      type: "text",
      label: "Debrid API Key / Token",
      description: "Your API token from your Debrid provider account (leave empty for regular torrents)",
      placeholder: "e.g. your_realdebrid_api_token",
      defaultValue: "",
    },
    {
      key: "qualityFilter",
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
      key: "sortBy",
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
      key: "customInstanceUrl",
      type: "text",
      label: "Torrentio Instance URL",
      description: "Self-hosted or proxy instance of Torrentio (default: https://torrentio.strem.fun)",
      placeholder: "https://torrentio.strem.fun",
      defaultValue: "https://torrentio.strem.fun",
    },
    {
      key: "includeP2PFallback",
      type: "toggle",
      label: "Show magnet links if un-cached",
      description: "Include raw P2P torrent links when Debrid has not cached the file",
      defaultValue: true,
    },
    {
      key: "torrentio_skipTimings",
      type: "toggle",
      label: "Skip Timings",
      description:
        "Automatically fetch intro and recap skip timestamps from TheIntroDB for verified episodes",
      defaultValue: false,
    },
  ];
};
