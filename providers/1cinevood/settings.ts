import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "preferredQuality",
      type: "select",
      label: "Default Video Quality",
      description: "Select your preferred playback resolution",
      options: [
        { label: "1080p (FHD)", value: "1080" },
        { label: "720p (HD)", value: "720" },
        { label: "480p (SD)", value: "480" },
      ],
      defaultValue: "1080",
    },
    {
      key: "streamServerPreference",
      type: "select",
      label: "Preferred Stream Server",
      description: "Prioritize this server when multiple fast servers are available",
      options: [
        { label: "Auto", value: "auto" },
        { label: "Fast Cloud", value: "fastcloud" },
        { label: "Direct Stream", value: "direct" },
      ],
      defaultValue: "auto",
    },
    {
      key: "customDomain",
      type: "text",
      label: "Mirror / Domain Override",
      description: "Custom domain if default is blocked",
      placeholder: "https://1cinevood.com",
      defaultValue: "",
    },
    {
      key: "autoResume",
      type: "toggle",
      label: "Remember Playback Position",
      description: "Save and resume playback position per stream",
      defaultValue: true,
    },
  ];
};
