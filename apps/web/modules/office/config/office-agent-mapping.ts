
import type {
  AiAgent,
  Department,
} from "@/lib/workforce-api";

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

// This is a visual approximation, NOT runtime execution state.
export function mapAgentVisualStatus(
  agent: AiAgent,
): OfficeAgentStatus {
  switch (agent.status) {
    case "active":
      return "idle";
    case "draft":
      return "thinking";
    case "paused":
    case "archived":
      return "offline";
    default:
      return "offline";
  }
}

export function mapAgentsToOffice(
  agents: readonly AiAgent[],
  departments: readonly Department[],
): OfficeAgentMapping {
  const departmentNames = new Map(
    departments.map((department) => [
      department.id,
      department.name,
    ]),
  );

  // Stable ordering, independent of API response order.
  const sortedAgents = [...agents].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  const assignments: OfficeAgentAssignment[] = [];
  const characters: OfficeCharacterData[] = [];

  const seatedAgents = sortedAgents.slice(
    0,
    OFFICE_LAYOUT.desks.length,
  );

  for (const [index, agent] of seatedAgents.entries()) {
    const desk = OFFICE_LAYOUT.desks[index];
    if (!desk) continue;

    const visualStatus = mapAgentVisualStatus(agent);

    assignments.push({
      deskId: desk.id,
      agent,
      departmentName: agent.departmentId
        ? departmentNames.get(agent.departmentId) ?? null
        : null,
      visualStatus,
    });

    characters.push({
      id: agent.id,
      deskId: desk.id,
      name: agent.name,
      color: COLORS[index % COLORS.length]!,
      status: visualStatus,
    });
  }

  return {
    assignments,
    characters,
    unassignedAgents: sortedAgents.slice(
      OFFICE_LAYOUT.desks.length,
    ),
  };
}
