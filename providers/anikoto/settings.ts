import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "anikoto_skipTimings",
      type: "toggle",
      label: "Skip Timings",
      description:
        "Automatically enable intro and outro skip timestamps from Anikoto",
      defaultValue: true,
    },
  ];
};
