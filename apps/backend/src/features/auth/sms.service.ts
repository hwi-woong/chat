import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const apiKey = process.env.ALIGO_API_KEY;
    const userId = process.env.ALIGO_USER_ID;
    const sender = process.env.ALIGO_SENDER;

    if (!apiKey || !userId || !sender) {
      throw new InternalServerErrorException("SMS 설정이 올바르지 않습니다.");
    }

    const params = new URLSearchParams({
      key: apiKey,
      userid: userId,
      sender,
      receiver: phone,
      msg: `[Bonif] 인증번호는 [${code}]입니다. 5분 내에 입력해주세요.`,
      msg_type: "SMS"
    });

    const response = await fetch("https://apis.aligo.in/send/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    const result = await response.json() as { result_code: string; message: string };

    if (result.result_code !== "1") {
      this.logger.error(`Aligo SMS 발송 실패: ${result.message}`);
      throw new InternalServerErrorException("SMS 발송에 실패했습니다.");
    }
  }
}
