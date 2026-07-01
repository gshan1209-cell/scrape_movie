"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: number;
  role: "bot" | "user";
  content: string;
};

const quickQuestions = ["🔎 如何篩選分類？", "🧩 API 怎麼使用？", "🎬 資料來源是哪裡？"];

function getBotReply(message: string) {
  const text = message.toLowerCase();

  if (message.includes("分類") || message.includes("篩選") || text.includes("category")) {
    return "🔎 可以點電影卡片上的分類標籤，也可以用清單上方的分類列喔 ✨ 網址會帶上 category 參數，例如 /?category=剧情。";
  }

  if (message.includes("分頁") || message.includes("頁") || text.includes("page")) {
    return "📚 列表下方有上一頁、頁碼與下一頁。API 也支援 page 參數，例如 /api/movies?page=2。";
  }

  if (message.includes("api") || message.includes("資料")) {
    return "🧩 目前可用 API 是 /api/movies。可以搭配 page 和 category，例如 /api/movies?page=1&category=%E5%89%A7%E6%83%85。";
  }

  if (message.includes("來源") || message.includes("網站") || text.includes("source")) {
    return "🎬 電影資料來源是 https://ssr1.scrape.center/。系統會在 Next.js server side 即時爬取並解析。";
  }

  if (message.includes("錯誤") || message.includes("失敗") || text.includes("error")) {
    return "💡 如果看到來源讀取失敗，通常是來源站暫時回應異常。分類篩選會略過壞頁，保留可取得的資料。";
  }

  return "✨ 我可以幫你查分頁、分類篩選、API 使用方式與資料來源。也可以直接點下方快捷問題喔。";
}

export function CustomerChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "bot",
      content: "嗨嗨 ✨ 我是 Scrape Movie 客服助手。想查分頁、分類篩選或 API 用法，都可以問我 🎬",
    },
  ]);
  const nextId = useRef(2);

  const latestMessages = useMemo(() => messages.slice(-8), [messages]);

  function sendMessage(content: string) {
    const trimmed = content.trim();

    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: nextId.current,
      role: "user",
      content: trimmed,
    };
    const botMessage: ChatMessage = {
      id: nextId.current + 1,
      role: "bot",
      content: getBotReply(trimmed),
    };

    nextId.current += 2;
    setMessages((current) => [...current, userMessage, botMessage]);
    setInput("");
    setIsOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {isOpen ? (
        <section className="w-[min(calc(100vw-2.5rem),380px)] overflow-hidden rounded-lg border bg-card text-card-foreground shadow-2xl">
          <header className="flex items-center justify-between border-b bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-md bg-amber-400 text-slate-950">
                <Bot className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">客服機器人 ✨</p>
                <p className="text-xs text-slate-300">Scrape Movie support</p>
              </div>
            </div>
            <Button
              aria-label="關閉客服機器人"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => setIsOpen(false)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </header>

          <div className="max-h-[360px] space-y-3 overflow-y-auto px-4 py-4">
            {latestMessages.map((message) => (
              <div
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                key={message.id}
              >
                <p
                  className={cn(
                    "max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {message.content}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t px-4 py-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickQuestions.map((question) => (
                <button
                  className="rounded-full border bg-background px-3 py-1 text-xs font-medium transition hover:bg-accent"
                  key={question}
                  onClick={() => sendMessage(question)}
                  type="button"
                >
                  {question}
                </button>
              ))}
            </div>

            <form className="flex items-center gap-2" onSubmit={handleSubmit}>
              <input
                className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setInput(event.target.value)}
                placeholder="輸入問題..."
                value={input}
              />
              <Button aria-label="送出訊息" size="icon" type="submit">
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </section>
      ) : null}

      <Button
        aria-label="開啟客服機器人"
        className="h-14 gap-2 rounded-full bg-amber-400 px-5 text-slate-950 shadow-xl hover:bg-amber-300"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isOpen ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        <span className="hidden sm:inline">客服 ✨</span>
        <Sparkles className="size-4" />
      </Button>
    </div>
  );
}
