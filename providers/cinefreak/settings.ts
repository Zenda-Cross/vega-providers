import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "cinefreak_quickDownload",
      type: "toggle",
      label: "Quick Download",
      description:
        "Automatically download the preferred server in 1-click without asking to select a server",
      defaultValue: true,
    },
    {
      key: "cinefreak_preferredDownloadServer",
      type: "select",
      label: "Preferred Download Server",
      description: "Server to prioritize for 1-click quick download",
      options: [
        { label: "Auto (Best Available)", value: "auto" },
        { label: "Fast Cloud (R2 Direct)", value: "fast cloud" },
        { label: "Cloud Resumable (R2 Storage)", value: "resumable" },
        { label: "Instant Download (Google Direct)", value: "instant" },
        { label: "Stream Online", value: "stream online" },
      ],
      defaultValue: "auto",
    },
  ];
};
