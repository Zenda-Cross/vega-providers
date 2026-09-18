import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "t_hash_t",
      type: "text",
      label: "NetMirror Session Cookie (t_hash_t)",
      description:
        "Optional: If video shows 'STOP Abuse', visit https://net52.cc/verify in your browser, complete the human verification once, and paste the t_hash_t cookie here.",
      placeholder: "e.g. 4d82...::e19a...",
      defaultValue: "",
    },
    {
      key: "baseUrlOverride",
      type: "text",
      label: "Custom Mirror Domain",
      description: "Custom NetMirror mirror domain (default: https://net52.cc)",
      placeholder: "https://net52.cc",
      defaultValue: "",
    },
  ];
};
