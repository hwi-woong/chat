import { z } from "zod";
import { requiredTrimmedString } from "./schema-helpers";

export const LegacyAuthModeSchema = z.enum(["admin", "user"]);
export type LegacyAuthMode = z.infer<typeof LegacyAuthModeSchema>;

export const VerifyPasswordRequestSchema = z.object({
  mode: LegacyAuthModeSchema,
  password: z.string().min(1)
}).strict();
export type VerifyPasswordRequest = z.infer<typeof VerifyPasswordRequestSchema>;

export interface VerifyPasswordResponse {
  role: "admin" | "branch";
  adminId?: number;
  branchId?: number;
  branchCode?: string;
  branchName?: string;
}

export const AdminLoginRequestSchema = z.object({
  username: requiredTrimmedString(),
  password: z.string().min(1)
}).strict();
export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;

export const BranchLoginRequestSchema = z.object({
  codeOrName: requiredTrimmedString(),
  password: z.string().min(1)
}).strict();
export type BranchLoginRequest = z.infer<typeof BranchLoginRequestSchema>;

export interface AuthUserPayload {
  role: "admin" | "branch";
  adminId?: number;
  branchId?: number;
  branchCode?: string;
  branchName?: string;
}

export type LoginResponse = AuthUserPayload;

export const SmsSendRequestSchema = z.object({
  phone: z.string().regex(/^01[0-9]{8,9}$/, "올바른 휴대폰 번호를 입력해주세요.")
}).strict();
export type SmsSendRequest = z.infer<typeof SmsSendRequestSchema>;

export const SmsVerifyRequestSchema = z.object({
  phone: z.string().min(1),
  code: z.string().length(6)
}).strict();
export type SmsVerifyRequest = z.infer<typeof SmsVerifyRequestSchema>;
