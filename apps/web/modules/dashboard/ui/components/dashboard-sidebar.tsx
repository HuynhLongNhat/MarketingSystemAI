"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  BellRing,
  Bot,
  BrainCircuit,
  Building2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FileBarChart,
  FlaskConical,
  Headset,
  Inbox,
  LayoutDashboard,
  LibraryBig,
  Mail,
  Network,
  Palette,
  Plug,
  ScrollText,
  Search,
  Settings2,
  ShieldCheck,
  Target,
  PanelTop,
  Users,
  Workflow,
} from "lucide-react";

import { OrganizationSwitcher } from "@/modules/auth/ui/components/organization-switcher";
import { UserMenu } from "@/modules/auth/ui/components/user-menu";
import { useUiLanguage, type UiLanguage } from "@/lib/ui-language";
import { NotificationBell } from "./notification-bell";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { cn } from "@workspace/ui/lib/utils";

type Localized = Record<UiLanguage, string>;
type NavigationItem = {
  id: string;
  label: Localized;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  planned?: boolean;
};
type NavigationGroup = {
  id: string;
  label: Localized;
  icon: ComponentType<{ className?: string }>;
  items: NavigationItem[];
};

const navigation: NavigationGroup[] = [
  {
    id: "company",
    label: { vi: "Tổng quan công ty", en: "Company Overview" },
    icon: Building2,
    items: [
      { id: "dashboard", label: { vi: "Dashboard", en: "Dashboard" }, icon: LayoutDashboard, href: "/" },
      { id: "activity", label: { vi: "Hoạt động #", en: "Activity Feed #" }, icon: BellRing, planned: true },
      { id: "reports", label: { vi: "Báo cáo công ty #", en: "Company Reports #" }, icon: FileBarChart, planned: true },
    ],
  },
  {
    id: "ai-office",
    label: { vi: "Văn phòng AI", en: "AI Office" },
    icon: BrainCircuit,
    items: [
      { id: "office", label: { vi: "Office", en: "Office" }, icon: Building2, href: "/office" },
      { id: "employees", label: { vi: "Nhân viên AI", en: "AI Employees" }, icon: Bot, href: "/workforce?tab=agents" },
      { id: "departments", label: { vi: "Phòng ban", en: "Departments" }, icon: Network, href: "/workforce?tab=departments" },
      { id: "templates", label: { vi: "Mẫu Agent", en: "Agent Templates" }, icon: ClipboardList, href: "/workforce?tab=templates" },
      { id: "tasks", label: { vi: "Công việc #", en: "Tasks #" }, icon: ClipboardList, planned: true },
      { id: "workflows", label: { vi: "Quy trình #", en: "Workflows #" }, icon: Workflow, planned: true },
    ],
  },
  {
    id: "marketing",
    label: { vi: "Marketing", en: "Marketing" },
    icon: Target,
    items: [
      { id: "marketing-overview", label: { vi: "Tổng quan #", en: "Overview #" }, icon: LayoutDashboard, planned: true },
      { id: "content", label: { vi: "Content Marketing #", en: "Content Marketing #" }, icon: ClipboardList, planned: true },
      { id: "website-services", label: { vi: "Website Services", en: "Website Services" }, icon: PanelTop, href: "/marketing/websites" },
      { id: "social", label: { vi: "Social Media #", en: "Social Media #" }, icon: Users, planned: true },
      { id: "email", label: { vi: "Email Campaigns #", en: "Email Campaigns #" }, icon: Mail, planned: true },
      { id: "seo", label: { vi: "SEO #", en: "SEO #" }, icon: Search, planned: true },
      { id: "analytics", label: { vi: "Phân tích #", en: "Analytics #" }, icon: BarChart3, planned: true },
    ],
  },
  {
    id: "sales",
    label: { vi: "Sales & CRM", en: "Sales & CRM" },
    icon: CircleDollarSign,
    items: [
      { id: "crm", label: { vi: "CRM #", en: "CRM #" }, icon: Users, planned: true },
      { id: "leads", label: { vi: "Leads #", en: "Leads #" }, icon: Target, planned: true },
      { id: "pipeline", label: { vi: "Sales Pipeline #", en: "Sales Pipeline #" }, icon: Workflow, planned: true },
      { id: "quotations", label: { vi: "Báo giá #", en: "Quotations #" }, icon: FileBarChart, planned: true },
      { id: "appointments", label: { vi: "Lịch hẹn #", en: "Appointments #" }, icon: ClipboardList, planned: true },
    ],
  },
  {
    id: "support",
    label: { vi: "Chăm sóc khách hàng", en: "Customer Support" },
    icon: Headset,
    items: [
      { id: "inbox", label: { vi: "Inbox", en: "Inbox" }, icon: Inbox, href: "/conversations" },
      { id: "support-agent", label: { vi: "AI Support Agent", en: "AI Support Agent" }, icon: Bot, href: "/customization?section=ai-support-agent" },
      { id: "knowledge", label: { vi: "Knowledge Base", en: "Knowledge Base" }, icon: LibraryBig, href: "/files" },
      { id: "playground", label: { vi: "Chatbot Playground", en: "Chatbot Playground" }, icon: FlaskConical, href: "/playground" },
      { id: "integrations", label: { vi: "Channels & Integrations", en: "Channels & Integrations" }, icon: Plug, href: "/integrations" },
      { id: "customization", label: { vi: "Widget Customization", en: "Widget Customization" }, icon: Palette, href: "/customization" },
      { id: "support-analytics", label: { vi: "Phân tích hỗ trợ #", en: "Support Analytics #" }, icon: BarChart3, planned: true },
    ],
  },
  {
    id: "operations",
    label: { vi: "Vận hành", en: "Operations" },
    icon: Workflow,
    items: [
      { id: "task-management", label: { vi: "Quản lý công việc #", en: "Task Management #" }, icon: ClipboardList, planned: true },
      { id: "automation", label: { vi: "Tự động hóa #", en: "Automation #" }, icon: Workflow, planned: true },
      { id: "execution-logs", label: { vi: "Nhật ký chạy #", en: "Execution Logs #" }, icon: ScrollText, planned: true },
      { id: "approvals", label: { vi: "Phê duyệt #", en: "Approvals #" }, icon: ShieldCheck, planned: true },
    ],
  },
  {
    id: "administration",
    label: { vi: "Quản trị", en: "Administration" },
    icon: Settings2,
    items: [
      { id: "providers", label: { vi: "AI Providers & Models", en: "AI Providers & Models" }, icon: Settings2, href: "/settings/ai-providers" },
      { id: "organization-settings", label: { vi: "Cài đặt tổ chức #", en: "Organization Settings #" }, icon: Building2, planned: true },
      { id: "members", label: { vi: "Thành viên & quyền", en: "Team & Permissions" }, icon: Users, href: "/settings/members" },
      { id: "billing", label: { vi: "Thanh toán", en: "Billing" }, icon: CircleDollarSign, href: "/billing" },
      { id: "audit", label: { vi: "Audit Logs #", en: "Audit Logs #" }, icon: ScrollText, planned: true },
    ],
  },
];

const STORAGE_KEY = "dashboard-navigation-open-groups";

function itemIsActive(
  href: string,
  pathname: string,
  searchParams: URLSearchParams,
) {
  const [path, query] = href.split("?");
  if (path === "/") return pathname === "/";
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
  if (!query) return true;
  const expected = new URLSearchParams(query);
  return [...expected.entries()].every(
    ([key, value]) => searchParams.get(key) === value,
  );
}

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language, t } = useUiLanguage();
  const activeGroupIds = useMemo(
    () =>
      navigation
        .filter((group) =>
          group.items.some(
            (item) =>
              item.href && itemIsActive(item.href, pathname, searchParams),
          ),
        )
        .map((group) => group.id),
    [pathname, searchParams],
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, boolean>;
      setOpenGroups((current) => ({ ...saved, ...current }));
    } catch {
      // Ignore malformed local state.
    } finally {
      setNavigationReady(true);
    }
  }, []);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      for (const groupId of activeGroupIds) next[groupId] = true;
      return next;
    });
  }, [activeGroupIds]);

  useEffect(() => {
    if (navigationReady) localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
  }, [navigationReady, openGroups]);

  return (
    <Sidebar collapsible="icon" className="group">
      <SidebarHeader>
        <div className="flex min-w-0 items-center gap-1">
          <div className="min-w-0 flex-1"><OrganizationSwitcher /></div>
          <NotificationBell />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => {
          const open = openGroups[group.id] ?? activeGroupIds.includes(group.id);
          const GroupIcon = group.icon;
          return (
            <Collapsible
              key={group.id}
              open={open}
              onOpenChange={(next) =>
                setOpenGroups((current) => ({ ...current, [group.id]: next }))
              }
              className="group/collapsible"
            >
              <SidebarGroup className="py-1">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="w-full cursor-pointer justify-between gap-2 rounded-md px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <span className="flex min-w-0 items-center gap-2">
                      <GroupIcon className="size-4 shrink-0" />
                      <span className="truncate">{group.label[language]}</span>
                    </span>
                    <ChevronDown className="size-4 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenuSub>
                      {group.items.map((item) => {
                        const active = Boolean(
                          item.href &&
                            itemIsActive(item.href, pathname, searchParams),
                        );
                        const ItemIcon = item.icon;
                        if (item.planned || !item.href) {
                          return (
                            <SidebarMenuSubItem key={item.id}>
                              <SidebarMenuSubButton
                                asChild
                                aria-disabled="true"
                                className="cursor-not-allowed"
                              >
                                <span title={t.soon}>
                                  <ItemIcon className="size-4" />
                                  <span>{item.label[language]}</span>
                                </span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        }
                        return (
                          <SidebarMenuSubItem key={item.id}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={active}
                              className={cn(
                                active &&
                                  "bg-zinc-950 text-white hover:bg-zinc-800 hover:text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:hover:text-black",
                              )}
                            >
                              <Link href={item.href}>
                                <ItemIcon className="size-4" />
                                <span>{item.label[language]}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
