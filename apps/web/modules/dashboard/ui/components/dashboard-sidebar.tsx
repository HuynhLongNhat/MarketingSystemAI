"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bot,
  BrainCircuit,
  Building2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FlaskConical,
  Headset,
  Inbox,
  LayoutDashboard,
  LibraryBig,
  Palette,
  Plug,
  Settings2,
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
    id: "workspace",
    label: { vi: "Không gian làm việc", en: "Workspace" },
    icon: Building2,
    items: [
      { id: "dashboard", label: { vi: "Tổng quan", en: "Overview" }, icon: LayoutDashboard, href: "/" },
      { id: "conversations", label: { vi: "Hội thoại", en: "Conversations" }, icon: Inbox, href: "/conversations" },
      { id: "contacts", label: { vi: "Khách hàng", en: "Contacts" }, icon: Users, href: "/contacts" },
      { id: "leads", label: { vi: "Leads", en: "Leads" }, icon: Target, href: "/leads" },
      { id: "pipeline", label: { vi: "Pipeline", en: "Pipeline" }, icon: Workflow, href: "/pipeline" },
      { id: "tasks", label: { vi: "Công việc", en: "Tasks" }, icon: ClipboardList, href: "/tasks" },
      { id: "website-services", label: { vi: "Website Services", en: "Website Services" }, icon: PanelTop, href: "/marketing/websites" },
    ],
  },
  {
    id: "ai-automation",
    label: { vi: "AI & Tự động hóa", en: "AI & Automation" },
    icon: BrainCircuit,
    items: [
      { id: "employees", label: { vi: "Nhân viên AI", en: "AI Employees" }, icon: Bot, href: "/workforce?tab=agents" },
      { id: "office", label: { vi: "AI Office", en: "AI Office" }, icon: Building2, href: "/office" },
      { id: "knowledge", label: { vi: "Knowledge Base", en: "Knowledge Base" }, icon: LibraryBig, href: "/files" },
      { id: "playground", label: { vi: "Playground", en: "Playground" }, icon: FlaskConical, href: "/playground" },
      { id: "support-agent", label: { vi: "AI Support Agent", en: "AI Support Agent" }, icon: Headset, href: "/customization?section=ai-support-agent" },
    ],
  },
  {
    id: "channels",
    label: { vi: "Kênh kết nối", en: "Channels" },
    icon: Plug,
    items: [
      { id: "integrations", label: { vi: "Kênh kết nối", en: "Connected channels" }, icon: Plug, href: "/integrations" },
      { id: "customization", label: { vi: "Widget Settings", en: "Widget Settings" }, icon: Palette, href: "/customization" },
    ],
  },
  {
    id: "administration",
    label: { vi: "Quản trị", en: "Administration" },
    icon: Settings2,
    items: [
      { id: "providers", label: { vi: "AI Providers & Models", en: "AI Providers & Models" }, icon: Settings2, href: "/settings/ai-providers" },
      { id: "search-providers", label: { vi: "Search Providers", en: "Search Providers" }, icon: Plug, href: "/settings/search-providers" },
      { id: "members", label: { vi: "Thành viên & quyền", en: "Team & Permissions" }, icon: Users, href: "/settings/members" },
      { id: "billing", label: { vi: "Thanh toán", en: "Billing" }, icon: CircleDollarSign, href: "/billing" },
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
