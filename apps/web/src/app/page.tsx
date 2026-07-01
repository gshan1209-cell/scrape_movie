import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Clapperboard,
  Database,
  Download,
  Film,
  Play,
  Search,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getScrapeCenterMovies, type ScrapeCenterMovie } from "@/lib/scrape-center";

export const dynamic = "force-dynamic";

const sourceUrl = "https://ssr1.scrape.center/";
const pageSize = 10;

type HomeProps = {
  searchParams?: Promise<{
    page?: string;
    category?: string;
  }>;
};

function getSafePage(value?: string) {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

async function loadMovies(page: number, category?: string) {
  try {
    return await getScrapeCenterMovies(page, category);
  } catch (error) {
    return {
      source: sourceUrl,
      page,
      total: 0,
      movies: [] as ScrapeCenterMovie[],
      categories: [],
      filteredBy: category,
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unable to fetch source",
    };
  }
}

function pageHref(page: number, category?: string) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  if (category) {
    params.set("category", category);
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function categoryHref(category: string) {
  const params = new URLSearchParams({ category });
  return `/?${params.toString()}`;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const activeCategory = params?.category?.trim() || undefined;
  const currentPage = getSafePage(params?.page);
  const data = await loadMovies(currentPage, activeCategory);
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
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
                  來源：ssr1.scrape.center
                </Badge>
                <h2 className="mt-5 max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl">
                  即時爬取 SSR 電影清單與評分資料。
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                  目前顯示第 {data.page} / {totalPages} 頁
                  {activeCategory ? `，分類：${activeCategory}` : ""}，資料從 {sourceUrl} 擷取。
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                    <Play className="mr-2 size-4" />
                    開始爬取
                  </Button>
                  <Button variant="secondary">
                    <Download className="mr-2 size-4" />
                    匯出資料
                  </Button>
                </div>
              </div>

              <div className="grid self-end overflow-hidden rounded-md border border-white/15 bg-white/10">
                {[
                  [data.movies.length.toString(), "本頁筆數"],
                  [data.total.toString(), activeCategory ? "篩選結果" : "來源總筆數"],
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

          <section className="mt-7 grid gap-6 xl:grid-cols-[1fr_340px]">
            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">爬取電影清單</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    第 {data.page} 頁，每頁 {pageSize} 筆
                  </p>
                </div>
                <Button variant="outline" size="icon" aria-label="Refresh">
                  <BarChart3 className="size-4" />
                </Button>
              </div>

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

              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                {data.movies.map((movie) => (
                  <Card className="overflow-hidden" key={movie.id}>
                    <div className="relative aspect-[4/5] bg-slate-200">
                      <img
                        alt={`${movie.title} poster`}
                        className="size-full object-cover"
                        src={movie.cover}
                      />
                      <Badge className="absolute left-3 top-3 bg-white/90 text-slate-950 hover:bg-white/90">
                        #{movie.id}
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-2 text-base leading-5">
                        {movie.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 flex flex-wrap gap-2">
                        {movie.categories.map((category) => (
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
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 text-sm text-muted-foreground">
                          {movie.region || "未知地區"} · {movie.duration || "未知片長"}
                        </p>
                        <span className="flex items-center gap-1 text-sm font-semibold text-amber-700">
                          <Star className="size-4" />
                          {movie.score || "-"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {movie.releaseDate ? `${movie.releaseDate} 上映` : "上映日期未提供"}
                      </p>
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
                    href={pageHref(Math.max(1, data.page - 1), activeCategory)}
                  >
                    上一頁
                  </Link>
                </Button>

                {visiblePages[0] > 1 ? (
                  <>
                    <Button asChild variant={data.page === 1 ? "default" : "outline"} size="icon">
                      <Link href={pageHref(1, activeCategory)}>1</Link>
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
                    <Link href={pageHref(page, activeCategory)}>{page}</Link>
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
                      <Link href={pageHref(totalPages, activeCategory)}>{totalPages}</Link>
                    </Button>
                  </>
                ) : null}

                <Button asChild variant="outline">
                  <Link
                    aria-disabled={data.page >= totalPages}
                    className={data.page >= totalPages ? "pointer-events-none opacity-45" : ""}
                    href={pageHref(Math.min(totalPages, data.page + 1), activeCategory)}
                  >
                    下一頁
                  </Link>
                </Button>
              </nav>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>爬取任務</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {[
                  ["資料來源", sourceUrl, "啟用"],
                  ["目前頁碼", `Page ${data.page}`, "完成"],
                  ["分類篩選", activeCategory ?? "全部", activeCategory ? "套用" : "未套用"],
                  [
                    "API",
                    `/api/movies?page=${data.page}${activeCategory ? `&category=${activeCategory}` : ""}`,
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
