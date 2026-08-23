import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "autoEmbed_skipTimings",
      type: "toggle",
      label: "Skip Timings",
      description:
        "Automatically fetch intro and recap skip timestamps from TheIntroDB for verified episodes",
      defaultValue: true,
    },
  ];
};
