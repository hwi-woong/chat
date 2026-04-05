"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowRight, Shield, User } from "lucide-react"

import { PasswordModal } from "@/components/auth/password-modal"
import { Card } from "@/components/ui/card"
import type { UserRole } from "@/types"

export function HomePageClient() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedRole(null)
  }

  return (
    <>
      <div className="min-h-[100dvh] bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <header className="pb-6 sm:pb-7 lg:pb-8">
            <div className="flex w-full flex-col items-center text-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80 sm:h-32 sm:w-32">
                <Image
                  src="/logo.png"
                  alt="BON IF Logo"
                  width={78}
                  height={78}
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                운영 매뉴얼 챗봇
              </h1>
              <p className="mt-3 text-sm text-slate-500 sm:text-base">
                모드를 선택하세요.
              </p>
            </div>
          </header>

          <main className="flex flex-col">
            <section>
              <div className="grid w-full gap-4 lg:grid-cols-2">
                <Card
                  className="group cursor-pointer overflow-hidden border-0 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/80 transition-all hover:-translate-y-1 hover:shadow-[0_32px_90px_-42px_rgba(95,162,36,0.3)]"
                  onClick={() => handleRoleSelect("user")}
                >
                  <div className="border-b border-slate-100 bg-gradient-to-r from-bon-green-start/10 to-bon-green-end/10 px-6 py-6">
                    <div className="flex items-start justify-between">
                      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/60">
                        <User className="h-7 w-7 text-bon-green-start" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-bon-green-start" />
                    </div>
                  </div>
                  <div className="p-7 sm:p-8">
                    <p className="text-sm font-semibold text-bon-green-start">USER MODE</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">사장님 모드</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      매장 운영에 필요한 규정과 실행 기준을 확인합니다.
                    </p>
                  </div>
                </Card>

                <Card
                  className="group cursor-pointer overflow-hidden border-0 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/80 transition-all hover:-translate-y-1 hover:shadow-[0_32px_90px_-42px_rgba(107,0,0,0.3)]"
                  onClick={() => handleRoleSelect("admin")}
                >
                  <div className="border-b border-slate-100 bg-gradient-to-r from-bon-burgundy/10 to-slate-200 px-6 py-6">
                    <div className="flex items-start justify-between">
                      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/60">
                        <Shield className="h-7 w-7 text-bon-burgundy" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-bon-burgundy" />
                    </div>
                  </div>
                  <div className="p-7 sm:p-8">
                    <p className="text-sm font-semibold text-bon-burgundy">ADMIN MODE</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">관리자 모드</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      문서와 대화 이력을 관리하고 답변 품질을 점검합니다.
                    </p>
                  </div>
                </Card>
              </div>
            </section>
          </main>
        </div>
      </div>

      <PasswordModal
        isOpen={modalOpen}
        onClose={closeModal}
        role={selectedRole}
      />
    </>
  )
}
