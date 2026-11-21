import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "autoEmbed_st111477Enabled",
      type: "toggle",
      label: "111477 sources",
      description: "Include direct video links from the 111477 Stremio add-on.",
      defaultValue: true,
    },
    {
      key: "autoEmbed_st111477Manifest",
      type: "text",
      label: "111477 manifest URL",
      description: "Optional. Paste the manifest URL from https://st.111477.xyz/ to use your own configuration.",
      placeholder: "https://st.111477.xyz/config/…/manifest.json",
      defaultValue: "",
    },
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
