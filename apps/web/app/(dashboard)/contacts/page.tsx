import { ContactRound } from "lucide-react";

import { CrmEmptyState } from "@/modules/dashboard/ui/components/crm-empty-state";

export default function ContactsPage() {
  return (
    <CrmEmptyState
      eyebrow="CRM Foundation"
      title="Khách hàng"
      description="Danh bạ CRM sẽ hợp nhất các định danh đã được xác minh từ website widget và những kênh kết nối trong tương lai."
      icon={ContactRound}
      details="Chưa có API quản lý liên hệ trong Phase 1, nên trang này không hiển thị dữ liệu mẫu. Contact vẫn tách biệt với khách truy cập và phiên widget hiện có."
    />
  );
}
