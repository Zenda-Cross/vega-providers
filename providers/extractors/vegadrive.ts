import { AxiosInstance } from 'axios';
import { ProviderContext, Stream } from '../types';
import { gofileExtractor } from './gofile';
import { transferitExtractor } from './transferit';

export async function vegadriveExtractor(
  vegadriveUrl: string,
  axios: AxiosInstance,
  ctx: ProviderContext
): Promise<Stream[]> {
  const streams: Stream[] = [];
  try {
    const defaultUserAgent =
      ctx?.commonHeaders?.['User-Agent'] ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const baseHeaders = {
      'User-Agent': defaultUserAgent,
      Referer: vegadriveUrl,
    };

    const pageRes = await axios.get(vegadriveUrl, {
      headers: baseHeaders,
      maxRedirects: 5,
      validateStatus: (s: number) => s >= 200 && s < 400,
    });

    const cookieHeader: any = pageRes.headers?.['set-cookie'];
    let cookieStr = '';
    if (Array.isArray(cookieHeader)) {
      cookieStr = cookieHeader.map((c: any) => String(c).split(';')[0]).join('; ');
    } else if (cookieHeader) {
      cookieStr = String(cookieHeader).split(';')[0];
    }

    const finalUrl = pageRes.request?.res?.responseUrl || vegadriveUrl;
    const vdBase = new URL(finalUrl).origin;

    const reqHeaders: Record<string, string> = {
      ...baseHeaders,
      Referer: finalUrl,
      ...(cookieStr ? { Cookie: cookieStr } : {}),
    };

    const shareIdMatch = vegadriveUrl.match(/\/s\/([a-zA-Z0-9]+)/);
    if (!shareIdMatch) return streams;
    const shareId = shareIdMatch[1];

    const targetProviders = ['buzzheavier', 'gofile', 'pixeldrain', 'transferit'];

    await Promise.all(
      targetProviders.map(async (provider) => {
        try {
          const dUrl = `${vdBase}/d/${shareId}/${provider}`;
          const dRes = await axios.get(dUrl, {
            headers: reqHeaders,
            maxRedirects: 0,
            validateStatus: (s: number) => s >= 200 && s < 400,
          });

          let targetLoc: string | undefined = dRes.headers?.location || dRes.headers?.Location;
          if (!targetLoc) return;
          if (targetLoc.startsWith('/')) {
            targetLoc = `${vdBase}${targetLoc}`;
          }

          if (targetLoc.includes('__vega_bridge')) {
            const bridgeRes = await axios.get(targetLoc, {
              headers: reqHeaders,
              maxRedirects: 0,
              validateStatus: (s: number) => s >= 200 && s < 400,
            });
            targetLoc = bridgeRes.headers?.location || bridgeRes.headers?.Location;
            if (targetLoc && targetLoc.startsWith('/')) {
              targetLoc = `${vdBase}${targetLoc}`;
            }
          }

          if (!targetLoc) return;

          if (provider === 'buzzheavier') {
            const dlUrl = targetLoc.endsWith('/download')
              ? targetLoc
              : `${targetLoc.replace(/\/+$/, '')}/download`;
            streams.push({
              server: 'Buzzheavier (VegaDrive)',
              link: dlUrl,
              type: 'mp4',
            });
          } else if (provider === 'pixeldrain') {
            const pxMatch =
              targetLoc.match(/\/u\/([a-zA-Z0-9_-]+)/) || targetLoc.match(/\/file\/([a-zA-Z0-9_-]+)/);
            if (pxMatch) {
              streams.push({
                server: 'Pixeldrain (VegaDrive)',
                link: `https://pixeldrain.com/api/file/${pxMatch[1]}`,
                type: 'mp4',
              });
            }
          } else if (provider === 'gofile') {
            const gofileMatch = targetLoc.match(/\/d\/([a-zA-Z0-9]+)/);
            if (gofileMatch) {
              const gfStream = await gofileExtractor(gofileMatch[1], axios, ctx);
              if (gfStream && gfStream.link) {
                streams.push({
                  server: 'Gofile (VegaDrive)',
                  link: gfStream.link,
                  type: 'mp4',
                });
              }
            }
          } else if (provider === 'transferit') {
            const trMatch = targetLoc.match(/\/t\/([a-zA-Z0-9_-]+)/);
            if (trMatch) {
              const transferId = trMatch[1];
              const ddl = await transferitExtractor(transferId, axios, defaultUserAgent);
              if (ddl) {
                streams.push({
                  server: 'Transfer.it (VegaDrive)',
                  link: ddl,
                  type: 'mp4',
                });
              }
            }
          }
        } catch (err: any) {
          // Ignore host resolution failure
        }
      })
    );
  } catch (error: any) {
    // Ignore vegadrive page error
  }

  return streams;
}