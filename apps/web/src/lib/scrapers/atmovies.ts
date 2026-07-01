import https from "node:https";

import {
  type AtMoviesView,
  type MovieItem,
  type MovieResult,
  PAGE_SIZE,
  decodeHtml,
  getMatch,
  paginateMovies,
  textFromHtml,
} from "@/lib/scrapers/types";

const SOURCE_ORIGIN = "https://www.atmovies.com.tw";
const CACHE_TTL_MS = 30 * 60 * 1000;

const ALLOWED_VIEWS: Record<AtMoviesView, { label: string; path: string }> = {
  new: { label: "本周新片", path: "/movie/new/" },
  now: { label: "本期首輪", path: "/movie/now/0/" },
  next: { label: "近期上映", path: "/movie/next/" },
};

type CacheEntry = {
  expiresAt: number;
  result: Omit<MovieResult, "page" | "movies" | "fetchedAt"> & {
    allMovies: MovieItem[];
    fetchedAt: string;
  };
};

const cache = new Map<AtMoviesView, CacheEntry>();

function normalizeUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, SOURCE_ORIGIN).toString();
}

function fetchHtml(path: string) {
  const url = normalizeUrl(path);

  return new Promise<string>((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "scrape-movie-dashboard/1.0 (+limited educational lookup)",
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("end", () => {
          const statusCode = response.statusCode ?? 0;

          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`@movies responded with HTTP ${statusCode}`));
            return;
          }

          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      },
    );

    request.setTimeout(15000, () => {
      request.destroy(new Error("@movies request timed out"));
    });

    request.on("error", reject);
  });
}

function parseRuntime(raw: string) {
  const text = textFromHtml(raw);

  return {
    duration: getMatch(text, /片長[:：]?\s*([0-9]+分)/),
    releaseDate: getMatch(text, /上映日期[:：]?\s*([0-9/]+)/),
    theaters: getMatch(text, /上映廳數\s*\(([^)]+)\)/) || getMatch(text, /\(([0-9]+廳)\)/),
  };
}

function parseNewMovies(html: string): MovieItem[] {
  return html
    .split(/<article[^>]*class="filmList"[^>]*>/)
    .slice(1)
    .map((block) => {
      const detailPath = getMatch(block, /<div[^>]*class="filmTitle"[\s\S]*?<a href="([^"]+)"/);
      const title = textFromHtml(getMatch(block, /<div[^>]*class="filmTitle"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/));
      const coverPath = getMatch(block, /<img src="([^"]+)" class="filmListPoster"/);
      const runtime = parseRuntime(getMatch(block, /<div[^>]*class="runtime"[^>]*>([\s\S]*?)<\/div>/));
      const score = textFromHtml(getMatch(block, /<div id="avg"[^>]*>([\s\S]*?)<\/div>/)).replace("★", "");

      return {
        id: detailPath.replaceAll("/", "") || title,
        title,
        cover: coverPath ? normalizeUrl(coverPath) : undefined,
        categories: ["本周新片"],
        duration: runtime.duration,
        releaseDate: runtime.releaseDate,
        score: score === "0" ? undefined : score,
        theaters: runtime.theaters,
        detailUrl: normalizeUrl(detailPath),
        source: "atmovies" as const,
        sourceLabel: "@movies 開眼電影網",
      };
    })
    .filter((movie) => movie.title && movie.detailUrl);
}

function parseCompactMovies(html: string, category: string): MovieItem[] {
  const listBlock = getMatch(html, /<ul class="filmListPA">([\s\S]*?)<\/ul>/);

  return Array.from(listBlock.matchAll(/<li>\s*[\s\S]*?<a href="([^"]+)">([\s\S]*?)<\/a>\s*<span class="runtime">([\s\S]*?)<\/span>/g))
    .map((match) => {
      const detailPath = match[1];
      const title = textFromHtml(match[2]).replace(/^★/, "");
      const runtimeText = textFromHtml(match[3]);
      const releaseDate = getMatch(runtimeText, /([0-9]{4}\/[0-9]{1,2}\/[0-9]{1,2})/);
      const duration = getMatch(runtimeText, /\(([0-9]+分)\)/);
      const theaters = getMatch(runtimeText, /\(([0-9]+廳)\)/);

      return {
        id: detailPath.replaceAll("/", "") || title,
        title,
        categories: [category],
        duration,
        releaseDate,
        theaters,
        detailUrl: normalizeUrl(detailPath),
        source: "atmovies" as const,
        sourceLabel: "@movies 開眼電影網",
      };
    })
    .filter((movie) => movie.title && movie.detailUrl);
}

function parseNowAllMovies(html: string): MovieItem[] {
  return html
    .split(/<h2 class="major">/)
    .slice(1)
    .flatMap((section) => {
      const releaseDate = textFromHtml(getMatch(section, /<span>([\s\S]*?)<\/span>/));
      const listBlock = getMatch(section, /<ul class="filmListAll">([\s\S]*?)<\/ul>/);

      return Array.from(
        listBlock.matchAll(
          /<li>[\s\S]*?<a href="([^"]+)"><img src="([^"]+)"[\s\S]*?<div class="filmtitle">\s*<a[^>]*>([\s\S]*?)<\/a>\s*<span class="runtime">\(([^)]+)\)<\/span>/g,
        ),
      ).map((match) => {
        const detailPath = match[1];
        const coverPath = match[2];
        const title = textFromHtml(match[3]);
        const theaters = textFromHtml(match[4]);

        return {
          id: detailPath.replaceAll("/", "") || title,
          title,
          cover: normalizeUrl(coverPath),
          categories: ["本期首輪"],
          releaseDate,
          theaters,
          detailUrl: normalizeUrl(detailPath),
          source: "atmovies" as const,
          sourceLabel: "@movies 開眼電影網",
        };
      });
    })
    .filter((movie) => movie.title && movie.detailUrl);
}

function parseUpcomingMovies(html: string): MovieItem[] {
  return Array.from(html.matchAll(/<li><a href="([^"]+)"><img src="([^"]+)" alt="([^"]*)"[\s\S]*?<div class="filmtitle"><a[^>]*>([\s\S]*?)<\/a><\/div>[\s\S]*?<div class="runtime">([\s\S]*?)<\/div>/g))
    .map((match) => {
      const detailPath = match[1];
      const coverPath = match[2];
      const title = textFromHtml(match[4] || match[3]);
      const runtimeText = textFromHtml(match[5]);

      return {
        id: detailPath.replaceAll("/", "") || title,
        title,
        cover: normalizeUrl(coverPath),
        categories: ["近期上映"],
        duration: getMatch(runtimeText, /片長[:：]?\s*([0-9]+分)/),
        releaseDate: getMatch(runtimeText, /上映日期[:：]?\s*([0-9/]+)/),
        detailUrl: normalizeUrl(detailPath),
        source: "atmovies" as const,
        sourceLabel: "@movies 開眼電影網",
      };
    })
    .filter((movie) => movie.title && movie.detailUrl);
}

function parseMovies(html: string, view: AtMoviesView) {
  if (view === "new") {
    return parseNewMovies(html);
  }

  if (view === "next") {
    return parseUpcomingMovies(html);
  }

  return parseNowAllMovies(html);
}

async function getAtMoviesDataset(view: AtMoviesView) {
  const cached = cache.get(view);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const config = ALLOWED_VIEWS[view];
  const html = await fetchHtml(config.path);
  const allMovies = parseMovies(html, view);
  const sourceUrl = normalizeUrl(config.path);
  const result: CacheEntry["result"] = {
    source: "atmovies",
    sourceLabel: "@movies 開眼電影網",
    sourceUrl,
    pageSize: PAGE_SIZE,
    total: allMovies.length,
    categories: [config.label],
    atmoviesView: view,
    notice:
      "僅抓取白名單頁面的最小必要欄位；資料來源標示為 @movies，並保留每筆原始連結。",
    allMovies,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(view, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    result,
  });

  return result;
}

export function getSafeAtMoviesView(value?: string | null): AtMoviesView {
  return value === "now" || value === "next" || value === "new" ? value : "new";
}

export async function getAtMovies(page = 1, view: AtMoviesView = "new"): Promise<MovieResult> {
  const dataset = await getAtMoviesDataset(view);
  const safePage = Math.max(1, page);

  return {
    source: dataset.source,
    sourceLabel: dataset.sourceLabel,
    sourceUrl: dataset.sourceUrl,
    page: safePage,
    pageSize: dataset.pageSize,
    total: dataset.total,
    movies: paginateMovies(dataset.allMovies, safePage, dataset.pageSize),
    categories: dataset.categories,
    atmoviesView: dataset.atmoviesView,
    notice: dataset.notice,
    fetchedAt: dataset.fetchedAt,
  };
}
