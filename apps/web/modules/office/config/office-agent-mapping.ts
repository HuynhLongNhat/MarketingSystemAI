
import type {
  AiAgent,
  Department,
} from "@/lib/workforce-api";

import type {
  OfficeDeskAssignment,
} from "@/lib/office-api";

import { OFFICE_LAYOUT } from "./office-layout";

import type {
  OfficeAgentStatus,
  OfficeCharacterData,
} from "../characters/office-characters";

export interface OfficeAgentAssignment {
  deskId: string;
  agent: AiAgent;
  departmentName: string | null;
  visualStatus: OfficeAgentStatus;
}

export interface OfficeAgentMapping {
  assignments: OfficeAgentAssignment[];
  characters: OfficeCharacterData[];
  unassignedAgents: AiAgent[];
}

const COLORS = [
  "#60a5fa",
  "#c084fc",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#2dd4bf",
] as const;

export function isOfficeEligible(
  agent: AiAgent,
): boolean {
  return (
    agent.status === "active" ||
    agent.status === "paused"
  );
}

// Visual state, not worker execution state.
export function mapAgentVisualStatus(
  agent: AiAgent,
): OfficeAgentStatus {
  return agent.status === "active"
    ? "idle"
    : "offline";
}

export function mapAgentsToOffice(
  agents: readonly AiAgent[],
  departments: readonly Department[],
  savedAssignments: readonly OfficeDeskAssignment[],
): OfficeAgentMapping {
  const agentById = new Map(
    agents.map((agent) => [agent.id, agent]),
  );

  const departmentNames = new Map(
    departments.map((department) => [
      department.id,
      department.name,
    ]),
  );

  const validDeskIds = new Set(
    OFFICE_LAYOUT.desks.map((desk) => desk.id),
  );

  const assignments: OfficeAgentAssignment[] = [];
  const characters: OfficeCharacterData[] = [];
  const seatedAgentIds = new Set<string>();
  const occupiedDeskIds = new Set<string>();

  for (const saved of savedAssignments) {
    if (!validDeskIds.has(saved.deskId)) continue;
    if (occupiedDeskIds.has(saved.deskId)) continue;
    if (seatedAgentIds.has(saved.agentId)) continue;

    const agent = agentById.get(saved.agentId);

    if (!agent || !isOfficeEligible(agent)) {
      continue;
    }

    const visualStatus = mapAgentVisualStatus(agent);
    const deskIndex = OFFICE_LAYOUT.desks.findIndex(
      (desk) => desk.id === saved.deskId,
    );

    assignments.push({
      deskId: saved.deskId,
      agent,
      departmentName: agent.departmentId
        ? departmentNames.get(agent.departmentId) ?? null
        : null,
      visualStatus,
    });

    characters.push({
      id: agent.id,
      deskId: saved.deskId,
      name: agent.name,
      color: COLORS[deskIndex % COLORS.length]!,
      status: visualStatus,
    });

    seatedAgentIds.add(agent.id);
    occupiedDeskIds.add(saved.deskId);
  }

  const unassignedAgents = agents
    .filter(
      (agent) =>
        isOfficeEligible(agent) &&
        !seatedAgentIds.has(agent.id),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    assignments,
    characters,
    unassignedAgents,
  };
}
