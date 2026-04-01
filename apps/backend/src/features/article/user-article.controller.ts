import { Controller, Get, Inject, NotFoundException, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import type { ArticleDetail } from "@bon/contracts";
import { BranchSessionGuard } from "../../common/guards/branch-session.guard";
import { ArticleService } from "./article.service";

@UseGuards(BranchSessionGuard)
@Controller("user/articles")
export class UserArticleController {
  constructor(@Inject(ArticleService) private readonly articleService: ArticleService) {}

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number): Promise<ArticleDetail> {
    const article = await this.articleService.getPublishedDetail(id);
    if (!article) {
      throw new NotFoundException("문서를 찾을 수 없습니다.");
    }

    return article;
  }
}
