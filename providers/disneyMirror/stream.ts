import { ProviderContext, Stream } from "../types";
import { netMirrorGetStream } from "../netMirrorCommon";

export const getStream = async ({
  link: id,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> => {
  return netMirrorGetStream({
    id,
    type,
    prefix: "hs",
    signal,
    providerContext,
    isDownload,
  });
};
