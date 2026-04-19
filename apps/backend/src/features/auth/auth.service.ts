import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { SessionUser } from "@bon/entities";
import { compare } from "bcrypt";
import { BranchRepository } from "../branch/branch.repository";
import { AuthRepository } from "./auth.repository";
import { SmsService } from "./sms.service";

const SMS_OTP_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository) private readonly authRepository: AuthRepository,
    @Inject(BranchRepository) private readonly branchRepository: BranchRepository,
    @Inject(SmsService) private readonly smsService: SmsService
  ) {}

  async loginAdmin(username: string, password: string): Promise<SessionUser> {
    const admin = await this.authRepository.findActiveAdminByUsername(username);

    if (!admin || !(await compare(password, admin.passwordHash))) {
      throw new UnauthorizedException("관리자 계정 또는 비밀번호가 올바르지 않습니다.");
    }

    return {
      role: "admin",
      adminId: admin.id
    };
  }

  async loginBranch(codeOrName: string, password: string): Promise<SessionUser> {
    const branch = await this.branchRepository.findActiveByCodeOrName(codeOrName);

    if (!branch || !(await compare(password, branch.passwordHash))) {
      throw new UnauthorizedException("지점 계정 또는 비밀번호가 올바르지 않습니다.");
    }

    await this.branchRepository.touchLogin(branch.id);

    return {
      role: "branch",
      branchId: branch.id,
      branchCode: branch.code,
      branchName: branch.name
    };
  }

  async sendSmsOtp(phone: string): Promise<void> {
    const code = this.smsService.generateCode();
    const expiresAt = new Date(Date.now() + SMS_OTP_TTL_MS);
    await this.authRepository.createSmsVerification(phone, code, expiresAt);
    await this.smsService.sendOtp(phone, code);
  }

  async verifySmsOtp(phone: string, code: string): Promise<boolean> {
    const record = await this.authRepository.findValidSmsVerification(phone, code);
    if (!record) return false;
    await this.authRepository.markSmsVerificationUsed(record.id);
    return true;
  }
}
