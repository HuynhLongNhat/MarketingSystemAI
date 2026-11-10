import { ClipboardList } from "lucide-react";

import { CrmEmptyState } from "@/modules/dashboard/ui/components/crm-empty-state";

export default function TasksPage() {
  return (
    <CrmEmptyState
      eyebrow="Workspace"
      title="Công việc"
      description="Công việc follow-up và activity sẽ được gắn với Contact, Lead hoặc Deal khi module Operations được triển khai."
      icon={ClipboardList}
      details="Chưa có API Task trong hệ thống nên trang này chỉ là shell có chủ đích, không có dữ liệu hoặc nút thao tác giả."
    />
  );
}
