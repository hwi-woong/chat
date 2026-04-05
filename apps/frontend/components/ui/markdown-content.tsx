"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

type MarkdownContentProps = {
    content: string;
    className?: string;
    emptyMessage?: string;
    variant?: "default" | "chat";
}

export function MarkdownContent({
    content,
    className,
    emptyMessage = "아직 작성된 내용이 없습니다.",
    variant = "default"
}: MarkdownContentProps) {
    const isChat = variant === "chat"

    if (!content.trim()) {
        return (
            <div className={cn("rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500", className)}>
                {emptyMessage}
            </div>
        )
    }

    return (
        <div
            className={cn(
                isChat ? "space-y-2 text-[15px] text-inherit" : "space-y-3 text-sm text-slate-700",
                className
            )}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => (
                        <h1 className={cn(isChat ? "mt-1 text-2xl font-semibold tracking-tight text-inherit" : "mt-2 text-3xl font-semibold tracking-tight text-slate-950")}>
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className={cn(isChat ? "mt-4 text-xl font-semibold tracking-tight text-inherit" : "mt-6 text-2xl font-semibold tracking-tight text-slate-950")}>
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className={cn(isChat ? "mt-3 text-lg font-semibold text-inherit" : "mt-5 text-xl font-semibold text-slate-950")}>
                            {children}
                        </h3>
                    ),
                    h4: ({ children }) => (
                        <h4 className={cn(isChat ? "mt-3 text-base font-semibold text-inherit" : "mt-4 text-lg font-semibold text-slate-900")}>
                            {children}
                        </h4>
                    ),
                    p: ({ children }) => <p className={cn("break-words leading-7", isChat ? "text-inherit" : "text-slate-700")}>{children}</p>,
                    ul: ({ children }) => <ul className={cn("list-disc pl-6 marker:text-slate-400", isChat ? "space-y-1.5" : "space-y-2")}>{children}</ul>,
                    ol: ({ children }) => <ol className={cn("list-decimal pl-6 marker:text-slate-400", isChat ? "space-y-1.5" : "space-y-2")}>{children}</ol>,
                    li: ({ children }) => <li className="leading-7">{children}</li>,
                    blockquote: ({ children }) => (
                        <blockquote className={cn("border-l-4 py-1 pl-4", isChat ? "border-slate-200/80 bg-slate-50/90 text-slate-600" : "border-slate-300 bg-slate-50 text-slate-600")}>
                            {children}
                        </blockquote>
                    ),
                    hr: () => <hr className="border-slate-200" />,
                    table: ({ children }) => (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">{children}</table>
                        </div>
                    ),
                    th: ({ children }) => <th className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900">{children}</th>,
                    td: ({ children }) => <td className="border border-slate-200 px-3 py-2 align-top">{children}</td>,
                    img: ({ alt, src }) => {
                        if (!src) {
                            return null
                        }

                        return (
                            <img
                                src={src}
                                alt={alt || ""}
                                className={cn(
                                    "my-4 w-full rounded-xl border border-slate-200 bg-white object-contain",
                                    isChat && "max-h-[28rem]"
                                )}
                            />
                        )
                    },
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                                "font-medium text-bon-green-start underline-offset-2 hover:underline",
                                isChat && "break-all"
                            )}
                        >
                            {children}
                        </a>
                    ),
                    code: ({ className: codeClassName, children, ...props }) => {
                        const isInline = !codeClassName
                        if (isInline) {
                            return (
                                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-800" {...props}>
                                    {children}
                                </code>
                            )
                        }

                        return (
                            <code className={cn("block overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-100", codeClassName)} {...props}>
                                {children}
                            </code>
                        )
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}
