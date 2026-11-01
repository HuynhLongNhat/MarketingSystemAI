
import { apiFetch } from "./api-client";

export type AgentStatus =
  | "draft"
  | "active"
  | "paused"
  | "archived";

export type AgentCategory =
  | "marketing"
  | "sales"
  | "support"
  | "research"
  | "operations"
  | "other";

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiAgent {
  id: string;
  organizationId: string;
  departmentId: string | null;
  templateId: string | null;
  name: string;
  description: string | null;
  role: string;
  status: AgentStatus;
  systemPrompt: string;
  connectionId: string | null;
  modelId: string | null;
  toolConfig: {
    enabledTools: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface AgentTemplate {
  id: string;
  organizationId: string | null;
  name: string;
  slug: string;
  category: AgentCategory;
  description: string | null;
  systemPrompt: string;
  version: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentInput {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  slug?: string;
  description?: string;
}

export interface CreateAgentInput {
  name: string;
  role: string;
  systemPrompt: string;
  description?: string;
  departmentId?: string;
  connectionId?: string;
  modelId?: string;
  enabledTools?: string[];
}

export interface UpdateAgentInput {
  name?: string;
  role?: string;
  systemPrompt?: string;
  description?: string;
  departmentId?: string | null;
  connectionId?: string | null;
  modelId?: string | null;
  status?: AgentStatus;
  enabledTools?: string[];
}

export interface CreateAgentTemplateInput {
  name: string;
  slug: string;
  category?: AgentCategory;
  description?: string;
  systemPrompt: string;
  version?: string;
  isPublished?: boolean;
}

export type UpdateAgentTemplateInput =
  Partial<CreateAgentTemplateInput>;

export interface CreateAgentFromTemplateInput {
  name?: string;
  departmentId?: string;
  connectionId?: string;
  modelId?: string;
  enabledTools?: string[];
}

export const workforceApi = {
  listDepartments() {
    return apiFetch<Department[]>("/departments");
  },

  createDepartment(input: CreateDepartmentInput) {
    return apiFetch<Department>("/departments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateDepartment(
    id: string,
    input: UpdateDepartmentInput,
  ) {
    return apiFetch<Department>(
      `/departments/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  },

  deleteDepartment(id: string) {
    return apiFetch<{ success: boolean; id: string }>(
      `/departments/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },

  listAgents() {
    return apiFetch<AiAgent[]>("/agents");
  },

  getAgent(id: string) {
    return apiFetch<AiAgent>(
      `/agents/${encodeURIComponent(id)}`,
    );
  },

  createAgent(input: CreateAgentInput) {
    return apiFetch<AiAgent>("/agents", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateAgent(id: string, input: UpdateAgentInput) {
    return apiFetch<AiAgent>(
      `/agents/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  },

  deleteAgent(id: string) {
    return apiFetch<{ success: boolean; id: string }>(
      `/agents/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },

  listTemplates() {
    return apiFetch<AgentTemplate[]>("/agent-templates");
  },

  getTemplate(id: string) {
    return apiFetch<AgentTemplate>(
      `/agent-templates/${encodeURIComponent(id)}`,
    );
  },

  createTemplate(input: CreateAgentTemplateInput) {
    return apiFetch<AgentTemplate>("/agent-templates", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateTemplate(
    id: string,
    input: UpdateAgentTemplateInput,
  ) {
    return apiFetch<AgentTemplate>(
      `/agent-templates/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  },

  deleteTemplate(id: string) {
    return apiFetch<{ success: boolean; id: string }>(
      `/agent-templates/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },

  createAgentFromTemplate(
    id: string,
    input: CreateAgentFromTemplateInput,
  ) {
    return apiFetch<AiAgent>(
      `/agent-templates/${encodeURIComponent(id)}/create-agent`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  },
};
