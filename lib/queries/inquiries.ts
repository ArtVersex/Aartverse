import "server-only";
import { randomUUID } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import type { InquiryRow, InquiryStatus, InquiryType } from "@/lib/types";

export interface CreateInquiryInput {
  type: InquiryType;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  artworkId: string | null;
  categoryId: string | null;
}

/** Writes one customer inquiry -- an artwork enquiry, a general question,
 *  or a customized-product request (see app/inquiries/actions.ts, the one
 *  shared entry point every <InquiryForm> submits through). */
export async function createInquiry(input: CreateInquiryInput): Promise<string> {
  const id = randomUUID();
  await query(
    `INSERT INTO inquiries (id, type, artwork_id, category_id, name, email, phone, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.type,
      input.artworkId,
      input.categoryId,
      input.name,
      input.email,
      input.phone,
      input.message,
    ]
  );
  return id;
}

export interface ListInquiriesOptions {
  type?: InquiryType;
  status?: InquiryStatus;
}

/** For the admin "Inquiries" screen (app/admin/inquiries/page.tsx) --
 *  newest first, optionally narrowed by type and/or status. */
export async function listInquiries(options: ListInquiriesOptions = {}): Promise<InquiryRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (options.type) {
    conditions.push("type = ?");
    params.push(options.type);
  }
  if (options.status) {
    conditions.push("status = ?");
    params.push(options.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<InquiryRow>(`SELECT * FROM inquiries ${where} ORDER BY created_at DESC`, params);
}

export async function getInquiryById(id: string): Promise<InquiryRow | null> {
  return queryOne<InquiryRow>(`SELECT * FROM inquiries WHERE id = ? LIMIT 1`, [id]);
}

/** Admin-only transition -- lets the team track which inquiries they've
 *  already followed up on. */
export async function setInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
  await query(`UPDATE inquiries SET status = ? WHERE id = ?`, [status, id]);
}
