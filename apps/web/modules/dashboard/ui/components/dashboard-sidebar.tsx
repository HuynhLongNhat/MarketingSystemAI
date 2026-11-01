
"use client";

import { OrganizationSwitcher } from "@/modules/auth/ui/components/organization-switcher";
import { UserMenu } from "@/modules/auth/ui/components/user-menu";

import {
  BotIcon,
  Building2Icon,
  CreditCardIcon,
  HeadsetIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
  MicIcon,
  NetworkIcon,
  PaletteIcon,
  Settings2Icon,
  UsersIcon,
  WorkflowIcon,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

import { cn } from "@workspace/ui/lib/utils";

type MenuItem = {
  title: string;
  url: string;
  icon: typeof BotIcon;
  comingSoon?: boolean;
};

const companyItems: MenuItem[] = [
  {
    title: "Tổng quan công ty",
    url: "/",
    icon: LayoutDashboardIcon,
  },
  {
    title: "AI Office",
    url: "/#ai-office",
    icon: Building2Icon,
    comingSoon: true,
  },
  {
    title: "Nhân viên AI",
    url: "/#ai-workforce",
    icon: BotIcon,
    comingSoon: true,
  },
  {
    title: "Phòng ban",
    url: "/#departments",
    icon: NetworkIcon,
    comingSoon: true,
  },
];

const operationsItems: MenuItem[] = [
  {
    title: "Tasks & Workflows",
    url: "/#operations",
    icon: WorkflowIcon,
    comingSoon: true,
  },
];

const supportItems: MenuItem[] = [
  {
    title: "Hội thoại",
    url: "/conversations",
    icon: InboxIcon,
  },
  {
    title: "Kho kiến thức",
    url: "/files",
    icon: LibraryBigIcon,
  },
  {
    title: "Tùy chỉnh Chatbot",
    url: "/customization",
    icon: PaletteIcon,
  },
  {
    title: "Tích hợp Website",
    url: "/integrations",
    icon: HeadsetIcon,
  },
  {
    title: "Trợ lý giọng nói",
    url: "/plugins/vapi",
    icon: MicIcon,
  },
];

const systemItems: MenuItem[] = [
  {
    title: "AI Providers & Models",
    url: "/settings/ai-providers",
    icon: Settings2Icon,
  },
  {
    title: "Thành viên",
    url: "/settings/members",
    icon: UsersIcon,
  },
  {
    title: "Thanh toán",
    url: "/billing",
    icon: CreditCardIcon,
  },
];

export const DashboardSidebar = () => {
  const pathname = usePathname();

  const isActive = (item: MenuItem) => {
    if (item.comingSoon) return false;

    if (item.url === "/") {
      return pathname === "/";
    }

    return (
      pathname === item.url ||
      pathname.startsWith(`${item.url}/`)
    );
  };

  const renderMenuItems = (items: MenuItem[]) =>
    items.map((item) => {
      const active = isActive(item);

      return (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton
            asChild
            isActive={active}
            className={cn(
              "transition-colors",
              active &&
                "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground",
            )}
            tooltip={item.title}
          >
            <Link href={item.url}>
              <item.icon className="size-4 shrink-0" />
              <span className="truncate">
                {item.title}
              </span>
              {item.comingSoon && (
                <span className="ml-auto text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                  Soon
                </span>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  const renderGroup = (
    label: string,
    items: MenuItem[],
  ) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {renderMenuItems(items)}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar
      className="group"
      collapsible="icon"
    >
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Company", companyItems)}
        {renderGroup("Operations", operationsItems)}
        {renderGroup(
          "Customer Support",
          supportItems,
        )}
        {renderGroup("System", systemItems)}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
