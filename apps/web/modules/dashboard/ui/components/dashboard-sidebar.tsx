"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bot,
  Building2,
  CreditCard,
  FlaskConical,
  Headset,
  Inbox,
  LayoutDashboard,
  LibraryBig,
  Network,
  Palette,
  Settings2,
  Users,
  Languages,
} from "lucide-react";

import { OrganizationSwitcher } from "@/modules/auth/ui/components/organization-switcher";
import { UserMenu } from "@/modules/auth/ui/components/user-menu";
import { NotificationBell } from "./notification-bell";
import { useUiLanguage } from "@/lib/ui-language";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { cn } from "@workspace/ui/lib/utils";

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language, setLanguage, t } = useUiLanguage();

  const groups = [
    {
      label: "Workspace",
      items: [
        {
          title: t.overview,
          url: "/",
          icon: LayoutDashboard,
        },
        {
          title: "AI Office",
          url: "/office",
          icon: Building2,
        },
        {
          title: "AI Employees",
          url: "/workforce?tab=agents",
          icon: Bot,
        },
        {
          title: "Departments",
          url: "/workforce?tab=departments",
          icon: Network,
        },
      ],
    },
    {
      label: "Customer Support",
      items: [
        {
          title: "Inbox",
          url: "/conversations",
          icon: Inbox,
        },
        {
          title: "Chatbot Playground",
          url: "/playground",
          icon: FlaskConical,
        },
        {
          title: "Knowledge Base",
          url: "/files",
          icon: LibraryBig,
        },
        {
          title: "Widget Customization",
          url: "/customization",
          icon: Palette,
        },
        {
          title: "Channels & Integrations",
          url: "/integrations",
          icon: Headset,
        },
      ],
    },
    {
      label: "Administration",
      items: [
        {
          title: "AI Providers & Models",
          url: "/settings/ai-providers",
          icon: Settings2,
        },
        {
          title: "Team & Permissions",
          url: "/settings/members",
          icon: Users,
        },
        {
          title: "Billing",
          url: "/billing",
          icon: CreditCard,
        },
      ],
    },
  ];

  const isActive = (url: string) => {
    const [path, query] = url.split("?");

    if (path === "/") return pathname === "/";

    if (
      pathname !== path &&
      !pathname.startsWith(`${path}/`)
    ) {
      return false;
    }

    if (path === "/workforce" && query) {
      return (
        (searchParams.get("tab") ?? "agents") ===
        new URLSearchParams(query).get("tab")
      );
    }

    return true;
  };

  return (
    <Sidebar collapsible="icon" className="group">
      <SidebarHeader>
        <div className="flex min-w-0 items-center gap-1">
          <div className="min-w-0 flex-1">
            <OrganizationSwitcher />
          </div>

          <NotificationBell />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>
              {group.label}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.url);

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          "transition-colors",
                          active &&
                            "bg-zinc-950 text-white hover:bg-zinc-800 hover:text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:hover:text-black",
                        )}
                      >
                        <Link href={item.url}>
                          <item.icon className="size-4 shrink-0" />
                          <span className="truncate">
                            {item.title}
                          </span>

                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:px-0">
          <Languages className="size-4 shrink-0" />

          <Select
            value={language}
            onValueChange={(v) =>
              setLanguage(v as "vi" | "en")
            }
          >
            <SelectTrigger
              aria-label={t.language}
              className="h-8 min-w-0 flex-1 group-data-[collapsible=icon]:hidden"
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="vi">
                Tiếng Việt
              </SelectItem>
              <SelectItem value="en">
                English
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <UserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
