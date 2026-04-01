import { Body, Controller, Get, Inject, Post, Req, Session } from "@nestjs/common";
import { AdminLoginRequestSchema, BranchLoginRequestSchema, type AdminLoginRequest, type BranchLoginRequest } from "@bon/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { SessionUser } from "@bon/entities";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { RequestWithSession } from "../../common/types/request-with-session";
import { AuthService } from "./auth.service";

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

  @Post("branch/login")
  async loginBranch(
    @Body(branchLoginBodyPipe) body: BranchLoginRequest,
    @Session() session: RequestWithSession["session"]
  ): Promise<SessionUser> {
    const user = await this.authService.loginBranch(body.codeOrName, body.password);
    session.user = user;
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
