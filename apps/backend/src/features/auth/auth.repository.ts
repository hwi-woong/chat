import { Inject, Injectable } from "@nestjs/common";
import { admins, smsVerifications } from "@bon/db";
import { and, eq, isNull, lt } from "drizzle-orm";
import { DRIZZLE_DB } from "../../infrastructure/database/drizzle.constants";
import type { DrizzleDb } from "../../infrastructure/database/drizzle.types";

@Injectable()
export class AuthRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findActiveAdminByUsername(username: string) {
    const [admin] = await this.db
      .select()
      .from(admins)
      .where(and(eq(admins.username, username), eq(admins.isActive, true)))
      .limit(1);

    return admin ?? null;
  }

  async createSmsVerification(phone: string, code: string, expiresAt: Date) {
    const [row] = await this.db
      .insert(smsVerifications)
      .values({ phone, code, expiresAt })
      .returning();
    return row;
  }

  async findValidSmsVerification(phone: string, code: string) {
    const now = new Date();
    const [row] = await this.db
      .select()
      .from(smsVerifications)
      .where(
        and(
          eq(smsVerifications.phone, phone),
          eq(smsVerifications.code, code),
          isNull(smsVerifications.usedAt),
          lt(now, smsVerifications.expiresAt)
        )
      )
      .orderBy(smsVerifications.createdAt)
      .limit(1);
    return row ?? null;
  }

  async markSmsVerificationUsed(id: number) {
    await this.db
      .update(smsVerifications)
      .set({ usedAt: new Date() })
      .where(eq(smsVerifications.id, id));
  }

  async deleteExpiredSmsVerifications() {
    const now = new Date();
    await this.db
      .delete(smsVerifications)
      .where(lt(smsVerifications.expiresAt, now));
  }
}
