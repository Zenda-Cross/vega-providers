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
      label: "Preferred Streaming Quality",
      description: "Default resolution to prioritize when loading video playback",
      options: [
        { label: "Auto (Highest Available)", value: "auto" },
        { label: "1080p (Full HD)", value: "1080" },
        { label: "720p (HD)", value: "720" },
        { label: "480p (Standard)", value: "480" },
        { label: "360p (Data Saver)", value: "360" },
      ],
      defaultValue: "auto",
    },
  ];
};
