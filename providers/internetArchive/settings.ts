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
    {
      key: "sort",
      type: "select",
      label: "Order",
      description: "How lists and search results are sorted",
      options: [
        { label: "Most popular", value: "downloads" },
        { label: "Recently added", value: "addeddate" },
        { label: "Highest rated", value: "avg_rating" },
        { label: "Newest release", value: "newest" },
        { label: "Oldest release", value: "oldest" },
        { label: "Title A to Z", value: "title" },
      ],
      defaultValue: "downloads",
    },
    {
      key: "quality",
      type: "select",
      label: "Preferred quality",
      description: "The version closest to this resolution is listed first",
      options: [
        { label: "Best available", value: "auto" },
        { label: "1080p", value: "1080" },
        { label: "720p", value: "720" },
        { label: "480p", value: "480" },
        { label: "360p", value: "360" },
      ],
      defaultValue: "auto",
    },
  ];
};
