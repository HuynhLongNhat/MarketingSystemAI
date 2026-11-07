"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Laptop,
  Languages,
  LogOut,
  Moon,
  Settings2,
  Sun,
  UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";

import { authClient } from "@/lib/auth-client";
import { useUiLanguage, type UiLanguage } from "@/lib/ui-language";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

type ThemeChoice = "light" | "dark" | "system";

const labels = {
  vi: {
    profile: "Hồ sơ",
    settings: "Cài đặt",
    preferences: "Tùy chọn cá nhân",
    language: "Ngôn ngữ",
    appearance: "Giao diện",
    light: "Sáng",
    dark: "Tối",
    system: "Theo hệ thống",
    signOut: "Đăng xuất",
    signingOut: "Đang đăng xuất...",
    account: "Tài khoản",
    profileDescription: "Thông tin tài khoản được quản lý bởi đăng nhập của bạn.",
    settingsDescription: "Chọn ngôn ngữ hiển thị và giao diện cho dashboard này.",
  },
  en: {
    profile: "Profile",
    settings: "Settings",
    preferences: "Personal preferences",
    language: "Language",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "System",
    signOut: "Sign out",
    signingOut: "Signing out...",
    account: "Account",
    profileDescription: "Your account information is managed through your sign-in.",
    settingsDescription: "Choose the language and appearance for this dashboard.",
  },
} as const;

function initials(name?: string | null) {
  return (name ?? "A")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function UserMenu() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { language, setLanguage } = useUiLanguage();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const text = labels[language];
  const user = session?.user;
  const activeTheme = useMemo<ThemeChoice>(
    () =>
      theme === "light" || theme === "dark" || theme === "system"
        ? theme
        : "system",
    [theme],
  );

  useEffect(() => setMounted(true), []);

  async function handleSignOut() {
    setBusy(true);
    setError("");

    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(result.error.message ?? "Đăng xuất thất bại.");
        return;
      }
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md p-2 text-left outline-hidden transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <Avatar>
              <AvatarImage src={user?.image ?? undefined} alt="" />
              <AvatarFallback>{initials(user?.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-sm font-medium">
                {user?.name ?? text.account}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user?.email ?? ""}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src={user?.image ?? undefined} alt="" />
              <AvatarFallback>{initials(user?.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate">{user?.name ?? text.account}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {user?.email ?? ""}
              </span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
            <UserRound /> {text.profile}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <Settings2 /> {text.settings}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={busy}
            onSelect={() => void handleSignOut()}
          >
            <LogOut /> {busy ? text.signingOut : text.signOut}
          </DropdownMenuItem>
          {error && <p role="alert" className="px-2 py-1 text-xs text-destructive">{error}</p>}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{text.profile}</DialogTitle>
            <DialogDescription>{text.profileDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Avatar className="size-11">
              <AvatarImage src={user?.image ?? undefined} alt="" />
              <AvatarFallback>{initials(user?.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{user?.name ?? text.account}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email ?? ""}</p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => {
            setProfileOpen(false);
            setSettingsOpen(true);
          }}>
            <Settings2 className="size-4" /> {text.settings}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{text.preferences}</DialogTitle>
            <DialogDescription>{text.settingsDescription}</DialogDescription>
          </DialogHeader>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Languages className="size-4" /> {text.language}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["vi", "en"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={language === value ? "default" : "outline"}
                  onClick={() => setLanguage(value as UiLanguage)}
                >
                  {language === value && <Check className="size-4" />}
                  {value === "vi" ? "Tiếng Việt" : "English"}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="size-4" /> {text.appearance}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["light", Sun, text.light],
                ["dark", Moon, text.dark],
                ["system", Laptop, text.system],
              ] as const).map(([value, Icon, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={mounted && activeTheme === value ? "default" : "outline"}
                  className={cn("h-auto min-h-16 flex-col gap-1 text-xs")}
                  onClick={() => setTheme(value)}
                >
                  <Icon className="size-4" />
                  {label}
                  {mounted && activeTheme === value && <Check className="size-3" />}
                </Button>
              ))}
            </div>
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
}
