"use client"

import * as React from "react"
import { X } from "lucide-react"
import { lockDocumentScroll } from "@/lib/scroll-lock"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    title?: string
    panelClassName?: string
    bodyClassName?: string
}

export function Modal({ isOpen, onClose, children, title, panelClassName, bodyClassName }: ModalProps) {
    React.useEffect(() => {
        if (!isOpen) {
            return
        }

        return lockDocumentScroll()
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className={`relative my-auto w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl max-h-[calc(100dvh-2rem)] ${panelClassName ?? ""}`}>
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-slate-100 transition-colors"
                >
                    <X className="h-5 w-5 text-slate-500" />
                    <span className="sr-only">Close</span>
                </button>

                {title && (
                    <div className="mb-4 pr-10">
                        <h2 className="text-xl font-bold">{title}</h2>
                    </div>
                )}

                <div className={bodyClassName ?? (title ? "" : "pt-2")}>
                    {children}
                </div>
            </div>
        </div>
    )
}
