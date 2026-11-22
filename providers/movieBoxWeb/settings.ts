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
    type: "select",
    label: "Quick download subtitle language",
    description: "Uses the first available subtitle when the selected language is unavailable.",
    defaultValue: "",
    options: [
      { label: "First available", value: "" },
      { label: "English", value: "en" },
      { label: "Arabic", value: "ar" },
      { label: "Bengali", value: "bn" },
      { label: "Chinese", value: "zh" },
      { label: "Filipino", value: "fil" },
      { label: "French", value: "fr" },
      { label: "Hausa", value: "ha" },
      { label: "Hindi", value: "hi" },
      { label: "Indonesian", value: "in_id" },
      { label: "Malay", value: "ms" },
      { label: "Persian", value: "fa" },
      { label: "Portuguese", value: "pt" },
      { label: "Punjabi", value: "pa" },
      { label: "Russian", value: "ru" },
      { label: "Spanish", value: "es" },
      { label: "Swahili", value: "sw" },
      { label: "Thai", value: "th" },
      { label: "Turkish", value: "tr" },
      { label: "Urdu", value: "ur" },
      { label: "Vietnamese", value: "vi" },
    ],
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
