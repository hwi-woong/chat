"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, Menu, MessageSquarePlus, X } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"

type SidebarRenderer = ReactNode | ((controls: { closeSidebar: () => void }) => ReactNode)

interface MobileChatLayoutProps {
  children: ReactNode
  sidebar: SidebarRenderer
  header: ReactNode
  onNewChat?: () => void
  currentSessionTitle?: string
  sidebarTitle?: string
  showBackButton?: boolean
  onBack?: () => void
}

export function MobileChatLayout({
  children,
  sidebar,
  header,
  onNewChat,
  currentSessionTitle,
  sidebarTitle = "대화 목록",
  showBackButton = false,
  onBack
}: MobileChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight)
    }
  }, [])

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [sidebarOpen])

  const closeSidebar = () => setSidebarOpen(false)
  const sidebarContent = typeof sidebar === "function"
    ? sidebar({ closeSidebar })
    : sidebar

  return (
    <div className="relative h-[100dvh] overflow-hidden">
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-200 safe-area-top"
      >
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {showBackButton ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="shrink-0"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-slate-900 truncate">
                {currentSessionTitle || "운영 매뉴얼 챗봇"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onNewChat && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  closeSidebar()
                  onNewChat()
                }}
                className="shrink-0"
              >
                <MessageSquarePlus className="w-5 h-5" />
              </Button>
            )}
            {header}
          </div>
        </div>
      </header>

      <main
        className="h-full overflow-hidden"
        style={{ paddingTop: `${headerHeight}px` }}
      >
        {children}
      </main>

      <>
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={closeSidebar}
          />
        )}

        <aside
          className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 safe-area-top">
              <h2 className="text-lg font-bold text-slate-900">{sidebarTitle}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeSidebar}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </aside>
      </>
    </div>
  )
}
