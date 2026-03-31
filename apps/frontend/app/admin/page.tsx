"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    BarChart3,
    Bot,
    ChevronRight,
    FileText,
    Folder,
    Home,
    MessagesSquare,
    Store
} from "lucide-react"

import { PreviewChatModal } from "@/components/admin/preview-chat-modal"
import { LogoutButton } from "@/components/auth/logout-button"
import { useRequireAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getCategories } from "@/lib/api/admin-client"
import type { Category } from "@/types"

export default function AdminPage() {
    const router = useRouter()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [activeSection, setActiveSection] = useState<"overview" | "categories">("overview")

    const { isAuthorized, isLoading } = useRequireAuth({
        requiredRole: "admin",
        forbiddenMessage: "관리자만 접근 가능합니다."
    })

    const fetchCategories = useCallback(async () => {
        try {
            setCategories(await getCategories())
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!isAuthorized) return
        void fetchCategories()
    }, [fetchCategories, isAuthorized])

    if (isLoading || !isAuthorized) {
        return <div className="p-8 text-center text-slate-500">권한 확인 중...</div>
    }

    const navigationItems = [
        { id: "overview", label: "대시보드", icon: Home },
        { id: "categories", label: "카테고리", icon: Folder },
        { id: "chatbot", label: "챗봇", icon: Bot }
    ] as const

    return (
        <>
            <div className="hidden lg:flex h-screen bg-slate-50">
                <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-200">
                        <h1 className="text-xl font-bold text-slate-900">관리자 패널</h1>
                        <p className="text-sm text-slate-500">본아이에프 챗봇 관리</p>
                    </div>

                    <nav className="flex-1 p-4 space-y-1">
                        {navigationItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (item.id === "chatbot") {
                                            setPreviewOpen(true)
                                            return
                                        }

                                        setActiveSection(item.id)
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                                        activeSection === item.id
                                            ? "bg-bon-burgundy/10 text-bon-burgundy"
                                            : "text-slate-600 hover:bg-slate-100"
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            )
                        })}
                    </nav>

                    <div className="p-4 border-t border-slate-200">
                        <LogoutButton />
                    </div>
                </aside>

                <div className="flex-1 overflow-y-auto">
                    <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10">
                        <h2 className="text-2xl font-bold text-slate-900">
                            {activeSection === "overview" ? "대시보드" : "카테고리 관리"}
                        </h2>
                    </header>

                    <main className="p-8">
                        {activeSection === "overview" && (
                            <>
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                                    <Card
                                        className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 hover:border-bon-burgundy/30"
                                        onClick={() => router.push("/admin/branches")}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200">
                                                <Store className="w-6 h-6 text-slate-700" />
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">지점 관리</h3>
                                        <p className="text-sm text-slate-600">지점 계정 생성 및 관리</p>
                                    </Card>

                                    <Card
                                        className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 hover:border-bon-green-start/30"
                                        onClick={() => router.push("/admin/chat-sessions")}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 rounded-xl bg-gradient-to-br from-bon-green-start/20 to-bon-green-end/20">
                                                <MessagesSquare className="w-6 h-6 text-bon-green-start" />
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">대화 모니터링</h3>
                                        <p className="text-sm text-slate-600">지점별 대화 내역 조회</p>
                                    </Card>

                                    <Card
                                        className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 hover:border-slate-400/30"
                                        onClick={() => router.push("/admin/categories")}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200">
                                                <Folder className="w-6 h-6 text-slate-700" />
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">카테고리 설정</h3>
                                        <p className="text-sm text-slate-600">카테고리 및 문서 관리</p>
                                    </Card>
                                </div>

                                <div className="bg-white rounded-xl border border-slate-200 p-6">
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">최근 활동</h3>
                                    <div className="space-y-3">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-900">
                                                        지점 B{i}001에서 새로운 대화 시작
                                                    </p>
                                                    <p className="text-xs text-slate-500">방금 전</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeSection === "categories" && (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {loading ? (
                                    <p className="text-slate-500">로딩 중...</p>
                                ) : (
                                    categories.map((cat) => (
                                        <Card
                                            key={cat.id}
                                            className="p-6 cursor-pointer hover:shadow-lg transition-all group"
                                            onClick={() => router.push(`/admin/articles?category=${cat.id}`)}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 rounded-xl bg-slate-100 group-hover:bg-bon-burgundy/10">
                                                    <Folder className="w-6 h-6 text-slate-600 group-hover:text-bon-burgundy" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                    {cat.code}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mb-2">{cat.name}</h3>
                                            <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                                                {cat.description || "설명 없음"}
                                            </p>
                                            <div className="flex items-center text-sm text-slate-500">
                                                <FileText className="w-4 h-4 mr-1" />
                                                <span>{cat.article_count}개 문서</span>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <div className="lg:hidden flex min-h-[100dvh] flex-col bg-slate-50">
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Admin
                            </p>
                            <h1 className="text-lg font-bold text-slate-900">
                                {activeSection === "overview" ? "관리자 대시보드" : "카테고리 관리"}
                            </h1>
                        </div>
                        <LogoutButton />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-4 pb-24 pt-5">
                    {activeSection === "overview" ? (
                        <>
                            <section className="grid grid-cols-2 gap-3">
                                <Card
                                    className="p-4 active:scale-[0.98] transition-transform"
                                    onClick={() => router.push("/admin/branches")}
                                >
                                    <div className="flex flex-col items-start">
                                        <div className="mb-3 rounded-xl bg-slate-100 p-3">
                                            <Store className="w-5 h-5 text-slate-700" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900">지점 관리</h3>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">계정 생성 및 상태 관리</p>
                                    </div>
                                </Card>

                                <Card
                                    className="p-4 active:scale-[0.98] transition-transform"
                                    onClick={() => router.push("/admin/chat-sessions")}
                                >
                                    <div className="flex flex-col items-start">
                                        <div className="mb-3 rounded-xl bg-bon-green-start/20 p-3">
                                            <MessagesSquare className="w-5 h-5 text-bon-green-start" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900">대화 조회</h3>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">지점별 세션과 답변 확인</p>
                                    </div>
                                </Card>

                                <Card
                                    className="p-4 active:scale-[0.98] transition-transform"
                                    onClick={() => setActiveSection("categories")}
                                >
                                    <div className="flex flex-col items-start">
                                        <div className="mb-3 rounded-xl bg-slate-100 p-3">
                                            <Folder className="w-5 h-5 text-slate-700" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900">카테고리</h3>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">문서 분류와 문서 수 확인</p>
                                    </div>
                                </Card>

                                <Card
                                    className="p-4 active:scale-[0.98] transition-transform"
                                    onClick={() => setPreviewOpen(true)}
                                >
                                    <div className="flex flex-col items-start">
                                        <div className="mb-3 rounded-xl bg-bon-burgundy/10 p-3">
                                            <Bot className="w-5 h-5 text-bon-burgundy" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900">챗봇 테스트</h3>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">관리자 권한으로 응답 점검</p>
                                    </div>
                                </Card>
                            </section>

                            <section className="mt-6">
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-base font-bold text-slate-900">주요 카테고리</h2>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setActiveSection("categories")}
                                    >
                                        전체 보기
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {loading ? (
                                        <p className="py-4 text-center text-slate-500">로딩 중...</p>
                                    ) : (
                                        categories.slice(0, 5).map((cat) => (
                                            <Card
                                                key={cat.id}
                                                className="p-4 active:bg-slate-50"
                                                onClick={() => router.push(`/admin/articles?category=${cat.id}`)}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                                        <div className="rounded-lg bg-slate-100 p-2 shrink-0">
                                                            <Folder className="w-4 h-4 text-slate-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="truncate text-sm font-bold text-slate-900">
                                                                {cat.name}
                                                            </h3>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                {cat.article_count}개 문서
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </section>
                        </>
                    ) : (
                        <section>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-900">전체 카테고리</h2>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push("/admin/categories")}
                                >
                                    편집 화면
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {loading ? (
                                    <p className="py-4 text-center text-slate-500">로딩 중...</p>
                                ) : (
                                    categories.map((cat) => (
                                        <Card
                                            key={cat.id}
                                            className="p-4 active:bg-slate-50"
                                            onClick={() => router.push(`/admin/articles?category=${cat.id}`)}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                                    <div className="rounded-lg bg-slate-100 p-2 shrink-0">
                                                        <Folder className="w-4 h-4 text-slate-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="truncate text-sm font-bold text-slate-900">
                                                                {cat.name}
                                                            </h3>
                                                            <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                                                {cat.code}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {cat.article_count}개 문서
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </section>
                    )}
                </main>

                <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white safe-area-bottom">
                    <div className="grid grid-cols-4">
                        <button
                            onClick={() => setActiveSection("overview")}
                            className={`flex flex-col items-center gap-1 py-3 ${
                                activeSection === "overview" ? "text-bon-burgundy" : "text-slate-500"
                            }`}
                        >
                            <Home className="w-5 h-5" />
                            <span className="text-xs">홈</span>
                        </button>
                        <button
                            onClick={() => setActiveSection("categories")}
                            className={`flex flex-col items-center gap-1 py-3 ${
                                activeSection === "categories" ? "text-bon-burgundy" : "text-slate-500"
                            }`}
                        >
                            <Folder className="w-5 h-5" />
                            <span className="text-xs">카테고리</span>
                        </button>
                        <button
                            onClick={() => setPreviewOpen(true)}
                            className="flex flex-col items-center gap-1 py-3 text-slate-500"
                        >
                            <Bot className="w-5 h-5" />
                            <span className="text-xs">챗봇</span>
                        </button>
                        <button
                            onClick={() => router.push("/admin/chat-sessions")}
                            className="flex flex-col items-center gap-1 py-3 text-slate-500"
                        >
                            <BarChart3 className="w-5 h-5" />
                            <span className="text-xs">세션</span>
                        </button>
                    </div>
                </nav>
            </div>

            <PreviewChatModal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} />
        </>
    )
}
