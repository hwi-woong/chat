"use client"

import { useCallback, useEffect, useState } from "react"
import type { CreateBranchRequest, UpdateBranchRequest } from "@bon/contracts"
import { useRouter } from "next/navigation"
import { ArrowLeft, Edit, MessagesSquare, Plus } from "lucide-react"

import type { Branch } from "@/types"
import { LogoutButton } from "@/components/auth/logout-button"
import { useRequireAuth } from "@/components/auth/auth-provider"
import { createBranch, getBranches, updateBranch } from "@/lib/api/admin-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { formatKoreanDateTime } from "@/lib/date"

type BranchFormState = {
    code: string
    name: string
    password: string
    is_active: boolean
}

const emptyForm: BranchFormState = {
    code: "",
    name: "",
    password: "",
    is_active: true,
}

export default function AdminBranchesPage() {
    const router = useRouter()
    const { showToast } = useToast()
    const [branches, setBranches] = useState<Branch[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Branch | null>(null)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState<BranchFormState>(emptyForm)
    const { isAuthorized, isLoading } = useRequireAuth({
        requiredRole: "admin",
        forbiddenMessage: "관리자만 접근 가능합니다."
    })

    const fetchBranches = useCallback(async () => {
        setLoading(true)
        try {
            setBranches(await getBranches())
        } catch (error) {
            showToast(error instanceof Error ? error.message : "오류가 발생했습니다.", "error")
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => {
        if (!isAuthorized) {
            return
        }

        void fetchBranches()
    }, [fetchBranches, isAuthorized])

    const activeBranchCount = branches.filter((branch) => branch.is_active).length
    const recentLoginBranchCount = branches.filter((branch) => branch.last_login_at).length

    const openCreate = () => {
        setEditing(null)
        setForm(emptyForm)
        setModalOpen(true)
    }

    const openEdit = (branch: Branch) => {
        setEditing(branch)
        setForm({
            code: branch.code,
            name: branch.name,
            password: "",
            is_active: branch.is_active,
        })
        setModalOpen(true)
    }

    const closeModal = () => {
        setEditing(null)
        setForm(emptyForm)
        setModalOpen(false)
    }

    const handleSave = async () => {
        if (!form.name.trim() || !form.code.trim()) {
            showToast("지점 코드와 이름은 필수입니다.", "warning")
            return
        }

        if (!editing && !form.password.trim()) {
            showToast("신규 지점 비밀번호는 필수입니다.", "warning")
            return
        }

        setSaving(true)
        try {
            const body = editing
                ? {
                    name: form.name.trim(),
                    password: form.password.trim() || undefined,
                    is_active: form.is_active,
                }
                : {
                    code: form.code.trim(),
                    name: form.name.trim(),
                    password: form.password.trim(),
                }

            if (editing) {
                await updateBranch(editing.id, body as UpdateBranchRequest)
            } else {
                await createBranch(body as CreateBranchRequest)
            }

            showToast(editing ? "지점이 수정되었습니다." : "지점이 추가되었습니다.", "success")
            closeModal()
            void fetchBranches()
        } catch (error) {
            showToast(error instanceof Error ? error.message : "오류가 발생했습니다.", "error")
        } finally {
            setSaving(false)
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
                        <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Button>
                        <h1 className="text-xl font-bold text-slate-900">지점 관리</h1>
                    </div>
                    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                        <LogoutButton />
                        <Button variant="gradient" className="gap-2 text-black hover:text-black" onClick={openCreate}>
                            <Plus className="w-4 h-4" /> 지점 추가
                        </Button>
                    </div>
                </header>

                <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
                    <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">전체</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{branches.length}</p>
                            <p className="mt-1 text-xs text-slate-500">등록된 지점 수</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">활성</p>
                            <p className="mt-2 text-2xl font-bold text-emerald-700">{activeBranchCount}</p>
                            <p className="mt-1 text-xs text-emerald-700/80">운영 중인 지점</p>
                        </div>
                        <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 shadow-sm md:col-span-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">로그인</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{recentLoginBranchCount}</p>
                            <p className="mt-1 text-xs text-slate-500">최근 로그인 기록 보유</p>
                        </div>
                    </section>

                    <section className="space-y-3 md:hidden">
                        {loading ? (
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-500 shadow-sm">
                                로딩 중...
                            </div>
                        ) : branches.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center shadow-sm">
                                <p className="text-sm font-medium text-slate-900">등록된 지점이 없습니다.</p>
                                <p className="mt-2 text-sm text-slate-500">첫 지점을 추가해서 운영을 시작하세요.</p>
                                <Button variant="gradient" className="mt-4 gap-2 text-black hover:text-black" onClick={openCreate}>
                                    <Plus className="w-4 h-4" /> 지점 추가
                                </Button>
                            </div>
                        ) : branches.map((branch) => (
                            <article
                                key={branch.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-base font-bold text-slate-900">{branch.name}</p>
                                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                            {branch.code}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                            branch.is_active
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-slate-100 text-slate-500"
                                        }`}
                                    >
                                        {branch.is_active ? "활성" : "비활성"}
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 px-3 py-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                            코드
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-slate-700">{branch.code}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                            최근 로그인
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-slate-700">
                                            {formatKoreanDateTime(branch.last_login_at, "로그인 기록 없음")}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 gap-2"
                                        onClick={() => router.push(`/admin/chat-sessions?branchId=${branch.id}`)}
                                    >
                                        <MessagesSquare className="w-4 h-4" />
                                        대화 보기
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="gap-2 px-4"
                                        onClick={() => openEdit(branch)}
                                    >
                                        <Edit className="w-4 h-4" />
                                        수정
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </section>

                    <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm md:block">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">코드</th>
                                    <th className="px-6 py-3">지점명</th>
                                    <th className="px-6 py-3">최근 로그인</th>
                                    <th className="px-6 py-3">상태</th>
                                    <th className="px-6 py-3 text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">로딩 중...</td>
                                    </tr>
                                ) : branches.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">등록된 지점이 없습니다.</td>
                                    </tr>
                                ) : branches.map((branch) => (
                                    <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{branch.code}</td>
                                        <td className="px-6 py-4 text-slate-700">{branch.name}</td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {formatKoreanDateTime(branch.last_login_at, "로그인 기록 없음")}
                                        </td>
                                        <td className="px-6 py-4">
                                            {branch.is_active ? (
                                                <span className="text-green-600 text-xs font-semibold">활성</span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">비활성</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.push(`/admin/chat-sessions?branchId=${branch.id}`)}
                                                >
                                                    대화 보기
                                                </Button>
                                                <button
                                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors"
                                                    onClick={() => openEdit(branch)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>

            <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? "지점 수정" : "지점 추가"}>
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault()
                        handleSave()
                    }}
                >
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">지점 코드</label>
                        <Input
                            value={form.code}
                            disabled={Boolean(editing)}
                            onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">지점명</label>
                        <Input
                            value={form.name}
                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            {editing ? "비밀번호 변경 (선택)" : "비밀번호"}
                        </label>
                        <Input
                            type="password"
                            value={form.password}
                            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                        />
                    </div>
                    {editing && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                            />
                            <span className="text-sm text-slate-700">활성 상태</span>
                        </label>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={closeModal}>
                            취소
                        </Button>
                        <Button type="submit" variant="gradient" disabled={saving}>
                            {saving ? "저장 중..." : "저장"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
