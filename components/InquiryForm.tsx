"use client";

import { useActionState, useEffect } from "react";
import { submitInquiryAction, type InquiryFormState } from "@/app/inquiries/actions";

const initialState: InquiryFormState = {};

export interface InquiryFormCategory {
  name: string;
}

interface InquiryFormProps {
  type: "artwork" | "general" | "custom";
  /** Only meaningful for type="artwork". */
  artworkId?: string;
  /** Only meaningful for type="custom" -- the commission-type dropdown (see
   *  CUSTOM_ORDER_TYPES in lib/constants.ts). */
  categories?: InquiryFormCategory[];
  /** Called once the submission succeeds -- e.g. to close a modal. */
  onSuccess?: () => void;
}

const MESSAGE_LABEL: Record<InquiryFormProps["type"], string> = {
  artwork: "Your question",
  general: "How can we help?",
  custom: "Describe what you'd like us to create",
};

const MESSAGE_PLACEHOLDER: Record<InquiryFormProps["type"], string> = {
  artwork: "Ask us anything about this piece...",
  general: "Ask us anything...",
  custom: "Size, medium, subject, budget, timeline...",
};

/**
 * Shared DB-backed inquiry form -- one shape, one server action
 * (app/inquiries/actions.ts#submitInquiryAction), one `inquiries` table
 * (lib/queries/inquiries.ts) behind all three places a visitor can reach
 * out: a per-artwork enquiry, the general "Ask us a question" floating
 * button, and the Customized Product page. What differs per use is just
 * which hidden fields are set and whether the category dropdown shows.
 */
/** Every plain <input> below sits in a form with only one button further
 *  down (Send enquiry) -- a browser submits the form the moment Enter is
 *  pressed in any single-line text input, by default, even with nothing
 *  focused on that button. Without this, pressing Enter after typing just
 *  the name (easy to do out of habit, tabbing between fields) submits the
 *  form right then, before the message box below has anything in it --
 *  which looks exactly like "I filled everything in and still got an
 *  error". <textarea> already ignores Enter (it inserts a line break
 *  instead), so only the single-line inputs need this. */
function preventEnterSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") e.preventDefault();
}

export default function InquiryForm({ type, artworkId, categories, onSuccess }: InquiryFormProps) {
  const [state, formAction, isPending] = useActionState(submitInquiryAction, initialState);

  useEffect(() => {
    if (state.success) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  if (state.success) {
    return (
      <p className="callout-banner">
        Thank you -- we&apos;ve received your message and will get back to you shortly.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      {artworkId && <input type="hidden" name="artworkId" value={artworkId} />}

      {type === "custom" && categories && categories.length > 0 && (
        <div>
          <label htmlFor="inquiry-category" className="field-label">
            What would you like us to create? (optional)
          </label>
          <select id="inquiry-category" name="categoryId" defaultValue="">
            <option value="">Choose a type</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="inquiry-name" className="field-label">
          Your name
        </label>
        <input
          id="inquiry-name"
          name="name"
          type="text"
          required
          placeholder="e.g. Priya Sharma"
          onKeyDown={preventEnterSubmit}
        />
      </div>

      <div>
        <label htmlFor="inquiry-email" className="field-label">
          Email
        </label>
        <input
          id="inquiry-email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          onKeyDown={preventEnterSubmit}
        />
      </div>

      <div>
        <label htmlFor="inquiry-phone" className="field-label">
          Phone (optional)
        </label>
        <input
          id="inquiry-phone"
          name="phone"
          type="tel"
          placeholder="e.g. 98765 43210"
          onKeyDown={preventEnterSubmit}
        />
      </div>

      <div>
        <label htmlFor="inquiry-message" className="field-label">
          {MESSAGE_LABEL[type]}
        </label>
        <textarea
          id="inquiry-message"
          name="message"
          required
          rows={4}
          placeholder={MESSAGE_PLACEHOLDER[type]}
          className="w-full border border-line bg-transparent p-3 font-sans text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      {state.error && <p className="field-error">{state.error}</p>}

      <button type="submit" disabled={isPending} className="btn-accent w-full sm:w-auto">
        {isPending ? "Sending..." : "Send enquiry"}
      </button>
    </form>
  );
}
