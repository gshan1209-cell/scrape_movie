import https from "node:https";

const SOURCE_ORIGIN = "https://ssr1.scrape.center";
const PAGE_SIZE = 10;

export type ScrapeCenterMovie = {
  id: string;
  title: string;
  cover: string;
  categories: string[];
  region: string;
  duration: string;
  releaseDate: string;
  score: string;
  detailUrl: string;
};

export type ScrapeCenterResult = {
  source: string;
  page: number;
  total: number;
  movies: ScrapeCenterMovie[];
  categories: string[];
  filteredBy?: string;
  fetchedAt: string;
};

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&nbsp;", " ");
}

function textFromHtml(value = "") {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getMatch(value: string, pattern: RegExp) {
  return value.match(pattern)?.[1]?.trim() ?? "";
}

function uniqueSortedCategories(movies: ScrapeCenterMovie[]) {
  return Array.from(new Set(movies.flatMap((movie) => movie.categories))).sort((a, b) =>
    a.localeCompare(b, "zh-Hant"),
  );
}

function getSourcePath(page: number) {
  return page <= 1 ? "/" : `/page/${page}`;
}

function fetchHtml(page: number) {
  const url = new URL(getSourcePath(page), SOURCE_ORIGIN);

  return new Promise<string>((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "scrape-movie-dashboard/1.0",
        },
        rejectUnauthorized: false,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("end", () => {
          const statusCode = response.statusCode ?? 0;

          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`Scrape Center responded with HTTP ${statusCode}`));
            return;
          }

          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      },
    );

    request.setTimeout(15000, () => {
      request.destroy(new Error("Scrape Center request timed out"));
    });

    request.on("error", reject);
  });
}

async function fetchHtmlWithRetry(page: number) {
  try {
    return await fetchHtml(page);
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return fetchHtml(page);
  }
}

async function fetchOptionalHtml(page: number) {
  try {
    return await fetchHtmlWithRetry(page);
  } catch {
    return null;
  }
}

function parseMovies(html: string) {
  return html
    .split(/<div[^>]+class="el-card item m-t is-hover-shadow"[^>]*>/)
    .slice(1)
    .map((block) => {
      const id = getMatch(block, /href="\/detail\/(\d+)"/);
      const title = textFromHtml(getMatch(block, /<h2[^>]*class="m-b-sm"[^>]*>([\s\S]*?)<\/h2>/));
      const cover = decodeHtml(getMatch(block, /<img[\s\S]*?src="([^"]+)"[\s\S]*?class="cover"/));
      const categoriesBlock = getMatch(block, /<div[^>]*class="categories"[^>]*>([\s\S]*?)<\/div>/);
      const categories = Array.from(categoriesBlock.matchAll(/<span>([\s\S]*?)<\/span>/g)).map(
        (match) => textFromHtml(match[1]),
      );
      const infoBlocks = Array.from(
        block.matchAll(/<div[^>]*class="m-v-sm info"[^>]*>([\s\S]*?)<\/div>/g),
      ).map((match) => textFromHtml(match[1]));
      const [region = "", duration = ""] = (infoBlocks[0] ?? "").split("/").map((item) => item.trim());
      const releaseDate = (infoBlocks[1] ?? "").replace(" 上映", "");
      const score = getMatch(block, /<p[^>]*class="score[^"]*"[^>]*>\s*([\d.]+)/);

      return {
        id,
        title,
        cover,
        categories,
        region,
        duration,
        releaseDate,
        score,
        detailUrl: `${SOURCE_ORIGIN}/detail/${id}`,
      };
    })
    .filter((movie) => movie.id && movie.title);
}

async function getAllScrapeCenterMovies() {
  const firstHtml = await fetchHtmlWithRetry(1);
  const total = Number(getMatch(firstHtml, /共\s*(\d+)\s*条/)) || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const htmlPages = [firstHtml];

  for (let page = 2; page <= totalPages; page += 1) {
    const html = await fetchOptionalHtml(page);

    if (html) {
      htmlPages.push(html);
    }
  }

  const movies = htmlPages.flatMap(parseMovies);

  return {
    total,
    movies,
    categories: uniqueSortedCategories(movies),
  };
}

export async function getScrapeCenterMovies(page = 1, category?: string): Promise<ScrapeCenterResult> {
  const safePage = Math.max(1, page);

  if (category) {
    const allData = await getAllScrapeCenterMovies();
    const filteredMovies = allData.movies.filter((movie) => movie.categories.includes(category));
    const start = (safePage - 1) * PAGE_SIZE;

    return {
      source: SOURCE_ORIGIN,
      page: safePage,
      total: filteredMovies.length,
      movies: filteredMovies.slice(start, start + PAGE_SIZE),
      categories: allData.categories,
      filteredBy: category,
      fetchedAt: new Date().toISOString(),
    };
  }

  const html = await fetchHtml(safePage);
  const movies = parseMovies(html);
  const total = Number(getMatch(html, /共\s*(\d+)\s*条/)) || 0;

  return {
    source: SOURCE_ORIGIN,
    page: safePage,
    total,
    movies,
    categories: uniqueSortedCategories(movies),
    fetchedAt: new Date().toISOString(),
  };
}
