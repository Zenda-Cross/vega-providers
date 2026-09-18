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
        "Optional: Paste a verified t_hash_t session cookie if you already have one, or leave blank to auto-unlock via sponsor ad verification.",
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
