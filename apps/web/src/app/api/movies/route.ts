import { NextResponse } from "next/server";

import { getScrapeCenterMovies } from "@/lib/scrape-center";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const category = searchParams.get("category")?.trim() || undefined;
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;

  try {
    const data = await getScrapeCenterMovies(safePage, category);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to scrape movie source",
      },
      { status: 502 },
    );
  }
}
