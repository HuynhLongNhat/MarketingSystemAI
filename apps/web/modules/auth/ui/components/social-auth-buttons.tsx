"use client";

import { Loader2, Phone } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@workspace/ui/components/button";

import { signInWithSocial, type SocialProvider } from "@/modules/auth/lib/auth-api";
import {
  FacebookIcon,
  GoogleIcon,
} from "@/modules/auth/ui/components/brand-icons";

type Props = {
  mode: "sign-in" | "sign-up";
  callbackURL: string;
  disabled?: boolean;
  onPhoneClick: () => void;
  onError: (message: string | null) => void;
};

const PROVIDERS: { id: SocialProvider; name: string; icon: ReactNode }[] = [
  { id: "google", name: "Google", icon: <GoogleIcon className="size-4" /> },
  { id: "facebook", name: "Facebook", icon: <FacebookIcon className="size-4" /> },
];

export function SocialAuthButtons({
  mode,
  callbackURL,
  disabled,
  onPhoneClick,
  onError,
}: Props) {
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const verb = mode === "sign-in" ? "Tiếp tục với" : "Đăng ký với";

  async function handleSocial(provider: SocialProvider) {
    onError(null);
    setPending(provider);
    const result = await signInWithSocial(provider, mode, callbackURL);
    // Thành công: trình duyệt đã được chuyển hướng, không cần làm gì thêm.
    if (!result.ok) {
      onError(result.message);
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <div className="space-y-2.5">
      {PROVIDERS.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={disabled || busy}
          onClick={() => void handleSocial(provider.id)}
        >
          {pending === provider.id ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            provider.icon
          )}
          {verb} {provider.name}
        </Button>
      ))}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={disabled || busy}
        onClick={onPhoneClick}
      >
        <Phone aria-hidden="true" />
        {verb} số điện thoại
      </Button>
    </div>
  );
}