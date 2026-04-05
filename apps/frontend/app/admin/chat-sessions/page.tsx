"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ChevronRight, MessageSquareText, Store } from "lucide-react"

import type { ChatSessionListItem, ChatSessionMessageItem } from "@bon/contracts"
import { LogoutButton } from "@/components/auth/logout-button"
import { useRequireAuth } from "@/components/auth/auth-provider"
import { ChatSessionDetailModal } from "@/components/admin/chat-session-detail-modal"
import { getBranchChatMessages, getBranchChatSessions, getBranches } from "@/lib/api/admin-client"
import { formatKoreanDateTime } from "@/lib/date"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { Branch } from "@/types"
import { useToast } from "@/components/ui/toast"

export default function AdminChatSessionsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { showToast } = useToast()
    const [branches, setBranches] = useState<Branch[]>([])
    const [sessions, setSessions] = useState<ChatSessionListItem[]>([])
    const [messages, setMessages] = useState<ChatSessionMessageItem[]>([])
    const [branchLoading, setBranchLoading] = useState(true)
    const [sessionLoading, setSessionLoading] = useState(false)
    const [messageLoading, setMessageLoading] = useState(false)
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
    const branchRequestRef = useRef(0)
    const sessionRequestRef = useRef(0)
    const messageRequestRef = useRef(0)
    const { isAuthorized, isLoading } = useRequireAuth({
        requiredRole: "admin",
        forbiddenMessage: "관리자만 접근 가능합니다."
    })
    const initialBranchId = Number(searchParams.get("branchId") || "")

    const loadSessionMessages = useCallback(async (branchId: number, sessionId: number) => {
        const requestId = ++messageRequestRef.current
        setMessageLoading(true)
        setSelectedBranchId(branchId)
        setSelectedSessionId(sessionId)
        setIsSessionModalOpen(true)

        try {
            const nextMessages = await getBranchChatMessages(branchId, sessionId) as ChatSessionMessageItem[]

            if (requestId !== messageRequestRef.current) {
                return
            }

            setMessages(nextMessages)
        } catch (error) {
            if (requestId !== messageRequestRef.current) {
                return
            }

            showToast(error instanceof Error ? error.message : "오류가 발생했습니다.", "error")
        } finally {
            if (requestId === messageRequestRef.current) {
                setMessageLoading(false)
            }
        }
    }, [showToast])

    const loadBranchSessions = useCallback(async (branchId: number) => {
        const requestId = ++sessionRequestRef.current
        messageRequestRef.current += 1
        setSessionLoading(true)
        setMessageLoading(false)
        setSelectedBranchId(branchId)
        setSelectedSessionId(null)
        setMessages([])
        setIsSessionModalOpen(false)

        try {
            const nextSessions = await getBranchChatSessions(branchId) as ChatSessionListItem[]

            if (requestId !== sessionRequestRef.current) {
                return
            }

            setSessions(nextSessions)
        } catch (error) {
            if (requestId !== sessionRequestRef.current) {
                return
            }

            showToast(error instanceof Error ? error.message : "오류가 발생했습니다.", "error")
        } finally {
            if (requestId === sessionRequestRef.current) {
                setSessionLoading(false)
            }
        }
    }, [showToast])

    const fetchBranches = useCallback(async () => {
        const requestId = ++branchRequestRef.current
        setBranchLoading(true)

        try {
            const nextBranches = await getBranches() as Branch[]

            if (requestId !== branchRequestRef.current) {
                return
            }

            setBranches(nextBranches)

            if (nextBranches.length > 0) {
                const preferredBranchId = nextBranches.some((branch) => branch.id === initialBranchId)
                    ? initialBranchId
                    : nextBranches[0].id
                await loadBranchSessions(preferredBranchId)
                return
            }

            setSelectedBranchId(null)
            setSelectedSessionId(null)
            setSessions([])
            setMessages([])
        } catch (error) {
            if (requestId !== branchRequestRef.current) {
                return
            }

            showToast(error instanceof Error ? error.message : "오류가 발생했습니다.", "error")
        } finally {
            if (requestId === branchRequestRef.current) {
                setBranchLoading(false)
            }
        }
    }, [initialBranchId, loadBranchSessions, showToast])

    useEffect(() => {
        if (!isAuthorized) {
            return
        }

        void fetchBranches()
    }, [fetchBranches, isAuthorized])

    if (isLoading || !isAuthorized) {
        return <div className="p-8 text-center text-slate-500">권한 확인 중...</div>
    }

    const selectedBranch = branches.find((branch) => branch.id === selectedBranchId) ?? null
    const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null

    return (
        <>
            <div className="min-h-[100dvh] p-4 md:p-8">
                <div className="mx-auto flex max-w-7xl flex-col rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(249,250,251,0.94),rgba(241,245,249,0.98))] shadow-[0_36px_90px_-42px_rgba(15,23,42,0.36)] backdrop-blur-sm">
                    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/70 bg-white/72 px-4 py-4 backdrop-blur-md md:px-6">
                        <div className="flex min-w-0 items-center gap-4">
                            <Button variant="icon" size="icon" onClick={() => router.push("/admin")}>
                                <ArrowLeft className="h-5 w-5 text-slate-500" />
                            </Button>
                            <div className="min-w-0">
                                <h1 className="text-xl font-bold text-slate-900">지점별 대화 조회</h1>
                                <p className="text-sm text-slate-500">지점별 세션을 선택해 대화 내용을 모달로 확인합니다.</p>
                            </div>
                        </div>
                        <LogoutButton className="hidden rounded-full sm:inline-flex" />
                        <LogoutButton variant="icon" iconOnly className="h-11 w-11 rounded-2xl p-0 sm:hidden" />
                    </header>

                    <main className="flex flex-1 flex-col lg:grid lg:grid-cols-[280px_1fr]">
                        <section className="border-b border-white/70 bg-[linear-gradient(180deg,rgba(240,244,247,0.86),rgba(233,238,242,0.94))] lg:border-b-0 lg:border-r">
                            <div className="border-b border-slate-200/70 px-4 py-4">
                                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <Store className="h-4 w-4" /> 지점
                                </h2>
                            </div>
                            <div className="overflow-x-auto px-3 py-3 lg:overflow-y-auto">
                                <div className="flex gap-2 lg:flex-col">
                                    {branchLoading ? (
                                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                                            <Spinner size="sm" className="text-bon-green-start" />
                                            불러오는 중...
                                        </div>
                                    ) : branches.length === 0 ? (
                                        <p className="px-3 py-4 text-sm text-slate-500">등록된 지점이 없습니다.</p>
                                    ) : branches.map((branch) => (
                                        <button
                                            key={branch.id}
                                            type="button"
                                            onClick={() => void loadBranchSessions(branch.id)}
                                            className={`min-w-[168px] rounded-2xl border px-4 py-3 text-left transition-all lg:min-w-0 ${
                                                selectedBranchId === branch.id
                                                    ? "border-bon-burgundy/20 bg-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.3)]"
                                                    : "border-transparent bg-white/68 hover:border-slate-200 hover:bg-white"
                                            }`}
                                        >
                                             <span className="text-xs text-slate-500">{branch.code} </span>
                                            <span className="text-sm font-semibold text-slate-900">{branch.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="flex min-h-[520px] flex-col">
                            <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/65 px-4 py-4 backdrop-blur-md">
                                <div>
                                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <MessageSquareText className="h-4 w-4" /> 세션
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        세션을 누르면 전체 대화가 모달로 열립니다.
                                    </p>
                                </div>
                                {selectedBranch && (
                                    <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 md:block">
                                        {selectedBranch.name}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {sessionLoading ? (
                                    <div className="flex h-full items-center justify-center">
                                        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                                            <Spinner size="sm" className="text-bon-green-start" />
                                            세션을 불러오는 중...
                                        </div>
                                    </div>
                                ) : sessions.length === 0 ? (
                                    <div className="flex h-full items-center justify-center">
                                        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/75 px-6 py-8 text-center shadow-sm">
                                            <MessageSquareText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                                            <p className="text-sm text-slate-500">선택한 지점의 저장된 세션이 없습니다.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {sessions.map((session) => (
                                            <button
                                                key={session.id}
                                                type="button"
                                                onClick={() => selectedBranchId && void loadSessionMessages(selectedBranchId, session.id)}
                                                className={`group w-full rounded-[24px] border px-4 py-4 text-left transition-all ${
                                                    selectedSessionId === session.id
                                                        ? "border-bon-green-start/25 bg-white shadow-[0_22px_50px_-34px_rgba(95,162,36,0.28)]"
                                                        : "border-transparent bg-white/78 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                                                            {session.title || "새 대화"}
                                                        </p>
                                                        <p className="mt-2 text-xs text-slate-500">
                                                            {formatKoreanDateTime(session.last_message_at)}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </main>
                </div>
            </div>

            <ChatSessionDetailModal
                branch={selectedBranch}
                isOpen={isSessionModalOpen}
                loading={messageLoading}
                messages={messages}
                onClose={() => setIsSessionModalOpen(false)}
                session={selectedSession}
            />
        </>
    )
}
