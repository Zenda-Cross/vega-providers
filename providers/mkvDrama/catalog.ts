export const catalog = [
  { title: "Latest", filter: "titles?status=&type=&order=latest" },
  { title: "Drama", filter: "titles?type=drama&order=latest" },
  { title: "Movies", filter: "titles?type=movie&order=latest" },
  { title: "Mini Drama", filter: "titles?type=mini_drama&order=latest" },
  { title: "Ongoing", filter: "titles?status=ongoing&order=latest" },
  { title: "Completed", filter: "titles?status=completed&order=latest" },
];

export const genres = [
  { title: "Korean", filter: "titles?country[]=south-korea&order=latest" },
  { title: "Chinese", filter: "titles?country[]=china&order=latest" },
  { title: "Japanese", filter: "titles?country[]=japan&order=latest" },
  { title: "Thai", filter: "titles?country[]=thailand&order=latest" },
  { title: "Action", filter: "titles?genre[]=action&order=latest" },
  { title: "Romance", filter: "titles?genre[]=romance&order=latest" },
  { title: "Thriller", filter: "titles?genre[]=thriller&order=latest" },
];
