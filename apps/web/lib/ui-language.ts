
"use client";

import { useEffect, useState } from "react";

export type UiLanguage = "vi" | "en";
const KEY = "company-marketing-language";

export const messages = {
  vi: {
    workforce: "Đội ngũ AI",
    subtitle: "Quản lý nhân viên AI, phòng ban và mẫu nhân viên.",
    agents: "Nhân viên AI",
    departments: "Phòng ban",
    templates: "Mẫu nhân viên",
    total: "Tổng nhân viên",
    active: "Đang hoạt động",
    reload: "Làm mới",
    createAgent: "Tạo nhân viên",
    editAgent: "Chỉnh sửa nhân viên",
    createDepartment: "Tạo phòng ban",
    name: "Tên",
    role: "Vai trò",
    description: "Mô tả",
    department: "Phòng ban",
    status: "Trạng thái",
    connection: "Kết nối AI",
    model: "Mô hình AI",
    prompt: "Hướng dẫn hệ thống (System Prompt)",
    cancel: "Hủy",
    save: "Lưu thay đổi",
    create: "Tạo mới",
    unassigned: "Chưa phân phòng",
    noConnection: "Không sử dụng kết nối",
    chooseModel: "Chọn mô hình",
    searchModel: "Tìm theo tên hoặc ID mô hình...",
    noModel: "Không tìm thấy mô hình",
    loadingModels: "Đang tải danh sách mô hình...",
    chooseConnection: "Chọn kết nối AI trước",
    modelCount: "mô hình khả dụng",
    modelError: "Không thể tải danh sách mô hình",
    retry: "Thử lại",
    delete: "Xóa",
    deleteTitle: "Xóa nhân viên AI?",
    deleteDescription: "Hành động này không thể hoàn tác.",
    draft: "Bản nháp",
    paused: "Tạm dừng",
    archived: "Đã lưu trữ",
    running: "Hoạt động",
    emptyAgents: "Chưa có nhân viên AI",
    emptyDepartments: "Chưa có phòng ban",
    emptyTemplates: "Chưa có mẫu nhân viên",
    createFromTemplate: "Tạo từ mẫu",
    saved: "Đã lưu nhân viên AI",
    created: "Đã tạo nhân viên AI",
    deleted: "Đã xóa nhân viên AI",
    departmentCreated: "Đã tạo phòng ban",
    templateCreated: "Đã tạo nhân viên từ mẫu",
    required: "Vui lòng nhập tên, vai trò và hướng dẫn hệ thống.",
    loading: "Đang tải dữ liệu...",
    failed: "Thao tác thất bại",
    filterAll: "Tất cả phòng ban",
    language: "Ngôn ngữ",
    company: "Công ty",
    operations: "Vận hành",
    support: "Chăm sóc khách hàng",
    system: "Hệ thống",
    overview: "Tổng quan công ty",
    office: "Văn phòng AI",
    tasks: "Công việc & Quy trình",
    conversations: "Hội thoại",
    knowledge: "Kho kiến thức",
    customization: "Tùy chỉnh Chatbot",
    integrations: "Tích hợp Website",
    voice: "Trợ lý giọng nói",
    providers: "Nhà cung cấp AI",
    members: "Thành viên",
    billing: "Thanh toán",
    soon: "Sắp có",
    slug: "Mã phòng ban",
    selectStatus: "Chọn trạng thái",
    noModelsAvailable: "Không có mô hình trong danh mục",
    currentModel: "Mô hình đã lưu (không có trong danh mục)",
  },
  en: {
    workforce: "AI Workforce",
    subtitle: "Manage AI agents, departments and agent templates.",
    agents: "AI Agents",
    departments: "Departments",
    templates: "Agent Templates",
    total: "Total agents",
    active: "Active agents",
    reload: "Refresh",
    createAgent: "Create agent",
    editAgent: "Edit agent",
    createDepartment: "Create department",
    name: "Name",
    role: "Role",
    description: "Description",
    department: "Department",
    status: "Status",
    connection: "AI Connection",
    model: "AI Model",
    prompt: "System Prompt",
    cancel: "Cancel",
    save: "Save changes",
    create: "Create",
    unassigned: "Unassigned",
    noConnection: "No connection",
    chooseModel: "Select a model",
    searchModel: "Search by model name or ID...",
    noModel: "No models found",
    loadingModels: "Loading models...",
    chooseConnection: "Select an AI connection first",
    modelCount: "available models",
    modelError: "Unable to load models",
    retry: "Retry",
    delete: "Delete",
    deleteTitle: "Delete AI agent?",
    deleteDescription: "This action cannot be undone.",
    draft: "Draft",
    paused: "Paused",
    archived: "Archived",
    running: "Active",
    emptyAgents: "No AI agents yet",
    emptyDepartments: "No departments yet",
    emptyTemplates: "No agent templates yet",
    createFromTemplate: "Create from template",
    saved: "AI agent updated",
    created: "AI agent created",
    deleted: "AI agent deleted",
    departmentCreated: "Department created",
    templateCreated: "Agent created from template",
    required: "Please provide a name, role and system prompt.",
    loading: "Loading data...",
    failed: "Operation failed",
    filterAll: "All departments",
    language: "Language",
    company: "Company",
    operations: "Operations",
    support: "Customer Support",
    system: "System",
    overview: "Company overview",
    office: "AI Office",
    tasks: "Tasks & Workflows",
    conversations: "Conversations",
    knowledge: "Knowledge base",
    customization: "Chatbot customization",
    integrations: "Website integration",
    voice: "Voice assistant",
    providers: "AI Providers",
    members: "Members",
    billing: "Billing",
    soon: "Soon",
    slug: "Department slug",
    selectStatus: "Select status",
    noModelsAvailable: "No models in catalog",
    currentModel: "Previously saved model (not in catalog)",
  },
} as const;

export function useUiLanguage() {
  const [language, setLanguageState] = useState<UiLanguage>("vi");

  useEffect(() => {
    const read = () =>
      setLanguageState(
        localStorage.getItem(KEY) === "en" ? "en" : "vi",
      );

    read();
    window.addEventListener("storage", read);
    window.addEventListener("ui-language-change", read);

    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("ui-language-change", read);
    };
  }, []);

  const setLanguage = (next: UiLanguage) => {
    localStorage.setItem(KEY, next);
    setLanguageState(next);
    window.dispatchEvent(new Event("ui-language-change"));
  };

  return {
    language,
    setLanguage,
    t: messages[language],
  };
}
