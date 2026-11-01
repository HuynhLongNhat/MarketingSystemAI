"use client";

import { useState, type FormEvent } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import {
  COUNTRIES,
  flagEmoji,
  getCountry,
  toE164,
} from "@/modules/auth/lib/phone";
import { AuthFormField } from "@/modules/auth/ui/components/auth-form-field";
import { AuthSubmitButton } from "@/modules/auth/ui/components/auth-submit-button";

export type PhoneDraft = { countryCode: string; national: string };

type Props = {
  value: PhoneDraft;
  onChange: (value: PhoneDraft) => void;
  /** Gọi với số E.164 đã chuẩn hóa khi dữ liệu hợp lệ. */
  onSubmit: (e164: string) => void | Promise<void>;
  loading?: boolean;
};

export function PhoneAuthForm({ value, onChange, onSubmit, loading }: Props) {
  const [fieldError, setFieldError] = useState<string>();
  const country = getCountry(value.countryCode);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = toE164(country, value.national);

    if (!parsed.ok) {
      setFieldError(parsed.message);
      return;
    }

    setFieldError(undefined);
    await onSubmit(parsed.e164);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AuthFormField
        label="Số điện thoại"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="912 345 678"
        value={value.national}
        error={fieldError}
        onChange={(e) => {
          setFieldError(undefined);
          onChange({ ...value, national: e.target.value });
        }}
        startAdornment={
          <Select
            value={value.countryCode}
            onValueChange={(countryCode) => onChange({ ...value, countryCode })}
          >
            <SelectTrigger aria-label="Mã quốc gia" className="w-28 shrink-0">
              <SelectValue>
                {flagEmoji(country.code)} +{country.dialCode}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {flagEmoji(c.code)} {c.name} (+{c.dialCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <AuthSubmitButton loading={loading} loadingText="Đang gửi mã...">
        Gửi mã OTP
      </AuthSubmitButton>
    </form>
  );
}