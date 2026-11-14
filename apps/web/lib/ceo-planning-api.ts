import { apiFetch } from "./api-client";
export type CeoPlan = { id:string; ceoAgentId:string; taskId:string; title:string; objective:string; approvalStatus:"pending"|"approved"|"rejected"; decisionNote:string|null; decidedAt:string|null; retryOfPlanId:string|null; retryPlanId:string|null; retryStartedAt:string|null; retryCount:number; taskStatus:"queued"|"running"|"completed"|"failed"|"cancelled"|null; createdAt:string; updatedAt:string };
export const ceoPlanningApi = {
  list: () => apiFetch<CeoPlan[]>("/ceo-plans"),
  create: (input:{ceoAgentId:string;title:string;objective:string}) => apiFetch<CeoPlan>("/ceo-plans", { method:"POST", body:JSON.stringify(input) }),
  retry: (id:string) => apiFetch<CeoPlan>(`/ceo-plans/${encodeURIComponent(id)}/retry`, { method:"POST" }),
  decide: (id:string, input:{decision:"approved"|"rejected";note?:string}) => apiFetch<CeoPlan>(`/ceo-plans/${encodeURIComponent(id)}/decision`, { method:"POST", body:JSON.stringify(input) }),
  remove: (id:string) => apiFetch<{deleted:true}>(`/ceo-plans/${encodeURIComponent(id)}`, { method:"DELETE" }),
};
