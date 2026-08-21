import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "febboxCookie",
      type: "text",
      label: "FebBox Cookie (ui/session)",
      placeholder: "ui=...; or full cookie string",
      defaultValue: "",
      description: "Optional: Your personal FebBox login cookie to stream directly if the public worker session is expired.",
    },
  ];
};
