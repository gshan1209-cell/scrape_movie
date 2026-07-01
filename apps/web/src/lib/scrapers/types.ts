export type MovieSource = "scrape-center" | "atmovies";

export type AtMoviesView = "new" | "now" | "next";

export type MovieItem = {
  id: string;
  title: string;
  cover?: string;
  categories: string[];
  region?: string;
  duration?: string;
  releaseDate?: string;
  score?: string;
  theaters?: string;
  detailUrl: string;
  source: MovieSource;
  sourceLabel: string;
};

export type MovieResult = {
  source: MovieSource;
  sourceLabel: string;
  sourceUrl: string;
  page: number;
  pageSize: number;
  total: number;
  movies: MovieItem[];
  categories: string[];
  filteredBy?: string;
  atmoviesView?: AtMoviesView;
  notice?: string;
  fetchedAt: string;
};

export const PAGE_SIZE = 10;

export function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&nbsp;", " ");
}

export function textFromHtml(value = "") {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function getMatch(value: string, pattern: RegExp) {
  return value.match(pattern)?.[1]?.trim() ?? "";
}

export function uniqueSortedCategories(movies: MovieItem[]) {
  return Array.from(new Set(movies.flatMap((movie) => movie.categories))).sort((a, b) =>
    a.localeCompare(b, "zh-Hant"),
  );
}

export function paginateMovies(movies: MovieItem[], page: number, pageSize = PAGE_SIZE) {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return movies.slice(start, start + pageSize);
}
