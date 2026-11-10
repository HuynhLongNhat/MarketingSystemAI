import { Workflow } from "lucide-react";

import { CrmEmptyState } from "@/modules/dashboard/ui/components/crm-empty-state";

export default function PipelinePage() {
  return (
    <CrmEmptyState
      eyebrow="Sales CRM"
      title="Pipeline"
      description="Pipeline và Deals sẽ được xây dựng trên Leads và Contacts sau khi quy tắc stage, quyền sở hữu và báo cáo được thống nhất."
      icon={Workflow}
      details="Phase 1 chỉ chuẩn bị navigation và ranh giới dữ liệu. Chưa có Deal hoặc pipeline giả để tránh hiển thị thông tin không xác thực."
    />
  );
}
