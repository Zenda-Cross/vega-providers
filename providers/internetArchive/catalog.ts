import { Catalog } from "../types";

export const catalog: Catalog[] = [
  { title: "Popular Classic Films", filter: "collection:feature_films" },
  { title: "Silent Films", filter: "collection:silent_films" },
  { title: "Sci-Fi & Horror", filter: "collection:SciFi_Horror" },
  { title: "Film Noir", filter: "collection:film_noir" },
  { title: "Classic TV", filter: "collection:classic_tv" },
  { title: "Cartoons & Animation", filter: "collection:animationandcartoons" },
  { title: "Short Films", filter: "collection:short_films" },
  { title: "Movie Trailers", filter: "collection:movie_trailers" },
  { title: "Prelinger Archives", filter: "collection:prelinger" },
];

const subjectGenre = (title: string, subject: string): Catalog => ({
  title,
  filter: `collection:feature_films AND subject:(${subject})`,
});

const decade = (start: number): Catalog => ({
  title: `${start}s Films`,
  filter: `collection:feature_films AND year:[${start} TO ${start + 9}]`,
});

export const genres: Catalog[] = [
  subjectGenre("Drama", "drama"),
  subjectGenre("Comedy", "comedy"),
  subjectGenre("Horror", "horror"),
  subjectGenre("Western", "western"),
  subjectGenre("Mystery", "mystery"),
  subjectGenre("Romance", "romance"),
  subjectGenre("War", "war"),
  subjectGenre("Film Noir", '"film noir"'),
  subjectGenre("Science Fiction", '"science fiction"'),
  subjectGenre("Adventure", "adventure"),
  subjectGenre("Crime", "crime"),
  subjectGenre("Musical", "musical"),
  subjectGenre("Documentary", "documentary"),
  decade(1920),
  decade(1930),
  decade(1940),
  decade(1950),
  decade(1960),
  decade(1970),
];
