import { apiFetch } from "./api-client";

export interface WebsiteTemplate {
  id: "business-corporate" | "real-estate-landing" | "digital-agency-landing";
  name: string;
  category: string;
  description: string;
  sections: string[];
}

export interface WebsiteProject {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  projectType: "landing_page" | "custom";
  templateId: WebsiteTemplate["id"] | null;
  status: "draft" | "queued" | "generating" | "validating" | "ready" | "failed" | "cancelled";
  websiteConfig: Record<string, unknown>;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebsiteProjectInput {
  name: string;
  templateId: WebsiteTemplate["id"];
  description?: string;
}

const BASE_PATH = "/website-services";

export const websiteServicesApi = {
  listTemplates() { return apiFetch<WebsiteTemplate[]>(`${BASE_PATH}/templates`); },
  listProjects() { return apiFetch<WebsiteProject[]>(`${BASE_PATH}/projects`); },
  getProject(id: string) { return apiFetch<WebsiteProject>(`${BASE_PATH}/projects/${encodeURIComponent(id)}`); },
  createProject(input: CreateWebsiteProjectInput) { return apiFetch<WebsiteProject>(`${BASE_PATH}/projects`, { method: "POST", body: JSON.stringify(input) }); },
  deleteProject(id: string) { return apiFetch<{ success: boolean; id: string }>(`${BASE_PATH}/projects/${encodeURIComponent(id)}`, { method: "DELETE" }); },
};
