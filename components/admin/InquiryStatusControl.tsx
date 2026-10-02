"use client";

import { useTransition } from "react";
import { setInquiryStatusAction } from "@/app/admin/inquiries/actions";
import type { InquiryStatus } from "@/lib/types";

const OPTIONS: InquiryStatus[] = ["new", "contacted", "closed"];

export default function InquiryStatusControl({
  inquiryId,
  status,
}: {
  inquiryId: string;
  status: InquiryStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as InquiryStatus;
        startTransition(() => setInquiryStatusAction(inquiryId, next));
      }}
      className="w-auto disabled:opacity-50"
    >
      {OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt[0].toUpperCase() + opt.slice(1)}
        </option>
      ))}
    </select>
  );
}
