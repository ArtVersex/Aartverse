"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfileAction, type ProfileFormState } from "@/app/artist/profile/actions";
import type { ArtistCareerEntryKind, ArtistCareerEntryRow, ArtistRow } from "@/lib/types";
import { parseCommaList, parseSocialLinks } from "@/lib/utils";
import MediumsPicker from "@/components/artist/MediumsPicker";
import ImageFileInput from "@/components/ImageFileInput";
import RichTextEditor from "@/components/RichTextEditor";
import FormSection from "@/components/FormSection";
import CareerEntriesFields from "@/components/artist/CareerEntriesFields";
import SocialLinksFields from "@/components/artist/SocialLinksFields";

const initialState: ProfileFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
      {pending ? "Saving…" : "Save profile"}
    </button>
  );
}

export default function ProfileForm({
  artist,
  careerEntries = [],
}: {
  artist: ArtistRow | null;
  /** This artist's full career history across all six kinds -- see
   *  lib/queries/artistCareerEntries.ts. Split by kind below rather than
   *  requiring the caller to pre-group it. */
  careerEntries?: ArtistCareerEntryRow[];
}) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  // Defaults to checked whenever there's no separate WhatsApp number saved
  // yet, or it already matches the phone number -- so the common case
  // (one number for both) never makes the artist fill in two fields.
  const [sameAsPhone, setSameAsPhone] = useState(
    !artist?.whatsapp || artist.whatsapp === artist.phone
  );

  // location/website/instagram/phone/whatsapp/additionalNotes are kept
  // fully controlled (rather than plain defaultValue inputs) because React
  // resets a <form>'s own uncontrolled fields after ANY action call that
  // resolves without throwing -- including one that just returns
  // fieldErrors, not only a successful save. A defaultValue input would
  // lose whatever the artist typed the instant validation failed. Artist
  // statement/bio/professional experience (RichTextEditor) and mediums/
  // social links/every career-entries list (their own controlled
  // components) are already immune, so they were never affected.
  const [location, setLocation] = useState(artist?.location ?? "");
  const [website, setWebsite] = useState(artist?.website ?? "");
  const [instagram, setInstagram] = useState(artist?.instagram ?? "");
  const [phone, setPhone] = useState(artist?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(
    artist?.whatsapp && artist.whatsapp !== artist.phone ? artist.whatsapp : ""
  );
  const [additionalNotes, setAdditionalNotes] = useState(artist?.additional_notes ?? "");

  // Re-seed the controlled fields above from the just-submitted values the
  // action echoes back (extractProfileFormValues, in
  // lib/validation/auth.ts) whenever a new action result arrives -- same
  // "adjusting state during render" pattern as ArtworkForm.tsx.
  const lastSyncedValues = useRef(state.values);
  if (state.values && state.values !== lastSyncedValues.current) {
    lastSyncedValues.current = state.values;
    setLocation(state.values.location ?? "");
    setWebsite(state.values.website ?? "");
    setInstagram(state.values.instagram ?? "");
    setPhone(state.values.phone ?? "");
    setWhatsapp(state.values.whatsapp ?? "");
    setAdditionalNotes(state.values.additionalNotes ?? "");
  }

  const entriesOf = (kind: ArtistCareerEntryKind) => careerEntries.filter((e) => e.kind === kind);

  return (
    <form action={formAction} className="max-w-2xl space-y-6" noValidate>
      {state.success && <p className="callout-banner">Profile updated.</p>}

      <FormSection title="Photos">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <ImageFileInput
            name="profileImage"
            label="Profile photo"
            existingUrl={artist?.profile_image_url}
            aspect="square"
            error={state.fieldErrors?.profileImage}
          />
          <ImageFileInput
            name="coverImage"
            label="Cover photo"
            existingUrl={artist?.cover_image_url}
            aspect="cover"
            error={state.fieldErrors?.coverImage}
          />
        </div>
      </FormSection>

      <FormSection title="About you">
        <div>
          <label className="field-label">Artist statement</label>
          <RichTextEditor
            name="artistStatement"
            defaultValue={artist?.artist_statement}
            placeholder="Tell visitors a little about you and your work…"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={state.fieldErrors?.location ? "border-red-700" : undefined}
          />
          {state.fieldErrors?.location && <p className="field-error">{state.fieldErrors.location}</p>}
        </div>
      </FormSection>

      {/* Phone / WhatsApp -- Indian mobile numbers only for now: a fixed
          +91 prefix plus a plain 10-digit field keeps this to one quick,
          unambiguous input instead of a full international phone picker. */}
      <FormSection title="Contact" subtitle="private, never shown publicly">
        <p className="-mt-1 font-sans text-xs text-muted">
          Only our team can see this, to reach you about your submissions and account. It never
          appears on your public artist page.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="phone">
              Phone number
            </label>
            <div
              className={`flex items-end gap-2 border-b focus-within:border-ink ${
                state.fieldErrors?.phone ? "border-red-700" : "border-line"
              }`}
            >
              <span className="pb-2 font-sans text-sm text-muted">+91</span>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full flex-1 border-0 bg-transparent py-2 font-sans text-sm text-ink focus:outline-none"
              />
            </div>
            {state.fieldErrors?.phone && <p className="field-error">{state.fieldErrors.phone}</p>}
          </div>

          <div>
            <label className="flex cursor-pointer items-center gap-2 pt-1 font-sans text-sm text-ink sm:pt-8">
              <input
                type="checkbox"
                name="whatsappSameAsPhone"
                checked={sameAsPhone}
                onChange={(e) => setSameAsPhone(e.target.checked)}
                className="h-4 w-4 shrink-0 border-line accent-ink"
              />
              WhatsApp is the same number
            </label>

            {!sameAsPhone && (
              <div className="mt-3">
                <label className="field-label" htmlFor="whatsapp">
                  WhatsApp number
                </label>
                <div
                  className={`flex items-end gap-2 border-b focus-within:border-ink ${
                    state.fieldErrors?.whatsapp ? "border-red-700" : "border-line"
                  }`}
                >
                  <span className="pb-2 font-sans text-sm text-muted">+91</span>
                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="98765 43210"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full flex-1 border-0 bg-transparent py-2 font-sans text-sm text-ink focus:outline-none"
                  />
                </div>
                {state.fieldErrors?.whatsapp && (
                  <p className="field-error">{state.fieldErrors.whatsapp}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection title="Mediums">
        <div className="border border-line p-4">
          <MediumsPicker name="mediums" defaultValues={parseCommaList(artist?.mediums)} />
        </div>
      </FormSection>

      <FormSection title="Links" subtitle="optional" defaultOpen={false}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="website">
              Website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              placeholder="https://"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={`border-b ${state.fieldErrors?.website ? "border-red-700" : "border-line"}`}
            />
            {state.fieldErrors?.website && <p className="field-error">{state.fieldErrors.website}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="instagram">
              Instagram
            </label>
            <input
              id="instagram"
              name="instagram"
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Professional profile"
        subtitle="optional, for galleries and curators"
        defaultOpen={false}
      >
        <p className="-mt-1 font-sans text-xs text-muted">
          Entirely optional and never required to submit artwork. Fill in what applies to you now,
          skip the rest, and come back anytime. This is also what your Artist Profile PDF (from
          your dashboard) pulls from.
        </p>

        <div>
          <label className="field-label">Biography</label>
          <RichTextEditor
            name="bio"
            defaultValue={artist?.bio}
            placeholder="A longer biography, in the third person if you prefer…"
          />
        </div>

        <div>
          <label className="field-label">Professional experience</label>
          <RichTextEditor
            name="professionalExperience"
            defaultValue={artist?.professional_experience}
            placeholder="Teaching, curatorial work, studio practice, or other relevant experience…"
          />
        </div>

        <CareerEntriesFields
          fieldName="exhibitions"
          label="Exhibitions"
          titlePlaceholder="e.g. Monsoon Reflections"
          defaultEntries={entriesOf("exhibition")}
          showSubtype
          subtypeOptions={["Solo", "Group"]}
        />

        <CareerEntriesFields
          fieldName="education"
          label="Education"
          titleLabel="Program / degree"
          titlePlaceholder="e.g. BFA Painting"
          organizationLabel="Institution"
          defaultEntries={entriesOf("education")}
        />

        <CareerEntriesFields
          fieldName="awards"
          label="Awards &amp; recognition"
          titleLabel="Award"
          organizationLabel="Awarded by"
          defaultEntries={entriesOf("award")}
        />

        <CareerEntriesFields
          fieldName="residencies"
          label="Residencies"
          titleLabel="Residency"
          organizationLabel="Host organization"
          defaultEntries={entriesOf("residency")}
        />

        <CareerEntriesFields
          fieldName="publications"
          label="Publications"
          titleLabel="Publication title"
          organizationLabel="Publisher / outlet"
          defaultEntries={entriesOf("publication")}
        />

        <CareerEntriesFields
          fieldName="institutionalCollections"
          label="Institutional collections"
          caption="Museums, institutions, or collectors holding your work. Not the same as a collection/series on an individual artwork."
          titleLabel="Collection name"
          organizationLabel="Institution"
          addLabel="Add collection"
          defaultEntries={entriesOf("collection")}
        />

        <SocialLinksFields name="socialLinks" defaultValues={parseSocialLinks(artist?.social_links)} />

        <div>
          <label className="field-label" htmlFor="additionalNotes">
            Additional notes
          </label>
          <textarea
            id="additionalNotes"
            name="additionalNotes"
            rows={3}
            maxLength={4000}
            placeholder="Anything else relevant to your practice that doesn't fit above…"
            className="w-full border border-line bg-transparent p-3 font-sans text-sm text-ink focus:outline-none focus:border-ink"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
          />
        </div>
      </FormSection>

      {state.error && <p className="font-sans text-sm text-red-700">{state.error}</p>}

      {/* pr-20 on mobile only: SubmitButton is full-width there, and without
          this clearance its right edge sits directly under the fixed
          WhatsApp button (components/WhatsAppButton.tsx) -- both are
          bottom-anchored, so that button would otherwise cover the corner
          of the one button on this page an artist actually needs to tap. */}
      <div className="sticky bottom-0 border-t border-line bg-canvas/95 py-4 pr-20 backdrop-blur sm:pr-0">
        <SubmitButton />
      </div>
    </form>
  );
}
