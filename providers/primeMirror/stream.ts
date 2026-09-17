import { ProviderContext, Stream } from "../types";
import { netMirrorGetStream } from "../netMirrorCommon";

export const getStream = async ({
  link: id,
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
    prefix: "pv",
    signal,
    providerContext,
    isDownload,
  });
};
