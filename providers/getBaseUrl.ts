// Base URLs hardcoded — updated from modflix.json
const BASE_URLS: Record<string, string> = {
  "Moviesmod": "https://moviesmod.farm",
  "Animeflix": "https://ww3.animeflix.ltd",
  "Topmovies": "https://moviesleech.bar",
  "UhdMovies": "https://uhdmovies.casa",
  "filepress": "https://new14.filepress.store",
  "Vega": "https://vegamovies.navy",
  "lux": "https://rogmovies.cv",
  "drive": "https://new5.moviesdrives.my/",
  "multi": "https://multimovies.fyi",
  "w4u": "https://world4ufree.at",
  "extra": "https://extramovies.ist",
  "hdhub": "https://new2.hdhub4u.cl",
  "kat": "https://new.katmoviehd.top",
  "dc": "https://dramacool.org.ro",
  "dooflix": "https://dooflixpanel.com",
  "autoEmbed": "https://autoembed.cc",
  "aed": "https://watch-drama.autoembed.cc",
  "aea": "https://watch-anime.autoembed.cc",
  "tokyoinsider": "https://www.tokyoinsider.com",
  "consumet": "https://consumet.zendax.tech",
  "nfMirror": "https://net22.cc",
  "primewire": "https://primewire.pw",
  "rive": "https://www.rivestream.app",
  "kissKh": "https://kisskh.do",
  "vadapav": "https://vadapav.mov",
  "cinemaLuxe": "https://cinemalux.cyou",
  "showbox": "https://www.showbox.media",
  "animerulz": "https://animerulz.co",
  "moviesapi": "https://moviesapi.to",
  "ridomovies": "https://ridomovies.tv",
  "protonMovies": "https://m.protonmovies.space",
  "dramafull": "https://dramafull.cc",
  "nfCookie": "https://userverify.netmirror.app",
  "embedsu": "https://moviemaze.cc",
  "filmyfly": "https://new2.filmyfiy.org",
  "4khdhub": "https://4khdhub.one",
  "moviezwap": "https://www.moviezwap.llc/",
  "9xflix": "https://soft-water-2a42.flixoflixx.workers.dev",
  "movieBox": "https://api6.aoneroom.com",
  "cinevood": "https://kmmovies.space",
  "kmmovies": "https://kmmovies.lol",
  "zeefliz": "https://zeefliz.beer",
  "katmoviefix": "https://katmoviefix.study",
  "movies4u": "https://movies4u.mw",
  "joya9tv": "https://joya9tv1.com",
  "skymovieshd": "https://skymovieshd.ceo",
  "1cinevood": "https://one.1cinevood.live",
  "uniquestream": "https://anime.uniquestream.net",
  "katdrama": "https://new.katdrama.my",
  "kdhindidubbed": "https://kdhindidubbed.cfd",
  "kdramasmaza": "https://kdramasmaza.net"
};

export const getBaseUrl = async (providerValue: string) => {
  try {
    const baseUrl = BASE_URLS[providerValue] || "";
    return baseUrl;
  } catch (error) {
    console.error(`Error fetching baseUrl: ${providerValue}`, error);
    return BASE_URLS[providerValue] || "";
  }
};
