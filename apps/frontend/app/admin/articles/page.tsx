"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Search, ArrowLeft, Edit, Trash2 } from "lucide-react"

import { LogoutButton } from "@/components/auth/logout-button"
import { useRequireAuth } from "@/components/auth/auth-provider"
import { deleteArticle, getArticles, getCategories } from "@/lib/api/admin-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Article, Category } from "@/types"
import { useToast } from "@/components/ui/toast"

function ArticleListContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const categoryIdParam = searchParams.get('category')
    const { showToast } = useToast()

    const [articles, setArticles] = useState<Article[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState(categoryIdParam || "")
    const { isAuthorized, isLoading } = useRequireAuth({
        requiredRole: "admin",
        forbiddenMessage: "관리자만 접근 가능합니다."
    })

    const fetchCategories = useCallback(async () => {
        try {
            setCategories(await getCategories())
        } catch { }
    }, [])

    const fetchArticles = useCallback(async () => {
        setLoading(true)
        try {
            const response = await getArticles(selectedCategory)
            setArticles(response.items)
        } catch (error) {
            showToast(error instanceof Error ? error.message : "문서 목록을 불러오지 못했습니다.", "error")
        } finally {
            setLoading(false)
        }
    }, [selectedCategory, showToast])

    useEffect(() => {
        if (!isAuthorized) {
            return
        }

        void fetchCategories()
        void fetchArticles()
    }, [fetchArticles, fetchCategories, isAuthorized])

    useEffect(() => {
        setSelectedCategory(categoryIdParam || "")
    }, [categoryIdParam])

    const filteredArticles = articles.filter(a => a.title.includes(search))

    const navigateToArticle = (articleId: number) => {
        router.push(`/admin/articles/${articleId}`)
    }

    const handleCategoryChange = (value: string) => {
        setSelectedCategory(value)

        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set("category", value)
        } else {
            params.delete("category")
        }

        const query = params.toString()
        router.replace(query ? `/admin/articles?${query}` : "/admin/articles")
    }

    const handleDelete = async (articleId: number) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        try {
            await deleteArticle(articleId)
            showToast("삭제되었습니다.", "success");
            void fetchArticles()
        } catch (error) {
            showToast(error instanceof Error ? error.message : "오류가 발생했습니다.", "error");
        }
    }

    if (isLoading || !isAuthorized) {
        return <div className="p-8 text-center text-slate-500">권한 확인 중...</div>
    }

    return (
        <div className="min-h-[100dvh] p-4 md:p-8">
            <div className="mx-auto flex max-w-7xl flex-col rounded-xl bg-white/90 shadow-xl backdrop-blur-sm">
                <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/50 px-4 py-4 backdrop-blur-md md:px-6">
                    <div className="flex min-w-0 items-center gap-3 md:gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Button>
                        <h1 className="text-xl font-bold text-slate-900">문서 관리</h1>
                    </div>
                    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                        <LogoutButton />
                        <Button
                            variant="gradient"
                            className="gap-2"
                            onClick={() => {
                                const url = selectedCategory
                                    ? `/admin/articles/new?category=${selectedCategory}`
                                    : '/admin/articles/new';
                                router.push(url);
                            }}
                        >
                            <Plus className="w-4 h-4" /> 문서 등록
                        </Button>
                    </div>
                </header>

                <main className="flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex-1 max-w-xs">
                            <select
                                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-bon-green-start"
                                value={selectedCategory}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                            >
                                <option value="">전체 카테고리</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="문서 제목 검색..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-x-auto md:overflow-visible">
                            <table className="w-full min-w-0 text-left text-sm md:min-w-[600px]">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 md:px-6 w-16 md:w-20">ID</th>
                                        <th className="hidden w-24 px-4 py-3 md:table-cell md:w-32 md:px-6">카테고리</th>
                                        <th className="px-4 py-3 md:px-6">제목</th>
                                        <th className="hidden w-24 px-4 py-3 md:table-cell md:w-32 md:px-6">상태</th>
                                        <th className="hidden w-24 px-4 py-3 text-right md:table-cell md:w-32 md:px-6">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={5} className="px-4 py-8 md:px-6 text-center text-slate-500">로딩 중...</td></tr>
                                    ) : filteredArticles.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-8 md:px-6 text-center text-slate-500">문서가 없습니다.</td></tr>
                                    ) : filteredArticles.map((article) => {
                                        const catParams = categories.find(c => c.id === String(article.category_id));
                                        return (
                                            <tr key={article.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 align-middle text-slate-500 md:px-6 md:py-4">#{article.id}</td>
                                                <td className="hidden px-4 py-3 align-middle md:table-cell md:px-6 md:py-4">
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs whitespace-nowrap">
                                                        {catParams?.name || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 align-middle font-medium text-slate-900 md:px-6 md:py-4">
                                                    <button
                                                        type="button"
                                                        className="w-full text-left"
                                                        onClick={() => navigateToArticle(article.id)}
                                                    >
                                                        <div className="line-clamp-2 md:line-clamp-1">{article.title}</div>
                                                        <div className="mt-1 text-xs font-normal text-slate-400 md:hidden">
                                                            탭해서 상세에서 확인
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="hidden px-4 py-3 align-middle md:table-cell md:px-6 md:py-4">
                                                    {article.is_published ? (
                                                        <span className="text-green-600 flex items-center gap-1 text-xs font-semibold whitespace-nowrap">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> 게시중
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs whitespace-nowrap">비공개</span>
                                                    )}
                                                </td>
                                                <td className="hidden px-4 py-3 text-right align-middle md:table-cell md:px-6 md:py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors"
                                                            onClick={() => navigateToArticle(article.id)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-red-600 transition-colors"
                                                            onClick={() => handleDelete(article.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default function ArticleListPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ArticleListContent />
        </Suspense>
    )
}
