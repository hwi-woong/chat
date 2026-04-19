import { z } from "zod";
import {
  optionalBoolean,
  optionalNonNegativeInt,
  optionalNullableTrimmedString,
  optionalPositiveInt,
  optionalString,
  optionalTrimmedString,
  requiredTrimmedString
} from "./schema-helpers";

export interface CategorySummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  article_count: string;
}

export interface ArticleSummary {
  id: number;
  category_id: number;
  title: string;
  content: string;
  summary?: string | null;
  priority: number;
  requires_sm: boolean;
  is_published: boolean;
}

export interface ArticleDetail extends ArticleSummary {
  category_code: string;
  category_name: string;
}

export interface BranchSummary {
  id: number;
  code: string;
  name: string;
  authorized_phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CreateCategoryRequestSchema = z.object({
  code: requiredTrimmedString(50),
  name: requiredTrimmedString(100),
  description: optionalNullableTrimmedString(500),
  sort_order: optionalNonNegativeInt()
}).strict();
export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;

export const UpdateCategoryRequestSchema = z.object({
  name: optionalTrimmedString(100),
  description: optionalNullableTrimmedString(500),
  sort_order: optionalNonNegativeInt(),
  is_active: optionalBoolean()
}).strict();
export type UpdateCategoryRequest = z.infer<typeof UpdateCategoryRequestSchema>;

export const CreateBranchRequestSchema = z.object({
  code: requiredTrimmedString(50),
  name: requiredTrimmedString(100),
  password: z.string().min(1),
  authorized_phone: z.string().regex(/^01[0-9]{8,9}$/).optional()
}).strict();
export type CreateBranchRequest = z.infer<typeof CreateBranchRequestSchema>;

export const UpdateBranchRequestSchema = z.object({
  name: optionalTrimmedString(100),
  password: optionalString(),
  is_active: optionalBoolean(),
  authorized_phone: z.union([z.string().regex(/^01[0-9]{8,9}$/), z.literal("")]).optional()
}).strict();
export type UpdateBranchRequest = z.infer<typeof UpdateBranchRequestSchema>;

export const CreateArticleRequestSchema = z.object({
  category_id: z.coerce.number().int().min(1),
  title: requiredTrimmedString(200),
  content: requiredTrimmedString(),
  priority: optionalNonNegativeInt(),
  requires_sm: optionalBoolean(),
  is_published: optionalBoolean()
}).strict();
export type CreateArticleRequest = z.infer<typeof CreateArticleRequestSchema>;

export const UpdateArticleRequestSchema = z.object({
  category_id: optionalPositiveInt(),
  title: optionalTrimmedString(200),
  content: optionalTrimmedString(),
  priority: optionalNonNegativeInt(),
  requires_sm: optionalBoolean(),
  is_published: optionalBoolean()
}).strict();
export type UpdateArticleRequest = z.infer<typeof UpdateArticleRequestSchema>;

export const ListArticlesQuerySchema = z.object({
  category_id: optionalPositiveInt(),
  is_published: optionalBoolean(),
  page: optionalPositiveInt(),
  page_size: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    return value;
  }, z.coerce.number().int().min(1).max(100).optional())
}).strict();
export type ListArticlesQuery = z.infer<typeof ListArticlesQuerySchema>;

export const CreateArticleImageUploadUrlRequestSchema = z.object({
  file_name: requiredTrimmedString(255),
  content_type: z.string().trim().toLowerCase().min(1).max(100).regex(/^image\/[a-z0-9.+-]+$/)
}).strict();
export type CreateArticleImageUploadUrlRequest = z.infer<typeof CreateArticleImageUploadUrlRequestSchema>;

export interface CreateArticleImageUploadUrlResponse {
  object_key: string;
  upload_url: string;
  public_url: string;
  method: "PUT";
  headers: Record<string, string>;
}
