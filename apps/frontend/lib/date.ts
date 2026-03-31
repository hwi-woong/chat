const koreanDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul"
})

export function formatKoreanDateTime(value: string | null, fallback = "메시지 없음") {
    if (!value) {
        return fallback
    }

    return koreanDateTimeFormatter.format(new Date(value))
}
