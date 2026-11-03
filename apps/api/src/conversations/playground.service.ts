import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";

import type { RequestContext } from "../auth/request-context.js";

import type { PlaygroundChatDto } from "./playground.dto.js";
import {
  normalizePlaygroundMessages,
  PlaygroundLimiter,
} from "./playground-policy.js";
import {
  PublicWidgetAiService,
  type AiFailureCode,
  type AiGenerationMeta,
  type PlaygroundOverview,
} from "./public-widget-ai.service.js";

export type PlaygroundChatResponse =
  | { ok: true; reply: string; meta: AiGenerationMeta }
  | { ok: false; error: { code: AiFailureCode; message: string } };

const AI_ERROR_MESSAGES: Record<AiFailureCode, string> = {
  no_user_message:
    "Không có tin nhắn hợp lệ để xử lý.",

  agent_ambiguous:
    "Có nhiều nhân viên CSKH đang hoạt động. Hãy để lại đúng một nhân viên ở trạng thái hoạt động.",

  not_configured:
    "Chưa cấu hình mô hình AI khả dụng cho nhân viên CSKH.",

  provider_error:
    "Không thể kết nối tới nhà cung cấp AI. Vui lòng thử lại.",

  provider_auth_failed:
    "API key của nhà cung cấp AI không hợp lệ. Hãy kiểm tra lại cấu hình.",

  provider_forbidden:
    "API key không có quyền sử dụng dịch vụ hoặc mô hình này.",

  quota_exceeded:
    "Tài khoản nhà cung cấp AI đã hết hạn mức sử dụng hoặc tín dụng.",

  rate_limited:
    "Nhà cung cấp AI đang giới hạn số lượng yêu cầu. Vui lòng thử lại sau.",

  invalid_model:
    "Không tìm thấy mô hình AI đã cấu hình. Hãy kiểm tra lại Model ID.",

  provider_request_error:
    "Yêu cầu gửi tới nhà cung cấp AI không hợp lệ. Hãy kiểm tra cấu hình mô hình.",

  provider_unavailable:
    "Nhà cung cấp AI đang gặp sự cố. Hệ thống đã thử kết nối lại.",

  timeout:
    "Nhà cung cấp AI phản hồi quá chậm (quá 20 giây).",

  empty_response:
    "Mô hình trả về nội dung rỗng.",
};

const LIMIT_MESSAGES = {
  busy: {
    code: "PLAYGROUND_BUSY",
    message: "Yêu cầu trước vẫn đang được xử lý. Vui lòng đợi phản hồi.",
  },
  rate_limited: {
    code: "PLAYGROUND_RATE_LIMITED",
    message: "Bạn gửi quá nhanh. Vui lòng đợi một lát rồi thử lại.",
  },
  daily_limit: {
    code: "PLAYGROUND_DAILY_LIMIT",
    message: "Tổ chức đã đạt giới hạn thử nghiệm trong 24 giờ qua.",
  },
} as const;

const INPUT_MESSAGES = {
  empty: "Vui lòng nhập tin nhắn.",
  last_not_user: "Tin nhắn cuối cùng phải là của người dùng.",
  too_long: "Tin nhắn hoặc lịch sử hội thoại quá dài.",
} as const;

function readPositiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

@Injectable()
export class PlaygroundService {
  private readonly logger = new Logger(PlaygroundService.name);

  private readonly limiter = new PlaygroundLimiter({
    perUserPerMinute: readPositiveInt("PLAYGROUND_RATE_PER_MINUTE", 10),
    perOrganizationPerDay: readPositiveInt("PLAYGROUND_DAILY_LIMIT", 200),
  });

  constructor(private readonly aiService: PublicWidgetAiService) {}

  getOverview(context: RequestContext): Promise<PlaygroundOverview> {
    return this.aiService.getPlaygroundOverview(context.organizationId);
  }

  async chat(
    context: RequestContext,
    dto: PlaygroundChatDto,
  ): Promise<PlaygroundChatResponse> {
    const normalized = normalizePlaygroundMessages(dto.messages);

    if (!normalized.ok) {
      throw new BadRequestException({
        code: "INVALID_MESSAGES",
        message: INPUT_MESSAGES[normalized.code],
      });
    }

    const decision = this.limiter.acquire(
      context.organizationId,
      context.userId,
    );

    if (!decision.ok) {
      const limit = LIMIT_MESSAGES[decision.reason];

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: limit.code,
          message: limit.message,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      const result = await this.aiService.generatePlaygroundReply(
        normalized.messages,
        context.organizationId,
      );

      // Chỉ ghi định danh và kết quả, không ghi nội dung tin nhắn.
      this.logger.log(
        `Playground chat org=${context.organizationId} user=${context.userId} ` +
          (result.ok
            ? `ok latencyMs=${result.meta.latencyMs}`
            : `failed code=${result.code}`),
      );

      if (!result.ok) {
        return {
          ok: false,
          error: {
            code: result.code,
            message: AI_ERROR_MESSAGES[result.code],
          },
        };
      }

      return { ok: true, reply: result.reply, meta: result.meta };
    } finally {
      decision.release();
    }
  }
}