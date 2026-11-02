
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
  "#79aee8",
  "#b89cde",
  "#78bda5",
  "#e5b878",
  "#df9caa",
  "#79c6c4",
] as const;

/**
 * Stable color identity based on Agent ID.
 * Moving an Agent to another desk must not change its color.
 */
function agentColor(agentId: string): string {
  let hash = 2166136261;

  for (let i = 0; i < agentId.length; i++) {
    hash ^= agentId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return COLORS[(hash >>> 0) % COLORS.length]!;
}

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
  const unassignedAgents: AiAgent[] = [];

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
      color: agentColor(agent.id),
      status: visualStatus,
    });

    seatedAgentIds.add(agent.id);
    occupiedDeskIds.add(saved.deskId);
  }

  for (const agent of agents) {
    if (
      isOfficeEligible(agent) &&
      !seatedAgentIds.has(agent.id)
    ) {
      unassignedAgents.push(agent);
    }
  }

  unassignedAgents.sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    assignments,
    characters,
    unassignedAgents,
  };
}
