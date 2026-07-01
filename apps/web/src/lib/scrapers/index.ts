import { getScrapeCenterMovies } from "@/lib/scrape-center";
import { getAtMovies, getSafeAtMoviesView } from "@/lib/scrapers/atmovies";
import type { MovieSource } from "@/lib/scrapers/types";

export function getSafeMovieSource(value?: string | null): MovieSource {
  return value === "atmovies" ? "atmovies" : "scrape-center";
}

export async function getMovies({
  source,
  page,
  category,
  atmoviesView,
}: {
  source?: string | null;
  page: number;
  category?: string;
  atmoviesView?: string | null;
}) {
  const safeSource = getSafeMovieSource(source);

  if (safeSource === "atmovies") {
    return getAtMovies(page, getSafeAtMoviesView(atmoviesView));
  }

  return getScrapeCenterMovies(page, category);
}

export type { AtMoviesView, MovieItem, MovieResult, MovieSource } from "@/lib/scrapers/types";
