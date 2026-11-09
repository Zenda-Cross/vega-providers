import { Catalog } from "../types";

// Filters are Internet Archive search queries; posts.ts adds the media type
// and license restrictions.
export const catalog: Catalog[] = [
  { title: "Popular Classic Films", filter: "collection:feature_films" },
  { title: "Silent Films", filter: "collection:silent_films" },
  { title: "Sci-Fi & Horror", filter: "collection:SciFi_Horror" },
  { title: "Classic TV", filter: "collection:classic_tv" },
  { title: "Cartoons & Animation", filter: "collection:animationandcartoons" },
  { title: "Short Films", filter: "collection:short_films" },
];

export const genres: Catalog[] = [
  { title: "Drama", filter: "collection:feature_films AND subject:(drama)" },
  { title: "Comedy", filter: "collection:feature_films AND subject:(comedy)" },
  { title: "Horror", filter: "collection:feature_films AND subject:(horror)" },
  { title: "Western", filter: "collection:feature_films AND subject:(western)" },
  { title: "Mystery", filter: "collection:feature_films AND subject:(mystery)" },
  { title: "Romance", filter: "collection:feature_films AND subject:(romance)" },
  { title: "War", filter: "collection:feature_films AND subject:(war)" },
  { title: "Film Noir", filter: 'collection:feature_films AND subject:("film noir")' },
  { title: "Science Fiction", filter: 'collection:feature_films AND subject:("science fiction")' },
];
