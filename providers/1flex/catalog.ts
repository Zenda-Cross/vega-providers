export const catalog = [
  {
    title: "Trending Movies",
    filter: "/discover/movie?sort_by=popularity.desc&vote_count.gte=500",
  },
  {
    title: "Popular TV Shows",
    filter: "/discover/tv?sort_by=popularity.desc&vote_count.gte=200",
  },
  {
    title: "Top Rated Movies",
    filter: "/discover/movie?sort_by=vote_average.desc&vote_count.gte=1000",
  },
  {
    title: "Top Rated TV Shows",
    filter: "/discover/tv?sort_by=vote_average.desc&vote_count.gte=500",
  },
];

export const genres = [
  { title: "Action", filter: "/discover/movie?with_genres=28" },
  { title: "Adventure", filter: "/discover/movie?with_genres=12" },
  { title: "Animation", filter: "/discover/movie?with_genres=16" },
  { title: "Comedy", filter: "/discover/movie?with_genres=35" },
  { title: "Crime", filter: "/discover/movie?with_genres=80" },
  { title: "Documentary", filter: "/discover/movie?with_genres=99" },
  { title: "Drama", filter: "/discover/movie?with_genres=18" },
  { title: "Family", filter: "/discover/movie?with_genres=10751" },
  { title: "Fantasy", filter: "/discover/movie?with_genres=14" },
  { title: "Horror", filter: "/discover/movie?with_genres=27" },
  { title: "Mystery", filter: "/discover/movie?with_genres=9648" },
  { title: "Romance", filter: "/discover/movie?with_genres=10749" },
  { title: "Sci-Fi", filter: "/discover/movie?with_genres=878" },
  { title: "Thriller", filter: "/discover/movie?with_genres=53" },
];
