import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "hdhub4u_quickDownload",
      type: "toggle",
      label: "Quick Download",
      description:
        "Automatically download the preferred server in 1-click without showing server selection",
      defaultValue: true,
    },
    {
      key: "hdhub4u_preferredDownloadServer",
      type: "select",
      label: "Preferred Download Server",
      description: "Server to prioritize for 1-click quick download",
      options: [
        { label: "Auto (Best Available)", value: "auto" },
        { label: "CF Worker (Fastest)", value: "cf worker" },
        { label: "CF Storage (R2 Direct)", value: "cf storage" },
        { label: "GDrive (Google Direct)", value: "gdrive" },
        { label: "Pixeldrain", value: "pixeldrain" },
        { label: "FastDl", value: "fastdl" },
        { label: "HubCdn", value: "hubcdn" },
      ],
      defaultValue: "auto",
    },
  ];
};
