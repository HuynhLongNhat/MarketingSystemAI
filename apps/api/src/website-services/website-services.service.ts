import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type { RequestContext } from "../auth/request-context.js";
import {
  CreateWebsiteProjectDto,
  UpdateWebsiteProjectDto,
} from "./website-services.dto.js";
import { isWebsiteTemplateId, WEBSITE_TEMPLATES } from "./template-registry.js";
import { WebsiteProjectsRepository } from "./website-projects.repository.js";

@Injectable()
export class WebsiteServicesService {
  constructor(private readonly projects: WebsiteProjectsRepository) {}

  listTemplates() {
    return WEBSITE_TEMPLATES;
  }

  list(context: RequestContext) {
    return this.projects.list(context);
  }

  async getById(context: RequestContext, id: string) {
    const project = await this.projects.findById(context, id);
    if (!project) throw new NotFoundException("Website project not found");
    return project;
  }

  create(context: RequestContext, dto: CreateWebsiteProjectDto) {
    if (!isWebsiteTemplateId(dto.templateId)) {
      throw new BadRequestException("Unsupported website template");
    }
    return this.projects.create(context, {
      name: this.normalizeName(dto.name),
      description: this.normalizeDescription(dto.description),
      templateId: dto.templateId,
    });
  }

  async update(context: RequestContext, id: string, dto: UpdateWebsiteProjectDto) {
    const values: { name?: string; description?: string | null } = {};
    if (dto.name !== undefined) values.name = this.normalizeName(dto.name);
    if (dto.description !== undefined) values.description = this.normalizeDescription(dto.description);
    const project = await this.projects.update(context, id, values);
    if (!project) throw new NotFoundException("Website project not found");
    return project;
  }

  async remove(context: RequestContext, id: string) {
    const project = await this.projects.remove(context, id);
    if (!project) throw new NotFoundException("Website project not found");
    return { success: true, id: project.id };
  }

  private normalizeName(name: string) {
    const value = name.trim();
    if (!value) throw new BadRequestException("Website project name cannot be empty");
    return value;
  }

  private normalizeDescription(value: string | undefined) {
    return value?.trim() || null;
  }
}
