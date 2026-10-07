import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "audio",
      type: "select",
      label: "Audio Language",
      description: "Preferred audio track when multiple are available",
      options: [
        { label: "Hindi", value: "hindi" },
        { label: "English", value: "english" },
        { label: "Tamil", value: "tamil" },
        { label: "Telugu", value: "telugu" },
        { label: "Japanese", value: "japanese" },
        { label: "Dual Audio", value: "dual" },
      ],
      defaultValue: "hindi",
    },
    {
      key: "quality",
      type: "select",
      label: "Preferred Quality",
      options: [
        { label: "1080p", value: "1080p" },
        { label: "720p", value: "720p" },
        { label: "480p", value: "480p" },
      ],
      defaultValue: "1080p",
    },
    {
      key: "autoPlay",
      type: "toggle",
      label: "Auto Play",
      defaultValue: true,
    },
    {
      key: "baseUrl",
      type: "text",
      label: "Base URL",
      description: "Override default domain if it changes",
      defaultValue: "https://animesalt.in",
      placeholder: "https://animesalt.in",
    },
    {
      key: "requestTimeout",
      type: "number",
      label: "Request Timeout (ms)",
      defaultValue: 30000,
      min: 5000,
      max: 120000,
    },
  ];
};