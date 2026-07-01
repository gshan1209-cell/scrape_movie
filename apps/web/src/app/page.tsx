import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Clapperboard,
  Clock3,
  Database,
  ExternalLink,
  Film,
  Filter,
  Search,
  ShieldCheck,
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

const sourceOptions = [
  { value: "scrape-center", label: "Scrape Center", href: "/" },
  { value: "atmovies", label: "@movies", href: "/?source=atmovies&view=new" },
];

const atMoviesViews: Array<{ value: AtMoviesView; label: string }> = [
  { value: "new", label: "本周新片" },
  { value: "now", label: "本期首輪" },
  { value: "next", label: "近期上映" },
];

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
      sourceLabel: safeSource === "atmovies" ? "@movies 開眼電影" : "Scrape Center",
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
  return `/?${new URLSearchParams({ category }).toString()}`;
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
  return [movie.region, movie.duration, movie.theaters].filter(Boolean).join(" / ");
}

function getModeLabel(source: string, view?: AtMoviesView, category?: string) {
  if (source === "atmovies") {
    return atMoviesViews.find((item) => item.value === view)?.label ?? "本周新片";
  }

  return category ?? "全部類別";
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
  const modeLabel = getModeLabel(source, data.atmoviesView, activeCategory);
  const apiHref = `/api/movies?source=${data.source}&page=${data.page}${
    data.source === "atmovies" ? `&view=${data.atmoviesView}` : ""
  }${activeCategory ? `&category=${encodeURIComponent(activeCategory)}` : ""}`;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="flex flex-col border-r border-slate-200/60 bg-slate-950 px-5 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <Clapperboard className="size-6" />
            </div>
            <div>
              <p className="font-semibold tracking-tight">Scrape Movie</p>
              <p className="text-xs text-slate-400">資料收集工作台</p>
            </div>
          </div>

          <div className="mt-8 flex-1">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              導覽
            </p>
            <nav className="grid gap-0.5">
              {[
                ["儀表板", Film],
                ["電影資料", Database],
                ["上映時程", CalendarDays],
                ["來源報表", BarChart3],
              ].map(([label, Icon], index) => (
                <a
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    index === 0
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                  href={index === 0 ? "/" : "#"}
                  key={label as string}
                >
                  <Icon className="size-4" />
                  {label as string}
                </a>
              ))}
            </nav>
          </div>

          <div className="mt-auto rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs font-medium text-slate-400">資料更新頻率</p>
            <p className="mt-0.5 text-sm text-slate-200">每次請求即時查詢</p>
          </div>
        </aside>

        {/* Main Content */}
        <section className="px-5 py-6 sm:px-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Movie scraping dashboard
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                電影資料收集工作台
              </h1>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-11 w-full rounded-lg border bg-white pl-10 pr-20 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                placeholder="搜尋電影..."
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 items-center gap-0.5 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium text-slate-400">
                Ctrl+K
              </kbd>
            </div>
          </header>

          {/* Hero Banner */}
          <section className="relative mt-7 overflow-hidden rounded-xl bg-slate-950">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.12),transparent_50%)]" />
            <div className="absolute -right-20 -top-20 hidden size-64 rounded-full bg-amber-400/5 blur-3xl lg:block" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

            <div className="relative grid gap-6 p-7 md:grid-cols-[1fr_320px] md:p-9">
              <div className="self-end">
                <Badge className="border-0 bg-amber-400/90 text-slate-950 hover:bg-amber-400 shadow-sm">
                  <ExternalLink className="mr-1.5 size-3" />
                  來源：{data.sourceLabel}
                </Badge>
                <h2 className="mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  查詢電影清單，
                  <br className="hidden sm:block" />
                  保留來源與合規邊界。
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                  目前顯示第 {data.page} / {totalPages} 頁，模式為 {modeLabel}，資料來源連回{" "}
                  <a
                    className="text-amber-400 underline-offset-2 hover:underline"
                    href={data.sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {data.sourceUrl}
                  </a>
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25 hover:bg-amber-300"
                  >
                    <a href={data.sourceUrl} rel="noreferrer" target="_blank">
                      <ExternalLink className="mr-2 size-4" />
                      開啟來源
                    </a>
                  </Button>
                  <Button asChild variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                    <Link href={apiHref}>
                      <Database className="mr-2 size-4" />
                      查看 API
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid self-end overflow-hidden rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
                {[
                  [data.movies.length.toString(), "本頁筆數", Database] as const,
                  [data.total.toString(), activeCategory ? "篩選後總數" : "來源總數", Film] as const,
                  [lastUpdated, "最後更新", Clock3] as const,
                ].map(([value, label, Icon]) => (
                  <div
                    className="flex items-center gap-4 border-b border-white/10 p-5 last:border-b-0"
                    key={label}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <Icon className="size-5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold leading-none">{value}</p>
                      <p className="mt-1 text-xs text-slate-400">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {data.notice ? (
            <Card className="mt-7 border-amber-200 bg-amber-50/70">
              <CardContent className="flex gap-3 p-4 text-sm leading-6 text-amber-800">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-500" />
                <span>{data.notice}</span>
              </CardContent>
            </Card>
          ) : null}

          {"error" in data ? (
            <Card className="mt-7 border-red-200 bg-red-50/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-red-800">資料讀取暫時失敗</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-red-600">{data.error}</CardContent>
            </Card>
          ) : null}

          <section className="mt-7 grid gap-6 xl:grid-cols-[1fr_340px]">
            <div>
              {/* Source Selector */}
              <Card className="mb-6 border-0 bg-white shadow-sm">
                <CardContent className="grid gap-5 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100">
                        <Database className="size-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">資料來源</p>
                        <p className="text-sm font-semibold">{data.sourceLabel}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                      {sourceOptions.map((option) => (
                        <Button
                          asChild
                          key={option.value}
                          variant={source === option.value ? "default" : "ghost"}
                          size="sm"
                          className={
                            source === option.value
                              ? "shadow-sm"
                              : "text-slate-500 hover:text-slate-900"
                          }
                        >
                          <Link href={option.href}>{option.label}</Link>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {source === "atmovies" ? (
                    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1">
                      {atMoviesViews.map((item) => (
                        <Button
                          asChild
                          key={item.value}
                          variant={data.atmoviesView === item.value ? "default" : "ghost"}
                          size="sm"
                          className={
                            data.atmoviesView === item.value
                              ? "shadow-sm"
                              : "text-slate-500 hover:text-slate-900"
                          }
                        >
                          <Link href={atMoviesHref(item.value)}>{item.label}</Link>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1">
                      <Button
                        asChild
                        variant={activeCategory ? "ghost" : "default"}
                        size="sm"
                        className={
                          activeCategory ? "text-slate-500 hover:text-slate-900" : "shadow-sm"
                        }
                      >
                        <Link href="/">全部</Link>
                      </Button>
                      {data.categories.map((category) => (
                        <Button
                          asChild
                          key={category}
                          variant={category === activeCategory ? "default" : "ghost"}
                          size="sm"
                          className={
                            category === activeCategory
                              ? "shadow-sm"
                              : "text-slate-500 hover:text-slate-900"
                          }
                        >
                          <Link href={categoryHref(category)}>{category}</Link>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Movie List Header */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">電影清單</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    每頁最多顯示 {data.pageSize} 筆，點擊卡片按鈕可回到原始頁面。
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1.5 text-xs font-medium">
                  <Filter className="size-3" />
                  {modeLabel}
                </Badge>
              </div>

              {/* Movie Cards */}
              {data.movies.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  {data.movies.map((movie) => (
                    <Card
                      className="group overflow-hidden border-0 bg-white shadow-md shadow-slate-200/50 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-200/70"
                      key={`${movie.source}-${movie.id}`}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                        {movie.cover ? (
                          <img
                            alt={`${movie.title} poster`}
                            className="size-full object-cover transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-1 group-hover:shadow-2xl"
                            loading="lazy"
                            src={movie.cover}
                          />
                        ) : (
                          <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 px-4 text-center">
                            <Film className="size-8 text-slate-600" />
                            <span className="text-xs font-medium text-slate-400">
                              {movie.sourceLabel}
                            </span>
                          </div>
                        )}
                        <Badge className="absolute left-3 top-3 border-0 bg-white/90 text-slate-950 shadow-sm backdrop-blur-sm hover:bg-white">
                          {movie.source === "atmovies" ? "@movies" : `#${movie.id}`}
                        </Badge>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="line-clamp-2 min-h-[2.5rem] text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-amber-600">
                          {movie.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-5">
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {movie.categories.map((category) =>
                            movie.source === "scrape-center" ? (
                              <Link href={categoryHref(category)} key={`${movie.id}-${category}`}>
                                <Badge
                                  className={`transition-colors hover:bg-slate-200 ${
                                    category === activeCategory
                                      ? "bg-slate-950 text-white hover:bg-slate-800"
                                      : "text-slate-600"
                                  }`}
                                  variant={category === activeCategory ? "default" : "secondary"}
                                >
                                  {category}
                                </Badge>
                              </Link>
                            ) : (
                              <Badge
                                className="text-slate-600"
                                variant="secondary"
                                key={`${movie.id}-${category}`}
                              >
                                {category}
                              </Badge>
                            ),
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 text-xs leading-5 text-slate-500">
                            {getMovieMeta(movie) || "尚無補充資訊"}
                          </p>
                          {movie.score ? (
                            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              <Star className="size-3 fill-amber-500 text-amber-500" />
                              {movie.score}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock3 className="size-3" />
                          {movie.releaseDate ? `${movie.releaseDate} 上映` : "上映日期尚未提供"}
                        </div>
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
              ) : (
                <Card className="border-0 bg-white shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-slate-100">
                      <Database className="size-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold">目前沒有可顯示的電影資料</h3>
                    <p className="max-w-md text-sm leading-6 text-slate-500">
                      來源可能暫時無法連線，或此頁沒有資料。可以切換來源、類別或頁碼再試一次。
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Pagination */}
              <nav aria-label="Movies pagination" className="mt-8">
                <p className="mb-4 text-center text-sm text-slate-500">
                  第 <span className="font-semibold text-slate-900">{data.page}</span> 頁，共{" "}
                  <span className="font-semibold text-slate-900">{totalPages}</span> 頁
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <Button asChild variant="outline" size="sm">
                    <Link
                      aria-disabled={data.page <= 1}
                      className={data.page <= 1 ? "pointer-events-none opacity-40" : ""}
                      href={pageHref({
                        page: Math.max(1, data.page - 1),
                        category: activeCategory,
                        source,
                        view: data.atmoviesView,
                      })}
                    >
                      <span className="hidden sm:inline">上一頁</span>
                      <span className="sm:hidden">←</span>
                    </Link>
                  </Button>

                  {visiblePages[0] > 1 ? (
                    <>
                      <Button
                        asChild
                        variant={data.page === 1 ? "default" : "outline"}
                        size="icon"
                        className="size-9"
                      >
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
                      <span className="px-0.5 text-sm text-slate-400">...</span>
                    </>
                  ) : null}

                  {visiblePages.map((page) => (
                    <Button
                      asChild
                      key={page}
                      variant={page === data.page ? "default" : "outline"}
                      size="icon"
                      className="size-9"
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
                      <span className="px-0.5 text-sm text-slate-400">...</span>
                      <Button
                        asChild
                        variant={data.page === totalPages ? "default" : "outline"}
                        size="icon"
                        className="size-9"
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

                  <Button asChild variant="outline" size="sm">
                    <Link
                      aria-disabled={data.page >= totalPages}
                      className={data.page >= totalPages ? "pointer-events-none opacity-40" : ""}
                      href={pageHref({
                        page: Math.min(totalPages, data.page + 1),
                        category: activeCategory,
                        source,
                        view: data.atmoviesView,
                      })}
                    >
                      <span className="hidden sm:inline">下一頁</span>
                      <span className="sm:hidden">→</span>
                    </Link>
                  </Button>
                </div>
              </nav>
            </div>

            {/* Right Sidebar - Task Info */}
            <Card className="sticky top-6 h-fit border-0 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex size-7 items-center justify-center rounded-md bg-slate-100">
                    <BarChart3 className="size-3.5 text-slate-500" />
                  </div>
                  查詢任務
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {[
                  ["資料來源", data.sourceLabel],
                  ["目前頁碼", `第 ${data.page} 頁`],
                  ["查詢模式", modeLabel],
                  ["最後更新", lastUpdated],
                ].map(([label, value]) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3"
                    key={label}
                  >
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="truncate text-sm font-semibold">{value}</p>
                  </div>
                ))}

                <div className="mt-2 rounded-lg border bg-slate-50 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Clock3 className="size-3" />
                    API 路徑
                  </div>
                  <p className="break-all font-mono text-xs leading-relaxed text-slate-500">
                    {apiHref}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </section>
      </div>
    </main>
  );
}
