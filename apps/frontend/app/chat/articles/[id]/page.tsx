import Link from "next/link";
import { ArrowLeft, ChevronRight, FileText, ShieldCheck } from "lucide-react";
import type { ArticleDetail } from "@bon/contracts";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { fetchBackendWithServerCookies } from "@/lib/server/backend-client";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

async function getArticle(id: string): Promise<ArticleDetail> {
  const response = await fetchBackendWithServerCookies(`/user/articles/${id}`);

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("문서를 불러오지 못했습니다.");
  }

  return response.json() as Promise<ArticleDetail>;
}

export default async function ChatArticleDetailPage({ params }: Params) {
  const { id } = await params;
  const article = await getArticle(id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(137,194,72,0.12),transparent_32%),linear-gradient(180deg,#f8faf8_0%,#f3f6f3_42%,#eef2ef_100%)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
        <div className="overflow-hidden rounded-[2rem] border border-white/75 bg-white/88 shadow-[0_36px_90px_-54px_rgba(15,23,42,0.42)] backdrop-blur-xl">
          <div className="border-b border-slate-200/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,248,241,0.92))] px-5 py-5 md:px-8 md:py-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-slate-600 transition hover:border-bon-green-start/30 hover:text-slate-900"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    챗봇으로 돌아가기
                  </Link>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,rgba(129,190,57,0.14),rgba(70,126,14,0.16))] px-3 py-1.5 text-bon-green-start">
                    <FileText className="h-3.5 w-3.5" />
                    관련 문서
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                      {article.category_name}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                    <span className="font-semibold uppercase tracking-[0.14em] text-bon-green-start">
                      {article.category_code}
                    </span>
                    {article.requires_sm && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        SM 확인 필요
                      </span>
                    )}
                  </div>

                  <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-[2.6rem] md:leading-[1.1]">
                    {article.title}
                  </h1>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 md:px-8 md:py-8">
            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] md:px-8 md:py-8">
              <MarkdownContent
                content={article.content}
                className="space-y-4 text-[15px] leading-7 md:text-base"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
