import { BadRequestException, Body, Controller, Get, Inject, Post, Req, Session, UnauthorizedException } from "@nestjs/common";
import { AdminLoginRequestSchema, BranchLoginRequestSchema, SmsSendRequestSchema, SmsVerifyRequestSchema, type AdminLoginRequest, type BranchLoginRequest, type SmsSendRequest, type SmsVerifyRequest } from "@bon/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { SessionUser } from "@bon/entities";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { RequestWithSession } from "../../common/types/request-with-session";
import { AuthService } from "./auth.service";

const smsSendBodyPipe = new ZodValidationPipe(SmsSendRequestSchema);
const smsVerifyBodyPipe = new ZodValidationPipe(SmsVerifyRequestSchema);

const adminLoginBodyPipe = new ZodValidationPipe(AdminLoginRequestSchema);
const branchLoginBodyPipe = new ZodValidationPipe(BranchLoginRequestSchema);

function saveSession(session: RequestWithSession["session"]) {
  return new Promise<void>((resolve, reject) => {
    session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("admin/login")
  async loginAdmin(
    @Body(adminLoginBodyPipe) body: AdminLoginRequest,
    @Session() session: RequestWithSession["session"]
  ): Promise<SessionUser> {
    const user = await this.authService.loginAdmin(body.username, body.password);
    session.user = user;
    await saveSession(session);
    return user;
  }

  @Post("sms/send")
  async sendSms(
    @Body(smsSendBodyPipe) body: SmsSendRequest
  ): Promise<{ success: true }> {
    await this.authService.sendSmsOtp(body.branchCode);
    return { success: true };
  }

  @Post("sms/verify")
  async verifySms(
    @Body(smsVerifyBodyPipe) body: SmsVerifyRequest,
    @Session() session: RequestWithSession["session"]
  ): Promise<{ success: true }> {
    const valid = await this.authService.verifySmsOtp(body.branchCode, body.code);
    if (!valid) throw new BadRequestException("인증번호가 올바르지 않거나 만료되었습니다.");
    session.smsVerified = true;
    await saveSession(session);
    return { success: true };
  }

  @Post("branch/login")
  async loginBranch(
    @Body(branchLoginBodyPipe) body: BranchLoginRequest,
    @Session() session: RequestWithSession["session"]
  ): Promise<SessionUser> {
    if (!session.smsVerified) {
      throw new UnauthorizedException("SMS 인증이 필요합니다.");
    }
    const user = await this.authService.loginBranch(body.codeOrName, body.password);
    session.user = user;
    session.smsVerified = false;
    await saveSession(session);
    return user;
  }

  @Post("logout")
  async logout(@Req() request: RequestWithSession): Promise<{ success: true }> {
    await new Promise<void>((resolve, reject) => {
      request.session.destroy((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    return { success: true };
  }

  @Get("me")
  getMe(@CurrentUser() user: SessionUser | undefined): SessionUser | null {
    return user ?? null;
  }
}
