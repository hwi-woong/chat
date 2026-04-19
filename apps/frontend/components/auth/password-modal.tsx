"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth/auth-provider"
import { login, sendSmsOtp, verifySmsOtp } from "@/lib/api/auth-client"
import type { UserRole } from "@/types"
import { useToast } from "@/components/ui/toast"

interface PasswordModalProps {
    isOpen: boolean
    onClose: () => void
    role: UserRole | null
}

type BranchStep = "branch-code" | "sms-code" | "password"

export function PasswordModal({ isOpen, onClose, role }: PasswordModalProps) {
    const [identifier, setIdentifier] = useState("")
    const [password, setPassword] = useState("")
    const [smsCode, setSmsCode] = useState("")
    const [branchStep, setBranchStep] = useState<BranchStep>("branch-code")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { showToast } = useToast()
    const { setAuthenticated } = useAuth()

    const handleClose = () => {
        setBranchStep("branch-code")
        setIdentifier("")
        setSmsCode("")
        setPassword("")
        onClose()
    }

    const handleSmsSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!identifier.trim()) return
        setIsLoading(true)
        try {
            await sendSmsOtp(identifier.trim())
            showToast("등록된 번호로 인증번호가 발송되었습니다.", "success")
            setBranchStep("sms-code")
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "SMS 발송에 실패했습니다."
            showToast(errorMsg, "error")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSmsVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!smsCode.trim()) return
        setIsLoading(true)
        try {
            await verifySmsOtp(identifier.trim(), smsCode.trim())
            showToast("SMS 인증이 완료되었습니다.", "success")
            setBranchStep("password")
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "인증번호가 올바르지 않습니다."
            showToast(errorMsg, "error")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!role || !password) return

        setIsLoading(true)
        try {
            const data = await login(role, identifier, password)
            setAuthenticated(data, identifier.trim())
            showToast(role === 'admin' ? "관리자 인증 완료" : "사장님 인증 완료", "success")
            if (role === 'admin') {
                router.push("/admin")
            } else {
                router.push("/chat")
            }
            handleClose()
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "오류가 발생했습니다."
            showToast(errorMsg, "error")
        } finally {
            setIsLoading(false)
        }
    }

    if (role === "user") {
        return (
            <Modal isOpen={isOpen} onClose={handleClose}>
                {branchStep === "branch-code" && (
                    <form onSubmit={handleSmsSend} autoComplete="off" className="space-y-5">
                        <div className="space-y-2.5 text-center">
                            <h2 className="text-2xl font-bold text-slate-900">사장님 인증</h2>
                            <p className="text-sm text-slate-500">지점 코드를 입력하면 등록된 번호로 인증번호를 발송합니다.</p>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-base font-medium text-slate-700">지점 코드</label>
                            <Input
                                type="text"
                                name="branch-code-sms"
                                placeholder="지점 코드를 입력하세요"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                disabled={isLoading}
                                autoComplete="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                className="h-14 rounded-xl px-4 text-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-offset-0"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-3">
                            <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading} className="text-base px-6 h-12">
                                취소
                            </Button>
                            <Button type="submit" variant="gradient" disabled={isLoading || !identifier.trim()} className="text-base px-6 h-12">
                                {isLoading ? "발송 중..." : "인증번호 받기"}
                            </Button>
                        </div>
                    </form>
                )}

                {branchStep === "sms-code" && (
                    <form onSubmit={handleSmsVerify} autoComplete="off" className="space-y-5">
                        <div className="space-y-2.5 text-center">
                            <h2 className="text-2xl font-bold text-slate-900">인증번호 입력</h2>
                            <p className="text-sm text-slate-500">
                                등록된 휴대폰으로 발송된<br />
                                6자리 인증번호를 입력해주세요. (5분 내 유효)
                            </p>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-base font-medium text-slate-700">인증번호</label>
                            <Input
                                type="text"
                                name="sms-code"
                                placeholder="000000"
                                value={smsCode}
                                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                disabled={isLoading}
                                autoComplete="off"
                                maxLength={6}
                                className="h-14 rounded-xl px-4 text-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-offset-0 tracking-widest"
                            />
                        </div>
                        <div className="flex justify-between gap-2 pt-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setSmsCode(""); setBranchStep("branch-code") }}
                                disabled={isLoading}
                                className="text-base px-6 h-12"
                            >
                                재발송
                            </Button>
                            <Button type="submit" variant="gradient" disabled={isLoading || smsCode.length !== 6} className="text-base px-6 h-12">
                                {isLoading ? "확인 중..." : "확인"}
                            </Button>
                        </div>
                    </form>
                )}

                {branchStep === "password" && (
                    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
                        <div className="space-y-2.5 text-center">
                            <h2 className="text-2xl font-bold text-slate-900">비밀번호 입력</h2>
                            <p className="text-sm text-slate-500">
                                <span className="font-medium text-slate-700">{identifier}</span> 지점의 비밀번호를 입력해주세요.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-base font-medium text-slate-700">비밀번호</label>
                            <Input
                                type="password"
                                name="branch-access-key"
                                placeholder="비밀번호를 입력하세요"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                autoComplete="new-password"
                                className="h-14 rounded-xl px-4 text-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-offset-0"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-3">
                            <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading} className="text-base px-6 h-12">
                                취소
                            </Button>
                            <Button type="submit" variant="gradient" disabled={isLoading} className="text-base px-6 h-12">
                                {isLoading ? "확인 중..." : "로그인"}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        )
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
                <div className="space-y-2.5 text-center">
                    <h2 className="text-2xl font-bold text-slate-900">관리자 인증</h2>
                    <p className="text-sm text-slate-500">관리자 계정과 비밀번호를 입력해주세요.</p>
                </div>
                <div className="space-y-3">
                    <label className="block text-base font-medium text-slate-700">아이디</label>
                    <Input
                        type="text"
                        name="admin-identifier"
                        placeholder="관리자 아이디를 입력하세요"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        disabled={isLoading}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        className="h-14 rounded-xl px-4 text-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-offset-0"
                    />
                </div>
                <div className="space-y-3">
                    <label className="block text-base font-medium text-slate-700">비밀번호</label>
                    <Input
                        type="password"
                        name="admin-access-key"
                        placeholder="비밀번호를 입력하세요"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        autoComplete="new-password"
                        className="h-14 rounded-xl px-4 text-lg text-slate-900 placeholder:text-slate-400 focus-visible:ring-offset-0"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading} className="text-base px-6 h-12">
                        취소
                    </Button>
                    <Button type="submit" variant="gradient" disabled={isLoading} className="text-base px-6 h-12">
                        {isLoading ? "확인 중..." : "확인"}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
