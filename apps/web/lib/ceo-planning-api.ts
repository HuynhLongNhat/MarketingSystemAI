import { apiFetch } from "./api-client";
export type CeoPlan = { id:string; ceoAgentId:string; taskId:string; title:string; objective:string; approvalStatus:"pending"|"approved"|"rejected"; decisionNote:string|null; decidedAt:string|null; createdAt:string; updatedAt:string };
export const ceoPlanningApi = {
  list: () => apiFetch<CeoPlan[]>("/ceo-plans"),
  create: (input:{ceoAgentId:string;title:string;objective:string}) => apiFetch<CeoPlan>("/ceo-plans", { method:"POST", body:JSON.stringify(input) }),
  decide: (id:string, input:{decision:"approved"|"rejected";note?:string}) => apiFetch<CeoPlan>(`/ceo-plans/${encodeURIComponent(id)}/decision`, { method:"POST", body:JSON.stringify(input) }),
};
