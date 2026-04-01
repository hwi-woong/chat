"use client"

import { FileText, MessageSquareText, Store, X } from "lucide-react"

import type { ChatSessionListItem, ChatSessionMessageItem } from "@bon/contracts"
import type { Branch } from "@/types"
import { Modal } from "@/components/ui/modal"
import { Spinner } from "@/components/ui/spinner"
import { formatKoreanDateTime } from "@/lib/date"

interface ChatSessionDetailModalProps {
    branch: Branch | null
    isOpen: boolean
    loading: boolean
    messages: ChatSessionMessageItem[]
    onClose: () => void
    session: ChatSessionListItem | null
}

export function ChatSessionDetailModal({
    branch,
    isOpen,
    loading,
    messages,
    onClose,
    session
}: ChatSessionDetailModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            panelClassName="max-w-4xl overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(248,250,251,0.98),rgba(240,244,247,0.98))] p-0 shadow-[0_40px_100px_-40px_rgba(15,23,42,0.55)]"
            bodyClassName="pt-0"
        >
            <div className="flex h-[min(78dvh,760px)] flex-col">
                <div className="border-b border-slate-200/80 bg-white/70 px-6 py-5 backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 pr-2">
                            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 shadow-sm">
                                    <Store className="h-3.5 w-3.5 text-bon-burgundy" />
                                    {branch?.name ?? "지점"}
                                </span>
                                {branch?.code && (
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                        {branch.code}
                                    </span>
                                )}
                                {session?.last_message_at && (
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                        {formatKoreanDateTime(session.last_message_at)}
                                    </span>
                                )}
                            </div>
                            <h2 className="line-clamp-2 text-xl font-bold text-slate-950">
                                {session?.title?.trim() || "새 대화"}
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                세션의 전체 대화 내용을 시간순으로 확인합니다.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                            aria-label="세션 모달 닫기"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                                <Spinner size="sm" className="text-bon-green-start" />
                                메시지를 불러오는 중...
                            </div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-6 py-8 text-center shadow-sm">
                                <MessageSquareText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                                <p className="text-sm text-slate-500">표시할 메시지가 없습니다.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto max-w-3xl space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[88%] rounded-[24px] px-4 py-3 text-sm shadow-[0_22px_50px_-38px_rgba(15,23,42,0.45)] ${
                                            message.role === "user"
                                                ? "rounded-br-lg bg-slate-900 text-white"
                                                : "rounded-bl-lg border border-white/80 bg-white/92 text-slate-800"
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap leading-7">{message.content}</div>
                                        {message.references && message.references.length > 0 && (
                                            <div className="mt-3 border-t border-slate-100 pt-3">
                                                <p className="mb-2 text-xs font-semibold text-slate-500">참고 문서</p>
                                                <div className="space-y-2">
                                                    {message.references.map((reference, index) => (
                                                        <div
                                                            key={`${reference.article_id}-${index}`}
                                                            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                                                        >
                                                            <FileText className="h-3.5 w-3.5 shrink-0 text-bon-green-start" />
                                                            <span className="truncate">
                                                                [{reference.category_code}] {reference.title}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
