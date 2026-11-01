"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

type Props = ComponentProps<typeof Input> & {
  label: string;
  error?: string;
  /** Hiển thị bên phải label, ví dụ link "Quên mật khẩu?" */
  labelAction?: ReactNode;
  /** Phần tử đặt bên trái ô nhập, ví dụ bộ chọn mã quốc gia. */
  startAdornment?: ReactNode;
};

export function AuthFormField({
  label,
  error,
  labelAction,
  startAdornment,
  type,
  ...inputProps
}: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>

      <div className="flex gap-2">
        {startAdornment}
        <div className="relative min-w-0 flex-1">
          <Input
            id={id}
            type={isPassword && visible ? "text" : type}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={isPassword ? "pr-10" : undefined}
            {...inputProps}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}