"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, FileText, Send } from "lucide-react"

import type { ChatSessionListItem, ChatSessionMessageItem } from "@bon/contracts"
import { LogoutButton } from "@/components/auth/logout-button"
import { useRequireAuth } from "@/components/auth/auth-provider"
import { MobileChatLayout } from "@/components/chat/mobile-chat-layout"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { createChatSession, getChatSessionMessages, getChatSessions, openChatStream } from "@/lib/api/chat-client"
import { formatKoreanDateTime } from "@/lib/date"
import type { Message } from "@/types"

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
    const [inputHeight, setInputHeight] = useState(56)

    const desktopFormRef = useRef<HTMLFormElement>(null)
    const mobileFormRef = useRef<HTMLFormElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
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
        const refs = [desktopTextareaRef.current, mobileTextareaRef.current]

        for (const textarea of refs) {
            if (!textarea) continue
            textarea.style.height = "auto"
            const scrollHeight = textarea.scrollHeight
            const newHeight = Math.min(Math.max(scrollHeight, 56), 150)
            setInputHeight(newHeight)
            textarea.style.height = `${newHeight}px`
        }
    }, [input])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
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

                for (const event of parsed.events) {
                    if (event.type === "meta") {
                        if (event.data.session_id) {
                            resolvedSessionId = event.data.session_id
                            setSessionId(event.data.session_id)
                        }
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === assistantMsgId ? { ...msg, references: event.data.references } : msg
                            )
                        )
                    } else if (event.type === "chunk") {
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === assistantMsgId ? { ...msg, content: msg.content + (event.data.text || "") } : msg
                            )
                        )
                    } else if (event.type === "error") {
                        const message = typeof event.data === "string"
                            ? event.data
                            : event.data.message || "스트림 처리 중 오류가 발생했습니다."
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
        return <div className="p-8 text-center text-slate-500">권한 확인 중...</div>
    }

    const currentSessionTitle = sessionId
        ? sessions.find((session) => session.id === sessionId)?.title || "대화 중"
        : "새 대화"

    return (
        <>
            <div className="hidden lg:flex h-screen bg-slate-50">
                <aside className="w-80 border-r border-slate-200 bg-white flex flex-col">
                    <div className="p-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">대화 목록</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleStartNewChat}
                                disabled={loading || startingNewChat}
                            >
                                새 대화
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {sessionsLoading ? (
                            <p className="px-3 py-4 text-sm text-slate-500">불러오는 중...</p>
                        ) : sessions.length === 0 ? (
                            <p className="px-3 py-4 text-sm text-slate-500">저장된 대화가 없습니다.</p>
                        ) : (
                            sessions.map((session) => (
                                <button
                                    key={session.id}
                                    type="button"
                                    onClick={() => void loadSession(session.id)}
                                    disabled={loading || startingNewChat}
                                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                                        sessionId === session.id
                                            ? "bg-bon-green-start/10 border border-bon-green-start/30"
                                            : "hover:bg-slate-100"
                                    }`}
                                >
                                    <p className="line-clamp-2 text-sm font-medium text-slate-900">
                                        {formatSessionLabel(session)}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {formatKoreanDateTime(session.last_message_at)}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                <div className="flex-1 flex flex-col">
                    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">운영 매뉴얼 챗봇</h1>
                            <p className="text-sm text-slate-500">{currentSessionTitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                                사장님 모드
                            </span>
                            <LogoutButton />
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                        {messagesLoading ? (
                            <div className="flex h-full items-center justify-center text-slate-500">
                                대화를 불러오는 중...
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex h-full items-center justify-center">
                                <div className="max-w-md text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Bot className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-lg font-medium text-slate-900 mb-2">무엇을 도와드릴까요?</p>
                                    <p className="text-sm text-slate-500">
                                        운영 규정, 발주, 위생, 응대 기준 등 매장 운영 관련 질문을 입력해주세요.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto space-y-4">
                                {messages.map((msg, idx) => (
                                    <div key={msg.id ?? idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[80%] ${msg.role === "user" ? "order-2" : ""}`}>
                                            <div className={`px-4 py-3 rounded-2xl ${
                                                msg.role === "user"
                                                    ? "bg-gradient-to-r from-bon-green-start to-bon-green-end text-white"
                                                    : "bg-white border border-slate-200"
                                            }`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                {msg.role === "assistant" && msg.content === "" && loading && (
                                                    <div className="flex space-x-1">
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                                                    </div>
                                                )}
                                            </div>
                                            {msg.references && msg.references.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {msg.references.map((ref, index) => (
                                                        <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs">
                                                            <FileText className="w-3 h-3 text-slate-500" />
                                                            <span className="text-slate-600">{ref.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-200 bg-white p-4">
                        <form ref={desktopFormRef} onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-2">
                            <textarea
                                ref={desktopTextareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault()
                                        if (e.nativeEvent.isComposing) return
                                        desktopFormRef.current?.requestSubmit()
                                    }
                                }}
                                placeholder="메시지를 입력하세요..."
                                className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-bon-green-start"
                                disabled={loading || startingNewChat}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                variant="gradient"
                                className="h-[56px] w-[56px] rounded-xl"
                                disabled={!input.trim() || loading || startingNewChat}
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>

            <div className="lg:hidden h-[100dvh] bg-white">
                <MobileChatLayout
                    currentSessionTitle={currentSessionTitle}
                    header={<LogoutButton />}
                    onNewChat={handleStartNewChat}
                    sidebarTitle="대화 목록"
                    sidebar={({ closeSidebar }) => (
                        <div className="p-4 space-y-2">
                            {sessionsLoading ? (
                                <p className="py-8 text-center text-slate-500">불러오는 중...</p>
                            ) : sessions.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="mb-4 text-slate-500">저장된 대화가 없습니다</p>
                                    <Button
                                        onClick={() => {
                                            closeSidebar()
                                            void handleStartNewChat()
                                        }}
                                    >
                                        첫 대화 시작하기
                                    </Button>
                                </div>
                            ) : (
                                sessions.map((session) => (
                                    <button
                                        key={session.id}
                                        type="button"
                                        onClick={() => {
                                            closeSidebar()
                                            void loadSession(session.id)
                                        }}
                                        disabled={loading || startingNewChat}
                                        className={`w-full rounded-xl p-4 text-left transition-colors ${
                                            sessionId === session.id
                                                ? "bg-bon-green-start/10 border border-bon-green-start/30"
                                                : "bg-slate-50 active:bg-slate-100"
                                        }`}
                                    >
                                        <p className="line-clamp-2 font-medium text-slate-900">
                                            {formatSessionLabel(session)}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {formatKoreanDateTime(session.last_message_at)}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                >
                    <>
                        <div
                            className="h-full overflow-y-auto p-4 space-y-3"
                            style={{ paddingBottom: `${inputHeight + 32}px` }}
                        >
                            {messagesLoading ? (
                                <div className="flex h-full items-center justify-center text-slate-500">
                                    대화를 불러오는 중...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex h-full items-center justify-center px-8">
                                    <div className="text-center">
                                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                                            <Bot className="w-7 h-7 text-slate-400" />
                                        </div>
                                        <p className="mb-2 font-medium text-slate-900">무엇을 도와드릴까요?</p>
                                        <p className="text-sm text-slate-500">매장 운영 관련 질문을 입력해주세요</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div key={msg.id ?? idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className="max-w-[85%]">
                                            <div className={`px-4 py-2.5 rounded-2xl ${
                                                msg.role === "user"
                                                    ? "bg-gradient-to-r from-bon-green-start to-bon-green-end text-white rounded-tr-sm"
                                                    : "bg-slate-100 text-slate-900 rounded-tl-sm"
                                            }`}>
                                                <p className="text-[15px] whitespace-pre-wrap">{msg.content}</p>
                                                {msg.role === "assistant" && msg.content === "" && loading && (
                                                    <div className="flex space-x-1 py-1">
                                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75" />
                                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150" />
                                                    </div>
                                                )}
                                            </div>
                                            {msg.references && msg.references.length > 0 && (
                                                <div className="mt-1.5 space-y-1">
                                                    {msg.references.map((ref, index) => (
                                                        <div key={index} className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg text-xs border border-slate-200">
                                                            <FileText className="w-3 h-3 text-slate-400" />
                                                            <span className="truncate text-slate-600">{ref.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 safe-area-bottom">
                            <form ref={mobileFormRef} onSubmit={handleSend} className="flex gap-2">
                                <textarea
                                    ref={mobileTextareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault()
                                            if (e.nativeEvent.isComposing) return
                                            mobileFormRef.current?.requestSubmit()
                                        }
                                    }}
                                    placeholder="메시지를 입력하세요..."
                                    className="flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-bon-green-start"
                                    style={{ minHeight: "44px", maxHeight: "120px" }}
                                    disabled={loading || startingNewChat}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    variant="gradient"
                                    className="h-[44px] w-[44px] rounded-xl shrink-0"
                                    disabled={!input.trim() || loading || startingNewChat}
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </>
                </MobileChatLayout>
            </div>
        </>
    )
}
