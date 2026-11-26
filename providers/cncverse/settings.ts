import { ProviderContext, SettingsField } from "../types";
import { bridgeCatalogs, catalogTitle, makeRef, RESOLUTIONS } from "./bridge";

const RESOLUTION_LABELS: Record<string, string> = {
  "2160": "4K (2160p)",
  "1080": "1080p",
  "720": "720p",
  "480": "480p",
  "360": "360p",
};

export const getSettingsSchema = async function ({
  providerContext,
}: {
  providerContext: ProviderContext;
}): Promise<SettingsField[]> {
  // Options mirror the catalogs the bridge currently exposes; the manifest is
  // cached, so this is instant after the first catalog load.
  let catalogs: { label: string; value: string }[] = [];
  try {
    const list = await bridgeCatalogs(providerContext, undefined, 6000);
    catalogs = list
      .map(item => ({ label: catalogTitle(item.name), value: makeRef(item.type, item.id) }))
      .filter(option => option.label);
  } catch {
    catalogs = [];
  }

  return [
    {
      key: "cncverse_bridgeUrl",
      type: "text",
      label: "Bridge URL",
      description:
        "CNCVerse Bridge addon to read. Leave empty to use the public server; set your own address if you self-host the bridge.",
      placeholder: "https://cncverse.dpdns.org",
      defaultValue: "",
    },
    {
      key: "cncverse_hideCatalogs",
      type: "multiselect",
      label: "Hide catalogs",
      description:
        "Catalogs you never browse. Hidden catalogs are also skipped by search; new bridge catalogs always appear until you hide them.",
      options: catalogs,
      defaultValue: [],
    },
    {
      key: "cncverse_lookupTitles",
      type: "toggle",
      label: "Look up missing titles",
      description:
        "Skip the extra request for unnamed items (Netflix, Prime Video, Hotstar) so mixed pages load faster. A page where every item is unnamed is still looked up, so it never shows up empty.",
      defaultValue: true,
    },
    {
      key: "cncverse_resolutions",
      type: "multiselect",
      label: "Allowed resolutions",
      description:
        "Hides other qualities when an allowed one exists. Clear everything to show every stream.",
      options: RESOLUTIONS.map(value => ({ label: RESOLUTION_LABELS[value] || `${value}p`, value })),
      defaultValue: ["2160", "1080", "720"],
    },
    {
      key: "cncverse_refresh",
      type: "button",
      label: "Clear cached bridge data",
      description: "Forget cached catalogs, titles and searches, then reload them on next use.",
      buttonLabel: "Clear cache",
    },
  ];
};

/** Settings keys are saved by the app; everything else under the prefix is cache. */
const SETTING_KEYS = new Set([
  "cncverse_bridgeUrl",
  "cncverse_hideCatalogs",
  "cncverse_lookupTitles",
  "cncverse_resolutions",
]);

export const onSettingsAction = async function ({
  key,
  providerContext,
}: {
  key: string;
  providerContext: ProviderContext;
}) {
  if (key !== "cncverse_refresh") return;
  const keys = await providerContext.kvStore.keys();
  for (const name of keys) {
    if (name.indexOf("cncverse_") !== 0 || SETTING_KEYS.has(name)) continue;
    await providerContext.kvStore.delete(name);
  }
};
