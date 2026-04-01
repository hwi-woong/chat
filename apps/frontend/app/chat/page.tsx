"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, ArrowUp, Bot, CornerDownLeft, FileText, Plus, ShieldCheck, Sparkles } from "lucide-react"

import type { ChatSessionListItem, ChatSessionMessageItem } from "@bon/contracts"
import { LogoutButton } from "@/components/auth/logout-button"
import { useRequireAuth } from "@/components/auth/auth-provider"
import { MobileChatLayout } from "@/components/chat/mobile-chat-layout"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/toast"
import { createChatSession, getChatSessionMessages, getChatSessions, openChatStream } from "@/lib/api/chat-client"
import { formatKoreanDateTime } from "@/lib/date"
import { cn } from "@/lib/utils"
import type { Message } from "@/types"

const DESKTOP_TEXTAREA_MIN_HEIGHT = 72
const DESKTOP_TEXTAREA_MAX_HEIGHT = 220
const MOBILE_TEXTAREA_MIN_HEIGHT = 52
const MOBILE_TEXTAREA_MAX_HEIGHT = 144
const CHAT_CANVAS_BG = "bg-[linear-gradient(180deg,rgba(247,249,251,0.82),rgba(239,243,246,0.94))]"
const SIDEBAR_BG = "bg-[linear-gradient(180deg,rgba(239,243,246,0.84),rgba(231,236,240,0.94))]"
const HEADER_BG = "bg-[linear-gradient(180deg,rgba(250,251,252,0.78),rgba(243,246,248,0.9))]"

function mapChatMessage(message: ChatSessionMessageItem): Message {
    return {
        id: String(message.id),
        role: message.role,
        content: message.content,
        references: message.references ?? undefined
    }
}

function formatSessionLabel(session: ChatSessionListItem) {
    return session.title?.trim() || "새 대화"
}

type ChatStreamMeta = {
    session_id?: number
    references?: Message["references"]
}

type ChatStreamChunk = {
    text?: string
}

type ChatStreamEvent =
    | { type: "meta"; data: ChatStreamMeta }
    | { type: "chunk"; data: ChatStreamChunk }
    | { type: "error"; data: { message?: string } | string }

type ResizeOptions = {
    minHeight: number
    maxHeight: number
}

type ChatTranscriptProps = {
    compact?: boolean
    loading: boolean
    messages: Message[]
    messagesLoading: boolean
    messagesEndRef: React.RefObject<HTMLDivElement | null>
}

type ChatComposerProps = {
    compact?: boolean
    disabled: boolean
    formRef: React.RefObject<HTMLFormElement | null>
    loading: boolean
    onChange: (value: string) => void
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
    textareaRef: React.RefObject<HTMLTextAreaElement | null>
    value: string
}

function extractSseEvents(buffer: string): { events: ChatStreamEvent[]; rest: string } {
    const blocks = buffer.split("\n\n")
    const rest = blocks.pop() || ""
    const events: ChatStreamEvent[] = []

    for (const block of blocks) {
        const parsed = parseSseEvent(block)
        if (parsed) {
            events.push(parsed)
        }
    }

    return { events, rest }
}

function parseSseEvent(block: string): ChatStreamEvent | null {
    const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    const eventLine = lines.find((line) => line.startsWith("event:"))
    const dataLines = lines.filter((line) => line.startsWith("data:"))

    if (!eventLine || dataLines.length === 0) {
        return null
    }

    const eventType = eventLine.slice("event:".length).trim()
    const rawData = dataLines.map((line) => line.slice("data:".length).trim()).join("\n")

    if (!rawData) {
        return null
    }

    if (eventType === "meta") {
        return { type: "meta", data: JSON.parse(rawData) as ChatStreamMeta }
    }

    if (eventType === "chunk") {
        return { type: "chunk", data: JSON.parse(rawData) as ChatStreamChunk }
    }

    if (eventType === "error") {
        try {
            return { type: "error", data: JSON.parse(rawData) as { message?: string } }
        } catch {
            return { type: "error", data: rawData }
        }
    }

    return null
}

function resizeTextarea(textarea: HTMLTextAreaElement | null, options: ResizeOptions) {
    if (!textarea) {
        return options.minHeight
    }

    textarea.style.height = "0px"
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, options.minHeight), options.maxHeight)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > options.maxHeight ? "auto" : "hidden"

    return nextHeight
}

function LoadingNotice({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner size="sm" className="text-bon-green-start" />
            <span>{label}</span>
        </div>
    )
}

function TypingIndicator() {
    return (
        <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner size="sm" className="text-bon-green-start" />
            <span>답변을 정리하고 있습니다...</span>
        </div>
    )
}

function ChatEmptyState({ compact = false }: { compact?: boolean }) {
    return (
        <div className={cn("flex h-full items-center justify-center", compact && "px-6")}>
            <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.75rem] border border-white/80 bg-white/90 shadow-[0_24px_48px_-30px_rgba(15,23,42,0.4)]">
                    <Bot className="h-8 w-8 text-bon-green-start" />
                </div>
                <p className="mb-2 text-lg font-semibold text-slate-900">무엇을 도와드릴까요?</p>
                <p className="text-sm leading-6 text-slate-500">
                    운영 규정, 발주, 위생, 응대 기준 등 매장 운영과 관련된 질문을 입력해주세요.
                </p>
            </div>
        </div>
    )
}

function MessageSkeleton({ compact = false }: { compact?: boolean }) {
    const items = compact ? [0, 1, 2] : [0, 1, 2, 3]

    return (
        <div className={cn("mx-auto w-full", compact ? "space-y-3" : "max-w-4xl space-y-4")}>
            {items.map((item) => (
                <div key={item} className={cn("flex", item % 2 === 0 ? "justify-start" : "justify-end")}>
                    <div
                        className={cn(
                            "animate-message-rise overflow-hidden rounded-[26px] border border-white/70 bg-white/90 p-4 shadow-[0_28px_64px_-44px_rgba(15,23,42,0.45)]",
                            compact ? "max-w-[88%]" : "max-w-[72%]"
                        )}
                    >
                        <div className="space-y-2">
                            <div className="animate-shimmer h-3 rounded-full bg-[linear-gradient(90deg,rgba(226,232,240,0.75),rgba(255,255,255,0.95),rgba(226,232,240,0.75))]" />
                            <div className="animate-shimmer h-3 w-[82%] rounded-full bg-[linear-gradient(90deg,rgba(226,232,240,0.75),rgba(255,255,255,0.95),rgba(226,232,240,0.75))]" />
                            <div className="animate-shimmer h-3 w-[58%] rounded-full bg-[linear-gradient(90deg,rgba(226,232,240,0.75),rgba(255,255,255,0.95),rgba(226,232,240,0.75))]" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function ChatTranscript({
    compact = false,
    loading,
    messages,
    messagesLoading,
    messagesEndRef
}: ChatTranscriptProps) {
    if (messagesLoading) {
        return <MessageSkeleton compact={compact} />
    }

    if (messages.length === 0) {
        return <ChatEmptyState compact={compact} />
    }

    return (
        <div className={cn("mx-auto w-full", compact ? "space-y-3" : "max-w-4xl space-y-4")}>
            {messages.map((msg, idx) => (
                <div
                    key={msg.id ?? idx}
                    className={cn("flex animate-message-rise", msg.role === "user" ? "justify-end" : "justify-start")}
                    style={{ animationDelay: `${Math.min(idx, 6) * 40}ms` }}
                >
                    <div className={cn(compact ? "max-w-[88%]" : "max-w-[78%]", msg.role === "user" && "order-2")}>
                        <div
                            className={cn(
                                "relative overflow-hidden rounded-[26px] border px-4 py-3.5 shadow-[0_28px_64px_-44px_rgba(15,23,42,0.45)]",
                                compact ? "text-[15px] leading-6" : "text-[15px] leading-7",
                                msg.role === "user"
                                    ? "rounded-br-lg border-bon-green-start/10 bg-gradient-to-br from-bon-green-start via-[#6fb230] to-bon-green-end text-white"
                                    : "rounded-bl-lg border-white/70 bg-white/92 text-slate-800"
                            )}
                        >
                            {msg.role === "assistant" && msg.content === "" && loading ? (
                                <TypingIndicator />
                            ) : (
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
                        </div>
                        {msg.references && msg.references.length > 0 && (
                            <div className="mt-2 space-y-2">
                                {msg.references.map((ref, index) => (
                                    <Link
                                        key={`${ref.article_id}-${index}`}
                                        href={`/chat/articles/${ref.article_id}`}
                                        className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/92 px-3 py-3 text-xs text-slate-600 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.38)] transition duration-200 hover:-translate-y-0.5 hover:border-bon-green-start/35 hover:shadow-[0_24px_40px_-28px_rgba(95,162,36,0.32)]"
                                    >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(129,190,57,0.14),rgba(70,126,14,0.16))] text-bon-green-start">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-bon-green-start/80">
                                                {ref.category_code}
                                            </p>
                                            <p className="truncate text-sm font-medium text-slate-800">
                                                {ref.title || "관련 문서 보기"}
                                            </p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-bon-green-start" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    )
}

function ChatComposer({
    compact = false,
    disabled,
    formRef,
    loading,
    onChange,
    onSubmit,
    textareaRef,
    value
}: ChatComposerProps) {
    return (
        <form ref={formRef} onSubmit={onSubmit} className={cn("w-full", !compact && "mx-auto max-w-4xl")}>
            <div
                className={cn(
                    "group relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/94 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.38)] backdrop-blur-xl transition-[border-color,box-shadow,transform] duration-200",
                    compact ? "px-3 pb-3 pt-3" : "px-4 pb-4 pt-3.5",
                    !disabled && "focus-within:-translate-y-0.5 focus-within:border-bon-green-start/40 focus-within:shadow-[0_36px_90px_-44px_rgba(95,162,36,0.34)]"
                )}
            >
                <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-bon-green-start/60 to-transparent" />
                {!compact && (
                    <div className="mb-2 flex items-center justify-between gap-3 px-1">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100/90 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-500">
                            <Sparkles className="h-3.5 w-3.5 text-bon-green-start" />
                            <span>운영 도우미</span>
                        </div>
                        <div className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
                            <CornerDownLeft className="h-3.5 w-3.5" />
                            <span>Enter 전송</span>
                            <span className="text-slate-300">/</span>
                            <span>Shift + Enter 줄바꿈</span>
                        </div>
                    </div>
                )}

                <div className="flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                        <textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(event) => onChange(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault()
                                    if (event.nativeEvent.isComposing) return
                                    formRef.current?.requestSubmit()
                                }
                            }}
                            placeholder="운영 매뉴얼과 관련한 질문을 입력하세요"
                            className={cn(
                                "w-full resize-none bg-transparent px-1 text-slate-900 placeholder:text-slate-400 focus:outline-none",
                                compact ? "min-h-[52px] pt-1 text-[15px] leading-6" : "min-h-[72px] pt-2 text-[15px] leading-7"
                            )}
                            disabled={disabled}
                        />

                        <div
                            className={cn(
                                "mt-3 flex items-center justify-between gap-3 px-1 text-slate-400",
                                compact ? "text-[11px]" : "text-xs"
                            )}
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-bon-green-start" />
                                <span className="truncate">운영 매뉴얼 기준으로 답변합니다</span>
                            </div>
                            {compact && <span className="shrink-0">Shift+Enter 줄바꿈</span>}
                        </div>
                    </div>

                    <Button
                        type="submit"
                        size={compact ? "icon" : "icon-lg"}
                        variant="gradient"
                        loading={loading}
                        disabled={!value.trim() || disabled}
                        className={cn(
                            "mb-1 shrink-0 rounded-[1.5rem] ring-4 ring-white/80",
                            compact ? "h-12 w-12" : "h-14 w-14"
                        )}
                    >
                        <ArrowUp className={cn(compact ? "h-[18px] w-[18px]" : "h-5 w-5")} />
                        <span className="sr-only">메시지 전송</span>
                    </Button>
                </div>
            </div>
        </form>
    )
}

export default function ChatPage() {
    const { showToast } = useToast()
    const [input, setInput] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [sessions, setSessions] = useState<ChatSessionListItem[]>([])
    const [loading, setLoading] = useState(false)
    const [startingNewChat, setStartingNewChat] = useState(false)
    const [sessionsLoading, setSessionsLoading] = useState(true)
    const [messagesLoading, setMessagesLoading] = useState(false)
    const [sessionId, setSessionId] = useState<number | null>(null)
    const [mobileInputHeight, setMobileInputHeight] = useState(MOBILE_TEXTAREA_MIN_HEIGHT)

    const desktopFormRef = useRef<HTMLFormElement>(null)
    const mobileFormRef = useRef<HTMLFormElement>(null)
    const desktopMessagesEndRef = useRef<HTMLDivElement>(null)
    const mobileMessagesEndRef = useRef<HTMLDivElement>(null)
    const desktopTextareaRef = useRef<HTMLTextAreaElement>(null)
    const mobileTextareaRef = useRef<HTMLTextAreaElement>(null)
    const sessionListRequestRef = useRef(0)
    const messageRequestRef = useRef(0)
    const selectedSessionIdRef = useRef<number | null>(null)

    const { isAuthorized, isLoading } = useRequireAuth({
        requiredRole: "user",
        forbiddenMessage: "지점 계정만 접근 가능합니다."
    })

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            resizeTextarea(desktopTextareaRef.current, {
                minHeight: DESKTOP_TEXTAREA_MIN_HEIGHT,
                maxHeight: DESKTOP_TEXTAREA_MAX_HEIGHT
            })
            const nextMobileHeight = resizeTextarea(mobileTextareaRef.current, {
                minHeight: MOBILE_TEXTAREA_MIN_HEIGHT,
                maxHeight: MOBILE_TEXTAREA_MAX_HEIGHT
            })
            setMobileInputHeight((current) => (current === nextMobileHeight ? current : nextMobileHeight))
        })

        return () => window.cancelAnimationFrame(frame)
    }, [input])

    useEffect(() => {
        desktopMessagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
        mobileMessagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, [messages])

    useEffect(() => {
        selectedSessionIdRef.current = sessionId
    }, [sessionId])

    const loadSession = useCallback(async (targetSessionId: number) => {
        const requestId = ++messageRequestRef.current
        setMessagesLoading(true)
        setSessionId(targetSessionId)

        try {
            const nextMessages = await getChatSessionMessages(targetSessionId) as ChatSessionMessageItem[]
            if (requestId !== messageRequestRef.current) return
            setMessages(nextMessages.map(mapChatMessage))
        } catch (error) {
            if (requestId !== messageRequestRef.current) return
            showToast(error instanceof Error ? error.message : "오류가 발생했습니다.", "error")
        } finally {
            if (requestId === messageRequestRef.current) {
                setMessagesLoading(false)
            }
        }
    }, [showToast])

    const fetchSessions = useCallback(async (nextSessionId?: number | null) => {
        const requestId = ++sessionListRequestRef.current
        setSessionsLoading(true)

        try {
            const nextSessions = await getChatSessions() as ChatSessionListItem[]
            if (requestId !== sessionListRequestRef.current) return

            setSessions(nextSessions)

            const preferredSessionId = nextSessionId ?? selectedSessionIdRef.current
            if (preferredSessionId) {
                const exists = nextSessions.some((session) => session.id === preferredSessionId)
                if (exists) {
                    await loadSession(preferredSessionId)
                    return
                }
            }

            if (nextSessions.length > 0) {
                await loadSession(nextSessions[0].id)
                return
            }

            messageRequestRef.current += 1
            setSessionId(null)
            setMessages([])
            setMessagesLoading(false)
        } catch (error) {
            if (requestId !== sessionListRequestRef.current) return
            showToast(error instanceof Error ? error.message : "오류가 발생했습니다.", "error")
        } finally {
            if (requestId === sessionListRequestRef.current) {
                setSessionsLoading(false)
            }
        }
    }, [loadSession, showToast])

    useEffect(() => {
        if (!isAuthorized) return
        void fetchSessions()
    }, [fetchSessions, isAuthorized])

    const handleStartNewChat = useCallback(async () => {
        if (loading || startingNewChat) return

        sessionListRequestRef.current += 1
        messageRequestRef.current += 1
        setSessionsLoading(false)
        setMessagesLoading(false)
        setSessionId(null)
        setMessages([])
        setInput("")
        setStartingNewChat(true)

        try {
            const createdSession = await createChatSession()
            setSessions((prev) => [
                createdSession,
                ...prev.filter((session) => session.id !== createdSession.id)
            ])
            setSessionId(createdSession.id)
        } catch (error) {
            showToast(error instanceof Error ? error.message : "오류가 발생했습니다.", "error")
        } finally {
            setStartingNewChat(false)
        }
    }, [loading, showToast, startingNewChat])

    const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!input.trim() || loading || startingNewChat || !isAuthorized) return

        const question = input.trim()
        const userMsg: Message = { role: "user", content: question }
        const assistantMsgId = Date.now().toString()

        setMessages((prev) => [
            ...prev,
            userMsg,
            { role: "assistant", content: "", id: assistantMsgId }
        ])
        setInput("")
        setLoading(true)

        try {
            const response = await openChatStream({ question, session_id: sessionId ?? undefined })
            if (!response.body) {
                throw new Error("스트림 응답을 읽을 수 없습니다.")
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ""
            let resolvedSessionId = sessionId

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const parsed = extractSseEvents(buffer)
                buffer = parsed.rest

                for (const eventItem of parsed.events) {
                    if (eventItem.type === "meta") {
                        if (eventItem.data.session_id) {
                            resolvedSessionId = eventItem.data.session_id
                            setSessionId(eventItem.data.session_id)
                        }
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === assistantMsgId ? { ...msg, references: eventItem.data.references } : msg
                            )
                        )
                    } else if (eventItem.type === "chunk") {
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === assistantMsgId
                                    ? { ...msg, content: msg.content + (eventItem.data.text || "") }
                                    : msg
                            )
                        )
                    } else if (eventItem.type === "error") {
                        const message = typeof eventItem.data === "string"
                            ? eventItem.data
                            : eventItem.data.message || "스트림 처리 중 오류가 발생했습니다."
                        throw new Error(message)
                    }
                }
            }

            await fetchSessions(resolvedSessionId)
        } catch {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMsgId
                        ? { ...msg, content: `${msg.content}\n\n[오류가 발생했습니다. 잠시 후 다시 시도해주세요.]` }
                        : msg
                )
            )
        } finally {
            setLoading(false)
        }
    }

    if (isLoading || !isAuthorized) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center px-6">
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.45)]">
                    <Spinner size="sm" className="text-bon-green-start" />
                    <span>권한을 확인하고 있습니다...</span>
                </div>
            </div>
        )
    }

    const currentSessionTitle = sessionId
        ? sessions.find((session) => session.id === sessionId)?.title || "대화 중"
        : "새 대화"

    const sessionList = (
        <div className="space-y-2 p-3">
            {sessionsLoading ? (
                <div className="rounded-[24px] border border-slate-200/70 bg-white/90 px-4 py-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.4)]">
                    <LoadingNotice label="대화 목록을 불러오는 중..." />
                </div>
            ) : sessions.length === 0 ? (
                <div className="rounded-[24px] border border-slate-200/70 bg-white/90 px-4 py-6 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.4)]">
                    <p className="mb-4 text-sm text-slate-500">저장된 대화가 없습니다.</p>
                    <Button
                        onClick={() => void handleStartNewChat()}
                        loading={startingNewChat}
                        loadingText="생성 중..."
                        variant="gradient"
                        className="w-full justify-center"
                    >
                        <Plus className="h-4 w-4" />
                        첫 대화 시작하기
                    </Button>
                </div>
            ) : (
                sessions.map((session) => (
                    <button
                        key={session.id}
                        type="button"
                        onClick={() => void loadSession(session.id)}
                        disabled={loading || startingNewChat}
                        className={cn(
                            "w-full rounded-[24px] border px-4 py-3 text-left transition-[border-color,background-color,transform,box-shadow] duration-200",
                            "active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60",
                            sessionId === session.id
                                ? "border-bon-green-start/30 bg-gradient-to-r from-bon-green-start/10 to-white shadow-[0_24px_60px_-42px_rgba(95,162,36,0.45)]"
                                : "border-transparent bg-white/80 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.4)] hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white"
                        )}
                    >
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                            {formatSessionLabel(session)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {formatKoreanDateTime(session.last_message_at)}
                        </p>
                    </button>
                ))
            )}
        </div>
    )

    return (
        <>
            <div className="hidden h-[100dvh] overflow-hidden lg:flex">
                <aside className={cn("flex w-80 min-h-0 flex-col border-r border-white/70 backdrop-blur-xl", SIDEBAR_BG)}>
                    <div className="border-b border-slate-200/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">대화 목록</h2>
                                <p className="text-xs text-slate-500">최근 상담 기록을 빠르게 이어보세요</p>
                            </div>
                            <Button
                                variant="gradient"
                                size="sm"
                                onClick={() => void handleStartNewChat()}
                                loading={startingNewChat}
                                loadingText="생성 중..."
                                disabled={loading}
                                className="rounded-full px-4"
                            >
                                <Plus className="h-4 w-4" />
                                새 대화
                            </Button>
                        </div>
                    </div>

                    <div className="scrollbar-soft min-h-0 flex-1 overflow-y-auto overscroll-contain">
                        {sessionList}
                    </div>
                </aside>

                <div className="flex min-h-0 flex-1 flex-col">
                    <header className={cn("border-b border-white/70 px-7 py-5 backdrop-blur-xl", HEADER_BG)}>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-500 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.45)]">
                                    <Sparkles className="h-3.5 w-3.5 text-bon-green-start" />
                                    <span>MANUAL CHAT</span>
                                </div>
                                <h1 className="text-2xl font-bold text-slate-950">운영 매뉴얼 챗봇</h1>
                                <p className="mt-1 text-sm text-slate-500">{currentSessionTitle}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-xs font-medium text-slate-600 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.45)]">
                                    <ShieldCheck className="h-3.5 w-3.5 text-bon-green-start" />
                                    사장님 모드
                                </span>
                                <LogoutButton className="rounded-full" />
                            </div>
                        </div>
                    </header>

                    <div className="min-h-0 flex-1 overflow-hidden">
                        <div className={cn("scrollbar-soft h-full overflow-y-auto overscroll-contain px-6 py-6", CHAT_CANVAS_BG)}>
                            <ChatTranscript
                                loading={loading}
                                messages={messages}
                                messagesLoading={messagesLoading}
                                messagesEndRef={desktopMessagesEndRef}
                            />
                        </div>
                    </div>

                    <div className={cn(" px-6 py-5 backdrop-blur-xl")}>
                        <ChatComposer
                            disabled={loading || startingNewChat}
                            formRef={desktopFormRef}
                            loading={loading}
                            onChange={setInput}
                            onSubmit={handleSend}
                            textareaRef={desktopTextareaRef}
                            value={input}
                        />
                    </div>
                </div>
            </div>

            <div className="h-[100dvh] overflow-hidden lg:hidden">
                <MobileChatLayout
                    currentSessionTitle={currentSessionTitle}
                    header={<LogoutButton variant="icon" label="로그아웃" iconOnly className="h-11 w-11 rounded-2xl p-0" />}
                    onNewChat={handleStartNewChat}
                    sidebarTitle="대화 목록"
                    sidebar={() => sessionList}
                >
                    <div className={cn("flex h-full min-h-0 flex-col", CHAT_CANVAS_BG)}>
                        <div
                            className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
                            style={{ paddingBottom: `${mobileInputHeight + 73}px` }}
                        >
                            <ChatTranscript
                                compact
                                loading={loading}
                                messages={messages}
                                messagesLoading={messagesLoading}
                                messagesEndRef={mobileMessagesEndRef}
                            />
                        </div>

                        <div className={cn("safe-area-bottom fixed bottom-1 left-0 right-0 px-3 py-3 backdrop-blur-xl")}>
                            <ChatComposer
                                compact
                                disabled={loading || startingNewChat}
                                formRef={mobileFormRef}
                                loading={loading}
                                onChange={setInput}
                                onSubmit={handleSend}
                                textareaRef={mobileTextareaRef}
                                value={input}
                            />
                        </div>
                    </div>
                </MobileChatLayout>
            </div>
        </>
    )
}
