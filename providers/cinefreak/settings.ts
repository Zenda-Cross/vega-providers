import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "quickDownload",
      type: "toggle",
      label: "Quick Download",
      description:
        "Automatically download the first server in 1-click without asking to select a server",
      defaultValue: false,
    },
  ];
};
