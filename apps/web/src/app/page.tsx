import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Clapperboard,
  Database,
  Download,
  ExternalLink,
  Film,
  Play,
  Search,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMovies, getSafeMovieSource, type AtMoviesView, type MovieItem } from "@/lib/scrapers";
import { getSafeAtMoviesView } from "@/lib/scrapers/atmovies";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{
    page?: string;
    category?: string;
    source?: string;
    view?: string;
  }>;
};

function getSafePage(value?: string) {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

async function loadMovies({
  page,
  category,
  source,
  view,
}: {
  page: number;
  category?: string;
  source?: string;
  view?: string;
}) {
  try {
    return await getMovies({
      source,
      page,
      category,
      atmoviesView: view,
    });
  } catch (error) {
    const safeSource = getSafeMovieSource(source);

    return {
      source: safeSource,
      sourceLabel: safeSource === "atmovies" ? "@movies 開眼電影網" : "Scrape Center",
      sourceUrl:
        safeSource === "atmovies"
          ? "https://www.atmovies.com.tw/movie/new/"
          : "https://ssr1.scrape.center",
      page,
      pageSize: 10,
      total: 0,
      movies: [] as MovieItem[],
      categories: [],
      filteredBy: category,
      atmoviesView: safeSource === "atmovies" ? getSafeAtMoviesView(view) : undefined,
      notice: undefined,
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unable to fetch source",
    };
  }
}

function pageHref({
  page,
  category,
  source,
  view,
}: {
  page: number;
  category?: string;
  source: string;
  view?: string;
}) {
  const params = new URLSearchParams();

  if (source !== "scrape-center") {
    params.set("source", source);
  }

  if (view && source === "atmovies") {
    params.set("view", view);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  if (category && source === "scrape-center") {
    params.set("category", category);
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function categoryHref(category: string) {
  const params = new URLSearchParams({ category });
  return `/?${params.toString()}`;
}

function atMoviesHref(view: AtMoviesView) {
  return `/?source=atmovies&view=${view}`;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function getMovieMeta(movie: MovieItem) {
  return [movie.region, movie.duration, movie.theaters].filter(Boolean).join(" · ");
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const source = getSafeMovieSource(params?.source);
  const activeCategory = source === "scrape-center" ? params?.category?.trim() || undefined : undefined;
  const atmoviesView = getSafeAtMoviesView(params?.view);
  const currentPage = getSafePage(params?.page);
  const data = await loadMovies({
    page: currentPage,
    category: activeCategory,
    source,
    view: atmoviesView,
  });
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const visiblePages = getVisiblePages(data.page, totalPages);
  const lastUpdated = new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(data.fetchedAt));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-r bg-slate-950 px-5 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-amber-400 text-slate-950">
              <Clapperboard className="size-6" />
            </div>
            <div>
              <p className="font-semibold">Scrape Movie</p>
              <p className="text-sm text-slate-400">crawler studio</p>
            </div>
          </div>

          <nav className="mt-10 grid gap-2">
            {[
              ["Dashboard", Film],
              ["Movie DB", Database],
              ["Schedule", CalendarDays],
              ["Reports", BarChart3],
            ].map(([label, Icon]) => (
              <a
                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-slate-300 transition first:bg-slate-800 first:text-white hover:bg-slate-800 hover:text-white"
                href="#"
                key={label as string}
              >
                <Icon className="size-4" />
                {label as string}
              </a>
            ))}
          </nav>
        </aside>

        <section className="px-5 py-6 sm:px-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-muted-foreground">
                Movie scraping dashboard
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-normal sm:text-4xl">
                電影資料收集工作台
              </h1>
            </div>

            <label className="flex h-11 w-full items-center gap-2 rounded-md border bg-card px-3 md:max-w-sm">
              <Search className="size-4 text-muted-foreground" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="搜尋電影、來源或分類"
              />
            </label>
          </header>

          <section className="mt-7 overflow-hidden rounded-lg bg-slate-950 text-white">
            <div className="grid gap-6 bg-[linear-gradient(90deg,rgba(15,23,42,.96),rgba(15,23,42,.68)),url('https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center p-7 md:grid-cols-[1fr_320px] md:p-9">
              <div className="self-end">
                <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-400">
                  來源：{data.sourceLabel}
                </Badge>
                <h2 className="mt-5 max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl">
                  即時查詢電影清單，保留來源與合規邊界。
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                  目前顯示第 {data.page} / {totalPages} 頁
                  {activeCategory ? `，分類：${activeCategory}` : ""}，資料來源為 {data.sourceUrl}。
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                    <Play className="mr-2 size-4" />
                    開始查詢
                  </Button>
                  <Button asChild variant="secondary">
                    <a href={data.sourceUrl} rel="noreferrer" target="_blank">
                      <ExternalLink className="mr-2 size-4" />
                      開啟來源
                    </a>
                  </Button>
                </div>
              </div>

              <div className="grid self-end overflow-hidden rounded-md border border-white/15 bg-white/10">
                {[
                  [data.movies.length.toString(), "本頁筆數"],
                  [data.total.toString(), activeCategory ? "篩選結果" : "來源筆數"],
                  [lastUpdated, "更新時間"],
                ].map(([value, label]) => (
                  <div className="border-b border-white/10 p-5 last:border-b-0" key={label}>
                    <p className="text-3xl font-bold">{value}</p>
                    <p className="mt-1 text-sm text-slate-200">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {"error" in data ? (
            <Card className="mt-7 border-destructive/40">
              <CardHeader>
                <CardTitle>來源讀取失敗</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{data.error}</CardContent>
            </Card>
          ) : null}

          {data.notice ? (
            <Card className="mt-7 border-amber-300 bg-amber-50">
              <CardContent className="p-4 text-sm text-amber-900">{data.notice}</CardContent>
            </Card>
          ) : null}

          <section className="mt-7 grid gap-6 xl:grid-cols-[1fr_340px]">
            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">電影清單</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    第 {data.page} 頁，每頁 {data.pageSize} 筆
                  </p>
                </div>
                <Button variant="outline" size="icon" aria-label="Refresh">
                  <BarChart3 className="size-4" />
                </Button>
              </div>

              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Button asChild variant={source === "scrape-center" ? "default" : "outline"} size="sm">
                  <Link href="/">Scrape Center</Link>
                </Button>
                <Button asChild variant={source === "atmovies" ? "default" : "outline"} size="sm">
                  <Link href="/?source=atmovies&view=new">@movies</Link>
                </Button>
              </div>

              {source === "atmovies" ? (
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  {[
                    ["new", "本周新片"],
                    ["now", "本期首輪"],
                    ["next", "近期上映"],
                  ].map(([view, label]) => (
                    <Button
                      asChild
                      key={view}
                      variant={data.atmoviesView === view ? "default" : "outline"}
                      size="sm"
                    >
                      <Link href={atMoviesHref(view as AtMoviesView)}>{label}</Link>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <Button asChild variant={activeCategory ? "outline" : "default"} size="sm">
                    <Link href="/">全部</Link>
                  </Button>
                  {data.categories.map((category) => (
                    <Button
                      asChild
                      key={category}
                      variant={category === activeCategory ? "default" : "outline"}
                      size="sm"
                    >
                      <Link href={categoryHref(category)}>{category}</Link>
                    </Button>
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                {data.movies.map((movie) => (
                  <Card className="overflow-hidden" key={`${movie.source}-${movie.id}`}>
                    <div className="relative aspect-[4/5] bg-slate-200">
                      {movie.cover ? (
                        <img
                          alt={`${movie.title} poster`}
                          className="size-full object-cover"
                          src={movie.cover}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-slate-900 text-center text-sm font-semibold text-white">
                          {movie.sourceLabel}
                        </div>
                      )}
                      <Badge className="absolute left-3 top-3 bg-white/90 text-slate-950 hover:bg-white/90">
                        {movie.source === "atmovies" ? "@movies" : `#${movie.id}`}
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-2 text-base leading-5">
                        {movie.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 flex flex-wrap gap-2">
                        {movie.categories.map((category) =>
                          movie.source === "scrape-center" ? (
                            <Link href={categoryHref(category)} key={`${movie.id}-${category}`}>
                              <Badge
                                className={
                                  category === activeCategory
                                    ? "bg-primary text-primary-foreground"
                                    : ""
                                }
                                variant={category === activeCategory ? "default" : "secondary"}
                              >
                                {category}
                              </Badge>
                            </Link>
                          ) : (
                            <Badge variant="secondary" key={`${movie.id}-${category}`}>
                              {category}
                            </Badge>
                          ),
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 text-sm text-muted-foreground">
                          {getMovieMeta(movie) || "欄位未提供"}
                        </p>
                        {movie.score ? (
                          <span className="flex items-center gap-1 text-sm font-semibold text-amber-700">
                            <Star className="size-4" />
                            {movie.score}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {movie.releaseDate ? `${movie.releaseDate} 上映` : "上映日期未提供"}
                      </p>
                      <Button asChild className="mt-4 w-full" variant="outline" size="sm">
                        <a href={movie.detailUrl} rel="noreferrer" target="_blank">
                          <ExternalLink className="mr-2 size-4" />
                          原始頁面
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <nav
                aria-label="Movies pagination"
                className="mt-6 flex flex-wrap items-center justify-center gap-2"
              >
                <Button asChild variant="outline">
                  <Link
                    aria-disabled={data.page <= 1}
                    className={data.page <= 1 ? "pointer-events-none opacity-45" : ""}
                    href={pageHref({
                      page: Math.max(1, data.page - 1),
                      category: activeCategory,
                      source,
                      view: data.atmoviesView,
                    })}
                  >
                    上一頁
                  </Link>
                </Button>

                {visiblePages[0] > 1 ? (
                  <>
                    <Button asChild variant={data.page === 1 ? "default" : "outline"} size="icon">
                      <Link
                        href={pageHref({
                          page: 1,
                          category: activeCategory,
                          source,
                          view: data.atmoviesView,
                        })}
                      >
                        1
                      </Link>
                    </Button>
                    <span className="px-1 text-sm text-muted-foreground">...</span>
                  </>
                ) : null}

                {visiblePages.map((page) => (
                  <Button
                    asChild
                    key={page}
                    variant={page === data.page ? "default" : "outline"}
                    size="icon"
                  >
                    <Link
                      href={pageHref({
                        page,
                        category: activeCategory,
                        source,
                        view: data.atmoviesView,
                      })}
                    >
                      {page}
                    </Link>
                  </Button>
                ))}

                {visiblePages[visiblePages.length - 1] < totalPages ? (
                  <>
                    <span className="px-1 text-sm text-muted-foreground">...</span>
                    <Button
                      asChild
                      variant={data.page === totalPages ? "default" : "outline"}
                      size="icon"
                    >
                      <Link
                        href={pageHref({
                          page: totalPages,
                          category: activeCategory,
                          source,
                          view: data.atmoviesView,
                        })}
                      >
                        {totalPages}
                      </Link>
                    </Button>
                  </>
                ) : null}

                <Button asChild variant="outline">
                  <Link
                    aria-disabled={data.page >= totalPages}
                    className={data.page >= totalPages ? "pointer-events-none opacity-45" : ""}
                    href={pageHref({
                      page: Math.min(totalPages, data.page + 1),
                      category: activeCategory,
                      source,
                      view: data.atmoviesView,
                    })}
                  >
                    下一頁
                  </Link>
                </Button>
              </nav>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>查詢任務</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {[
                  ["資料來源", data.sourceLabel, "啟用"],
                  ["目前頁碼", `Page ${data.page}`, "完成"],
                  ["資料模式", data.atmoviesView ?? activeCategory ?? "全部", "套用"],
                  [
                    "API",
                    `/api/movies?source=${data.source}&page=${data.page}${
                      data.source === "atmovies" ? `&view=${data.atmoviesView}` : ""
                    }${activeCategory ? `&category=${activeCategory}` : ""}`,
                    "可用",
                  ],
                ].map(([label, value, state]) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-md bg-muted p-4"
                    key={label}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{label}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{value}</p>
                    </div>
                    <Badge>{state}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </section>
      </div>
    </main>
  );
}
