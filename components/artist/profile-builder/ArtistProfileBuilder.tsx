"use client";

import { useState } from "react";
import Link from "next/link";
import type { ArtistCareerEntryRow, ArtistRow, ArtworkRow } from "@/lib/types";
import {
  buildInitialDraft,
  sectionHasContent,
  SECTION_LABELS,
  SECTION_ORDER,
  type ProfileDraft,
  type SectionKey,
} from "@/lib/pdf/profileDraft";
import { saveProfileDraftAction } from "@/app/artist/profile-builder/actions";
import FormSection from "@/components/FormSection";
import SafeImage from "@/components/SafeImage";
import EditableEntryList from "./EditableEntryList";
import SocialLinksEditor from "./SocialLinksEditor";
import PdfPreviewAndDownload, { type PdfArtworkSource } from "./PdfPreviewAndDownload";

const STEP_LABELS = ["Edit & Customize", "Select Sections", "Select Artworks", "Preview & Download"] as const;
type Step = 1 | 2 | 3 | 4;

/**
 * The whole Artist Profile PDF builder -- a self-contained, temporary
 * working copy of an artist's professional information (see
 * lib/pdf/profileDraft.ts's doc comment on ProfileDraft). Nothing here
 * touches the artist's real saved profile or artworks unless they
 * explicitly check "Also save these changes to my Artist Profile" on the
 * final step, which calls saveProfileDraftAction directly (a Server Action
 * invoked as a plain async function, not bound to a <form> -- this whole
 * component is one continuous client-side draft, not a series of form
 * submissions).
 */
export default function ArtistProfileBuilder({
  artist,
  careerEntries,
  artworks,
}: {
  artist: ArtistRow;
  careerEntries: ArtistCareerEntryRow[];
  artworks: ArtworkRow[];
}) {
  const initialDraft = buildInitialDraft(artist, careerEntries);

  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<ProfileDraft>(initialDraft);
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<Set<string>>(
    () => new Set(artworks.map((a) => a.artwork_id))
  );
  const [includedSections, setIncludedSections] = useState<Record<SectionKey, boolean>>(() => {
    const map = {} as Record<SectionKey, boolean>;
    for (const key of SECTION_ORDER) {
      map[key] = sectionHasContent(key, initialDraft, artworks.length);
    }
    return map;
  });
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const updateDraft = (patch: Partial<ProfileDraft>) => setDraft((prev) => ({ ...prev, ...patch }));
  const toggleSection = (key: SectionKey) =>
    setIncludedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleArtwork = (id: string) =>
    setSelectedArtworkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedArtworkList: PdfArtworkSource[] = artworks
    .filter((a) => selectedArtworkIds.has(a.artwork_id))
    .map((a) => ({
      title: a.title,
      year: a.year,
      category: [a.category, a.subcategory].filter(Boolean).join(" · ") || null,
      dimensions: a.dimensions,
      collectionName: a.part_of_collection ? a.collection_name : null,
      imageUrl: a.feature_image_url,
    }));

  async function handleSaveToProfile() {
    setSaving(true);
    setSaveResult(null);
    try {
      const result = await saveProfileDraftAction({
        location: draft.location,
        // Sent only when actually edited in the builder -- see
        // app/artist/profile-builder/actions.ts's doc comment. An untouched
        // field is left out entirely so the artist's original saved HTML
        // (formatting included) is never flattened-and-rebuilt for no reason.
        bio: draft.bio !== initialDraft.bio ? draft.bio : undefined,
        artistStatement:
          draft.artistStatement !== initialDraft.artistStatement
            ? draft.artistStatement
            : undefined,
        professionalExperience:
          draft.professionalExperience !== initialDraft.professionalExperience
            ? draft.professionalExperience
            : undefined,
        website: draft.website,
        instagram: draft.instagram,
        socialLinks: draft.socialLinks,
        education: draft.education,
        exhibitions: draft.exhibitions,
        awards: draft.awards,
        residencies: draft.residencies,
        publications: draft.publications,
        institutionalCollections: draft.institutionalCollections,
      });
      setSaveResult(result);
    } catch {
      setSaveResult({
        error: "Something went wrong saving to your profile. Your download still works.",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadClick() {
    if (saveToProfile) {
      void handleSaveToProfile();
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as Step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setStep(n)}
              className={`eyebrow shrink-0 border px-3 py-1.5 text-[11px] transition-colors ${
                step === n ? "border-ink text-ink" : "border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {n}. {label}
            </button>
          );
        })}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="callout-banner">
            <p className="mb-1 font-display text-lg">Customize your Artist Profile</p>
            <p className="text-sm text-muted">
              Your profile information has been pre-filled for you. You can edit it for this
              document. These changes will not affect your saved artist profile.
            </p>
          </div>

          <FormSection title="Header">
            <div>
              <label className="field-label">Artist name</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
              />
              <p className="mt-1 font-sans text-xs text-muted">
                For this document only. Your account name is never changed here.
              </p>
            </div>
            <div>
              <label className="field-label">Location</label>
              <input
                type="text"
                value={draft.location}
                onChange={(e) => updateDraft({ location: e.target.value })}
              />
            </div>
          </FormSection>

          <FormSection title="Artist Statement">
            <textarea
              rows={4}
              value={draft.artistStatement}
              onChange={(e) => updateDraft({ artistStatement: e.target.value })}
              placeholder="A short statement about your practice…"
              className="w-full border border-line bg-transparent p-3 font-sans text-sm text-ink focus:outline-none focus:border-ink"
            />
          </FormSection>

          <FormSection title="Biography">
            <textarea
              rows={6}
              value={draft.bio}
              onChange={(e) => updateDraft({ bio: e.target.value })}
              placeholder="A longer biography, in the third person if you prefer…"
              className="w-full border border-line bg-transparent p-3 font-sans text-sm text-ink focus:outline-none focus:border-ink"
            />
          </FormSection>

          <FormSection title="Professional Experience" defaultOpen={draft.professionalExperience.trim() !== ""}>
            <textarea
              rows={5}
              value={draft.professionalExperience}
              onChange={(e) => updateDraft({ professionalExperience: e.target.value })}
              placeholder="Teaching, curatorial work, studio practice, or other relevant experience…"
              className="w-full border border-line bg-transparent p-3 font-sans text-sm text-ink focus:outline-none focus:border-ink"
            />
          </FormSection>

          <FormSection title="Education" defaultOpen={draft.education.length > 0}>
            <EditableEntryList
              entries={draft.education}
              onChange={(next) => updateDraft({ education: next })}
              titleLabel="Program / degree"
              titlePlaceholder="e.g. BFA Painting"
              organizationLabel="Institution"
              addLabel="Add education"
            />
          </FormSection>

          <FormSection title="Exhibitions" defaultOpen={draft.exhibitions.length > 0}>
            <EditableEntryList
              entries={draft.exhibitions}
              onChange={(next) => updateDraft({ exhibitions: next })}
              titlePlaceholder="e.g. Monsoon Reflections"
              addLabel="Add exhibition"
              showSubtype
            />
          </FormSection>

          <FormSection title="Awards & Recognition" defaultOpen={draft.awards.length > 0}>
            <EditableEntryList
              entries={draft.awards}
              onChange={(next) => updateDraft({ awards: next })}
              titleLabel="Award"
              organizationLabel="Awarded by"
              addLabel="Add award"
            />
          </FormSection>

          <FormSection title="Residencies" defaultOpen={draft.residencies.length > 0}>
            <EditableEntryList
              entries={draft.residencies}
              onChange={(next) => updateDraft({ residencies: next })}
              titleLabel="Residency"
              organizationLabel="Host organization"
              addLabel="Add residency"
            />
          </FormSection>

          <FormSection title="Publications" defaultOpen={draft.publications.length > 0}>
            <EditableEntryList
              entries={draft.publications}
              onChange={(next) => updateDraft({ publications: next })}
              titleLabel="Publication title"
              organizationLabel="Publisher / outlet"
              addLabel="Add publication"
            />
          </FormSection>

          <FormSection
            title="Institutional Collections"
            defaultOpen={draft.institutionalCollections.length > 0}
          >
            <p className="-mt-1 mb-2 font-sans text-xs text-muted">
              Museums, institutions, or collectors holding your work. Not the same as a
              collection/series on an individual artwork.
            </p>
            <EditableEntryList
              entries={draft.institutionalCollections}
              onChange={(next) => updateDraft({ institutionalCollections: next })}
              titleLabel="Collection name"
              organizationLabel="Institution"
              addLabel="Add collection"
            />
          </FormSection>

          <FormSection title="Website & Social Links" defaultOpen={false}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Website</label>
                <input
                  type="url"
                  value={draft.website}
                  onChange={(e) => updateDraft({ website: e.target.value })}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="field-label">Instagram</label>
                <input
                  type="text"
                  value={draft.instagram}
                  onChange={(e) => updateDraft({ instagram: e.target.value })}
                />
              </div>
            </div>
            <SocialLinksEditor
              value={draft.socialLinks}
              onChange={(next) => updateDraft({ socialLinks: next })}
            />
          </FormSection>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="font-sans text-sm text-muted">
            Choose which sections appear in your Artist Profile document. A section with nothing
            in it is unchecked by default, but you can turn any section on or off.
          </p>
          <div className="divide-y divide-line border-y border-line">
            {SECTION_ORDER.map((key) => {
              const hasContent = sectionHasContent(
                key,
                draft,
                key === "selectedArtworks" ? artworks.length : selectedArtworkIds.size
              );
              return (
                <label key={key} className="flex items-center justify-between gap-4 py-3">
                  <span>
                    <span className="block text-sm text-ink">{SECTION_LABELS[key]}</span>
                    {!hasContent && (
                      <span className="block font-sans text-xs text-muted">Nothing added yet</span>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={includedSections[key]}
                    onChange={() => toggleSection(key)}
                    className="h-5 w-5 shrink-0 border-line accent-ink"
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="font-sans text-sm text-muted">
            Choose which artworks to include. Every artwork is selected by default.
          </p>
          {artworks.length === 0 ? (
            <p className="border-y border-line py-6 font-sans text-sm text-muted">
              You have not added any artworks yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {artworks.map((art) => {
                const checked = selectedArtworkIds.has(art.artwork_id);
                return (
                  <label
                    key={art.artwork_id}
                    className={`relative block cursor-pointer border p-2 transition-colors ${
                      checked ? "border-ink" : "border-line"
                    }`}
                  >
                    <div className="relative mb-2 aspect-square overflow-hidden bg-line/40">
                      {art.feature_image_url && (
                        <SafeImage
                          src={art.feature_image_url}
                          alt=""
                          fill
                          sizes="200px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <p className="truncate font-sans text-xs text-ink">{art.title}</p>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArtwork(art.artwork_id)}
                      className="absolute right-3 top-3 h-5 w-5 border-line bg-white accent-ink"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <PdfPreviewAndDownload
            draft={draft}
            includedSections={includedSections}
            selectedArtworks={selectedArtworkList}
            profileImageUrl={artist.profile_image_url}
            onDownloadClick={handleDownloadClick}
          />

          <div className="border border-line bg-white p-4 sm:p-5">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={saveToProfile}
                onChange={(e) => setSaveToProfile(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 border-line accent-ink"
              />
              <span className="font-sans text-sm text-ink">
                Also save these changes to my Artist Profile
                <span className="mt-1 block text-xs text-muted">
                  When checked, downloading the PDF also updates your saved biography, statement,
                  professional experience, location, website, social links, and career history to
                  match what you edited here. Your artist name above and the artworks you
                  selected are never changed on your profile. Leave this unchecked to use your
                  edits for this document only.
                </span>
              </span>
            </label>
            {saving && <p className="mt-3 font-sans text-xs text-muted">Saving to your profile…</p>}
            {saveResult?.success && (
              <p className="mt-3 font-sans text-sm text-emerald-800">Saved to your Artist Profile.</p>
            )}
            {saveResult?.error && (
              <p className="mt-3 font-sans text-sm text-red-700">{saveResult.error}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
        <button
          type="button"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
          disabled={step === 1}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s < 4 ? ((s + 1) as Step) : s))}
            className="btn-primary"
          >
            Continue
          </button>
        ) : (
          <Link href="/artist/profile" className="link-underline font-sans text-sm text-muted">
            Done, back to your profile
          </Link>
        )}
      </div>
    </div>
  );
}
