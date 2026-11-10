import { Target } from "lucide-react";

import { CrmEmptyState } from "@/modules/dashboard/ui/components/crm-empty-state";

export default function LeadsPage() {
  return (
    <CrmEmptyState
      eyebrow="CRM Foundation"
      title="Leads"
      description="Lead là một nhu cầu bán hàng được tạo có chủ đích cho một Contact, không được tự sinh từ mọi tin nhắn của khách."
      icon={Target}
      details="API tạo và phân công Lead sẽ được bổ sung khi quy trình sales được xác nhận. Hiện chưa có dữ liệu hay thao tác giả trên trang này."
    />
  );
}
