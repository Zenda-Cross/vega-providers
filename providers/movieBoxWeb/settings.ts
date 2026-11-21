import { SettingsField } from "../types";

export const getSettingsSchema = async function (): Promise<SettingsField[]> {
  return [{
    key: "quickDownload",
    type: "toggle",
    label: "Quick Download",
    description: "Turn off to choose download options manually.",
    defaultValue: true,
  }, {
    key: "downloadSubtitle",
    type: "text",
    label: "Quick download subtitle language",
    description: "Enter a language name or code. Uses the first available subtitle if there is no match.",
    placeholder: "English or en",
    defaultValue: "",
  }, {
    key: "downloadQuality",
    type: "select",
    label: "Quick download quality",
    description: "Uses the nearest available quality if your choice is unavailable. Equally close qualities prefer the higher resolution.",
    defaultValue: "highest",
    options: [
      { label: "Highest available", value: "highest" },
      ...[2160, 1080, 720, 480, 360].map(quality => ({ label: `${quality}p`, value: String(quality) })),
    ],
  }];
};
