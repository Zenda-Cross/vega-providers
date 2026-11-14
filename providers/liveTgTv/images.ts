// Pad transparent channel logos against the same neutral background in every view.
export function channelImage(image: string, layout: 'card' | 'poster' | 'backdrop' = 'card'): string {
  if (!image) return '';
  const size = layout === 'poster' ? '&w=300&h=450&fit=contain' : layout === 'backdrop' ? '&w=1280&h=720&fit=contain' : '';
  return 'https://wsrv.nl/?url=' + encodeURIComponent(image) + size + '&bg=grey&cbg=grey';
}
