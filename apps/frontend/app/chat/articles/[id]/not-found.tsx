import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";

export default function ChatArticleNotFoundPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8faf8_0%,#f1f5f2_100%)]">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-[2rem] border border-white/80 bg-white/90 p-8 text-center shadow-[0_32px_90px_-52px_rgba(15,23,42,0.4)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,rgba(129,190,57,0.15),rgba(70,126,14,0.18))] text-bon-green-start">
            <FileSearch className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
            문서를 찾을 수 없습니다
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            삭제되었거나 비공개 처리된 문서일 수 있습니다. 챗봇으로 돌아가 다른 관련 문서를 확인해주세요.
          </p>
          <Link
            href="/chat"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.45)] transition hover:border-bon-green-start/30 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            챗봇으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
