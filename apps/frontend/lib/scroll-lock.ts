let lockCount = 0
let previousBodyOverflow = ""
let previousHtmlOverflow = ""

export function lockDocumentScroll() {
    if (typeof document === "undefined") {
        return () => undefined
    }

    const { body, documentElement } = document

    if (lockCount === 0) {
        previousBodyOverflow = body.style.overflow
        previousHtmlOverflow = documentElement.style.overflow
        body.style.overflow = "hidden"
        documentElement.style.overflow = "hidden"
    }

    lockCount += 1

    return () => {
        lockCount = Math.max(0, lockCount - 1)

        if (lockCount === 0) {
            body.style.overflow = previousBodyOverflow
            documentElement.style.overflow = previousHtmlOverflow
        }
    }
}
