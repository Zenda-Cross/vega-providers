import { ProviderContext, SettingsField } from "../types";

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  return [
    {
      key: "licenses",
      type: "select",
      label: "Allowed licenses",
      description: "Only show videos marked with these licenses on Internet Archive",
      options: [
        { label: "Public domain and Creative Commons", value: "open" },
        { label: "Public domain only", value: "publicDomain" },
      ],
      defaultValue: "open",
    },
  ];
};
