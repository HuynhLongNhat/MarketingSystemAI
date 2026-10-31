
"use client";

import { OrganizationSwitcher } from "@/modules/auth/ui/components/organization-switcher";
import { UserMenu } from "@/modules/auth/ui/components/user-menu";

import {
  CreditCardIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
  Mic,
  PaletteIcon,
  UsersIcon,
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

const customerSupportItems = [
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
];

const configurationItems = [
  {
    title: "Tùy chỉnh Chatbot",
    url: "/customization",
    icon: PaletteIcon,
  },
  {
    title: "Tích hợp Website",
    url: "/integrations",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Trợ lý giọng nói",
    url: "/plugins/vapi",
    icon: Mic,
  },
];

const accountItems = [
  {
    title: "Gói dịch vụ & Thanh toán",
    url: "/billing",
    icon: CreditCardIcon,
  },
  {
    title: "Thành viên",
    url: "/settings/members",
    icon: UsersIcon,
  },
];

export const DashboardSidebar = () => {
  const pathname = usePathname();

  const isActive = (url: string) => {
    if (url === "/") {
      return pathname === "/";
    }

    return (
      pathname === url ||
      pathname.startsWith(`${url}/`)
    );
  };

  const renderMenuItems = (
    items: typeof customerSupportItems,
  ) =>
    items.map((item) => {
      const active = isActive(item.url);

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
              <item.icon className="size-4" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar className="group" collapsible="icon">
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            Chăm sóc khách hàng
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(customerSupportItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            Cấu hình
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(configurationItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            Tài khoản
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(accountItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
