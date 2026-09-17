import { Info, ProviderContext } from "../types";
import { netMirrorGetMeta } from "../netMirrorCommon";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  return netMirrorGetMeta({
    link,
    prefix: "hs",
    providerContext,
  });
};
