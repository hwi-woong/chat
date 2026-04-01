"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Bot, FileSearch, LibraryBig, Sparkles, X } from "lucide-react"

import { previewChat } from "@/lib/api/admin-client"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface PreviewChatModalProps {
    isOpen: boolean
    onClose: () => void
}

interface Message {
    role: "user" | "assistant"
    content: string
    metadata?: PreviewMessageMetadata
}

interface PreviewReference {
    title?: string
}

interface PreviewChunk {
    content: string
    score?: number
}

interface PreviewMessageMetadata {
    references?: PreviewReference[]
    used_chunks?: PreviewChunk[]
}

function PreviewMetadata({ metadata }: { metadata?: PreviewMessageMetadata }) {
    if (!metadata) {
        return null
    }

    return (
        <div className="mt-3 space-y-3">
            {metadata.used_chunks && metadata.used_chunks.length > 0 && (
                <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-3.5">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-slate-500">
                        <FileSearch className="h-3.5 w-3.5 text-bon-burgundy" />
                        <span>사용 청크</span>
                    </div>
                    <div className="space-y-2">
                        {metadata.used_chunks.map((chunk, index) => (
                            <div key={`${chunk.content}-${index}`} className="rounded-2xl border border-white bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
                                <div className="line-clamp-3 leading-5">{chunk.content}</div>
                                <div className="mt-1 text-[11px] text-slate-400">
                                    점수: {chunk.score ?? "-"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {metadata.references && metadata.references.length > 0 && (
                <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-3.5">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-slate-500">
                        <LibraryBig className="h-3.5 w-3.5 text-bon-green-start" />
                        <span>참고 문서</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {metadata.references.map((ref, index) => (
                            <span
                                key={`${ref.title}-${index}`}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 shadow-sm"
                            >
                                {ref.title}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export function PreviewChatModal({ isOpen, onClose }: PreviewChatModalProps) {
    const [input, setInput] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (!isOpen) {
            setInput("")
            setMessages([])
            setLoading(false)
            return
        }

        setMessages([
            {
                role: "assistant",
                content: "프리뷰 모드입니다. 운영 규정이나 답변 품질을 점검할 질문을 입력해주세요."
            }
        ])
    }, [isOpen])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, [messages, loading])

    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return

        textarea.style.height = "0px"
        textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 56), 140)}px`
    }, [input, isOpen])

    const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!input.trim() || loading) return

        const question = input.trim()
        const userMsg: Message = { role: "user", content: question }
        setMessages((prev) => [...prev, userMsg])
        setInput("")
        setLoading(true)

        try {
            const data = await previewChat(question)

            const assistantMsg: Message = {
                role: "assistant",
                content: data.answer,
                metadata: {
                    references: data.references,
                    used_chunks: data.used_chunks
                }
            }

            setMessages((prev) => [...prev, assistantMsg])
        } catch (error) {
            const message = error instanceof Error ? error.message : "프리뷰 호출 중 오류가 발생했습니다."
            setMessages((prev) => [...prev, { role: "assistant", content: message }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            panelClassName="max-w-5xl overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(248,250,251,0.98),rgba(240,244,247,0.98))] p-0 shadow-[0_40px_100px_-40px_rgba(15,23,42,0.55)] sm:max-h-[calc(100dvh-2rem)] max-h-[calc(100dvh-1rem)]"
            bodyClassName="pt-0"
        >
            <div className="flex h-[min(88dvh,820px)] flex-col sm:h-[min(84dvh,820px)]">
                <div className="border-b border-white/70 bg-white/78 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100/90 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-500">
                                <Sparkles className="h-3.5 w-3.5 text-bon-burgundy" />
                                <span>PREVIEW LAB</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">챗봇 프리뷰</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                실제 응답 톤과 참조 문서를 모바일에서도 빠르게 점검할 수 있도록 정리했습니다.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                            aria-label="챗봇 프리뷰 닫기"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(247,249,251,0.82),rgba(239,243,246,0.94))] px-3 py-4 sm:px-6">
                    <div className="mx-auto max-w-3xl space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                                <div className={cn("max-w-[92%] sm:max-w-[84%]", msg.role === "user" && "order-2")}>
                                    <div
                                        className={cn(
                                            "rounded-[24px] px-4 py-3 text-sm shadow-[0_22px_50px_-38px_rgba(15,23,42,0.45)]",
                                            msg.role === "user"
                                                ? "rounded-br-lg bg-slate-900 text-white"
                                                : "rounded-bl-lg border border-white/80 bg-white/92 text-slate-800"
                                        )}
                                    >
                                        {msg.role === "assistant" && index === 0 && (
                                            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400">
                                                <Bot className="h-3.5 w-3.5 text-bon-green-start" />
                                                <span>ASSISTANT</span>
                                            </div>
                                        )}
                                        <div className="whitespace-pre-wrap leading-7">{msg.content}</div>
                                    </div>
                                    {msg.role === "assistant" && <PreviewMetadata metadata={msg.metadata} />}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="rounded-[24px] rounded-bl-lg border border-white/80 bg-white/92 px-4 py-3 text-sm text-slate-500 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.45)]">
                                    <div className="flex items-center gap-2">
                                        <Spinner size="sm" className="text-bon-green-start" />
                                        <span>답변 생성 중...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className="safe-area-bottom border-t border-white/70 bg-[linear-gradient(180deg,rgba(247,249,251,0.84),rgba(239,243,246,0.94))] px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
                    <form onSubmit={handleSend} className="mx-auto max-w-3xl">
                        <div className="rounded-[28px] border border-slate-200/80 bg-white/94 p-3 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:p-4">
                            <div className="mb-2 flex items-center justify-between gap-3 px-1">
                                <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
                                    TEST QUESTION
                                </div>
                                <div className="hidden text-[11px] text-slate-400 sm:block">
                                    Enter 전송 / Shift+Enter 줄바꿈
                                </div>
                            </div>

                            <div className="flex items-end gap-3">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(event) => setInput(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && !event.shiftKey) {
                                            event.preventDefault()
                                            if (event.nativeEvent.isComposing) return
                                            event.currentTarget.form?.requestSubmit()
                                        }
                                    }}
                                    placeholder="예: 배달 주문 지연 상황에서 매장 직원 응대 기준은 무엇인가요?"
                                    className="min-h-[56px] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-7 text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                    disabled={loading}
                                />
                                <Button
                                    type="submit"
                                    variant="gradient"
                                    size="icon"
                                    loading={loading}
                                    disabled={!input.trim()}
                                    className="mb-1 h-12 w-12 rounded-[1.25rem] ring-4 ring-white/80"
                                >
                                    <ArrowUp className="h-[18px] w-[18px]" />
                                    <span className="sr-only">프리뷰 질문 전송</span>
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>
    )
}
