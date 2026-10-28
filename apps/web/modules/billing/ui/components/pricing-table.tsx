
"use client";

import Link from "next/link";
import { CreditCard, ShieldCheck } from "lucide-react";

export const PricingTable = () => {
  return (
    <div className="rounded-xl border bg-background p-6">
      <div className="flex items-center gap-3">
        <CreditCard className="size-6 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">
            Billing & Subscription
          </h2>
          <p className="text-sm text-muted-foreground">
            CompanyMarketingSystem
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4" />
          <span className="font-medium">
            Billing đang được chuyển đổi
          </span>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Hệ thống đang thay thế Clerk Billing bằng
          cơ chế subscription và entitlement riêng.
          Chưa hỗ trợ mua hoặc thay đổi gói dịch vụ.
        </p>
      </div>

      <div className="mt-6">
        <Link
          href="/conversations"
          className="text-sm text-primary hover:underline"
        >
          Quay lại Dashboard
        </Link>
      </div>
    </div>
  );
};
