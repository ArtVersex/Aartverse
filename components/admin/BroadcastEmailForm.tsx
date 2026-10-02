"use client";

import { useActionState, useState } from "react";
import { sendBroadcastEmailAction, type BroadcastEmailState } from "@/app/admin/broadcast/actions";
import StatusPill from "@/components/StatusPill";
import type { UserStatus } from "@/lib/types";

const initialState: BroadcastEmailState = {};

// Prefilled only when the admin clicks "Needs a reminder" below with an
// empty subject/message -- a ready-to-send starting point they can still
// edit before sending, not a locked template.
const REMINDER_SUBJECT = "Finish setting up your Aartverse profile";
const REMINDER_MESSAGE = `Hi,

We noticed your Aartverse artist account is registered, but your profile isn't finished yet and you haven't submitted any artwork so far.

Completing your profile (photo, artist statement, location, and mediums) and submitting your first piece helps collectors find your work, and keeps you eligible for authenticated listings and upcoming competitions.

You can pick up right where you left off any time:
https://aartverse.com/artist

If anything's unclear or you run into trouble, just reply to this email -- happy to help.

-- Team Aartverse`;

export interface BroadcastArtistOption {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  /** Registered, but zero artworks submitted (any status) and the core
   *  profile fields are still empty -- see isArtistProfileIncomplete in
   *  lib/queries/users.ts for exactly what counts. Drives the "Needs a
   *  reminder" shortcut below. */
  needsReminder: boolean;
}

/**
 * The "Email Artists" composer -- a checkbox list of every registered
 * artist, a free-text box for anyone not registered yet, and a plain
 * subject/message pair. Submits through sendBroadcastEmailAction (see
 * ../../app/admin/broadcast/actions.ts), which always Bcc's every
 * recipient so picking several artists never shows them each other's
 * address.
 */
export default function BroadcastEmailForm({ artists }: { artists: BroadcastArtistOption[] }) {
  const [state, formAction, isPending] = useActionState(sendBroadcastEmailAction, initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Lifted to state (rather than left as plain uncontrolled inputs) purely
  // so the "Needs a reminder" button below can drop in a ready-made
  // subject/message -- the name attributes further down still carry these
  // to the server action exactly as before.
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const reminderIds = artists.filter((a) => a.needsReminder).map((a) => a.id);
  const reminderSetSelected =
    reminderIds.length > 0 &&
    selected.size === reminderIds.length &&
    reminderIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === artists.length ? new Set() : new Set(artists.map((a) => a.id))));
  }

  // One click: select exactly the artists who registered, never submitted
  // anything, and never finished their profile, and -- only if the admin
  // hasn't already started typing something else -- drop in a ready-to-send
  // reminder. Click again to clear the selection, same toggle feel as
  // "Select all" above.
  function selectNeedsReminder() {
    if (reminderSetSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(reminderIds));
    if (!subject.trim() && !message.trim()) {
      setSubject(REMINDER_SUBJECT);
      setMessage(REMINDER_MESSAGE);
    }
  }

  if (state.success) {
    return (
      <p className="callout-banner">
        Sent to {state.sentCount} recipient{state.sentCount === 1 ? "" : "s"} -- everyone was Bcc&apos;d,
        so no one can see who else received it.
      </p>
    );
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-8">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="field-label mb-0">Select artists</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {reminderIds.length > 0 && (
              <button type="button" onClick={selectNeedsReminder} className="eyebrow link-underline text-accent">
                {reminderSetSelected ? "Deselect" : "Needs a reminder"} ({reminderIds.length})
              </button>
            )}
            {artists.length > 0 && (
              <button type="button" onClick={toggleAll} className="eyebrow link-underline">
                {selected.size === artists.length ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>
        </div>

        {artists.length === 0 ? (
          <p className="text-sm text-muted">No artist accounts yet.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-line overflow-y-auto border border-line bg-white">
            {artists.map((artist) => (
              <li key={artist.id} className="row-card">
                <label className="flex cursor-pointer items-center gap-3 px-1 py-2.5">
                  <input
                    type="checkbox"
                    name="artistIds"
                    value={artist.id}
                    checked={selected.has(artist.id)}
                    onChange={() => toggle(artist.id)}
                    className="h-4 w-4 shrink-0 accent-ink"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-sm text-ink">{artist.name}</span>
                    <span className="block truncate font-sans text-xs text-muted">{artist.email}</span>
                    {artist.needsReminder && (
                      <span className="mt-0.5 block font-sans text-xs text-accent">
                        No artwork submitted · profile incomplete
                      </span>
                    )}
                  </span>
                  <StatusPill status={artist.status} />
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 font-sans text-xs text-muted">{selected.size} selected</p>
      </div>

      <div>
        <label htmlFor="broadcast-extra-emails" className="field-label">
          Also send to (optional)
        </label>
        <textarea
          id="broadcast-extra-emails"
          name="extraEmails"
          rows={2}
          placeholder="For anyone not registered yet -- one email per line, or comma-separated"
          className="w-full border border-line bg-transparent p-3 font-sans text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="broadcast-subject" className="field-label">
          Subject
        </label>
        <input
          id="broadcast-subject"
          name="subject"
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Reminder: submit your artworks"
        />
      </div>

      <div>
        <label htmlFor="broadcast-message" className="field-label">
          Message
        </label>
        <textarea
          id="broadcast-message"
          name="message"
          required
          rows={8}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message -- a reminder to submit artwork, news about an authenticated listing, an upcoming competition, or anything else."
          className="w-full border border-line bg-transparent p-3 font-sans text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      {state.error && <p className="field-error">{state.error}</p>}

      <button type="submit" disabled={isPending} className="btn-primary w-full sm:w-auto">
        {isPending ? "Sending..." : "Send email"}
      </button>
    </form>
  );
}
