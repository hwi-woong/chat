import type {
  ChatRequest,
  ChatSessionListItem,
  ChatSessionMessageItem
} from "@bon/contracts";
import { apiGet, apiPost, apiStream } from "@/lib/api/http";

export function getChatSessions() {
  return apiGet<ChatSessionListItem[]>("/api/chat-sessions", { cache: "no-store" }, "대화 목록을 불러오지 못했습니다.");
}

export function createChatSession(title?: string) {
  return apiPost<ChatSessionListItem>(
    "/api/chat-sessions",
    title ? { title } : {},
    { cache: "no-store" },
    "새 대화를 생성하지 못했습니다."
  );
}

export function getChatSessionMessages(sessionId: number) {
  return apiGet<ChatSessionMessageItem[]>(
    `/api/chat-sessions/${sessionId}/messages`,
    { cache: "no-store" },
    "대화 내용을 불러오지 못했습니다."
  );
}

export function openChatStream(body: ChatRequest) {
  return apiStream("/api/user/chat/stream", body, "채팅 스트림 연결에 실패했습니다.");
}
