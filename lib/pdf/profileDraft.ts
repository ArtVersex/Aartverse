import type { ArtistCareerEntryKind, ArtistCareerEntryRow, ArtistRow, SocialLink } from "@/lib/types";
import { parseSocialLinks } from "@/lib/utils";

/**
 * Shared shapes for the Artist Profile PDF builder
 * (app/artist/profile-builder) -- a wholly separate, temporary "draft" of
 * an artist's professional information, never the artist's real saved
 * profile. Nothing here is written to the database unless the artist
 * explicitly checks "Also save these changes to my Artist Profile" (see
 * app/artist/profile-builder/actions.ts), and even then only the fields
 * this draft actually maps back to -- artist name and artwork selection are
 * never written back, regardless of that checkbox.
 */

export interface CareerEntryDraft {
  subtype: string;
  title: string;
  organization: string;
  location: string;
  yearLabel: string;
  description: string;
  url: string;
}

export interface ProfileDraft {
  /** Editable for this document only -- never written back to the artist's
   *  real profile, since a name change has wider implications (slug,
   *  display everywhere) outside this feature's scope. */
  name: string;
  location: string;
  /** Rich-text fields (artists.bio/artist_statement/professional_experience)
   *  flattened to plain text for this document-specific editing surface --
   *  see plainTextToParagraphsHtml below for how an edit here round-trips
   *  back into the rich-text-shaped column if the artist opts to save it. */
  bio: string;
  artistStatement: string;
  professionalExperience: string;
  website: string;
  instagram: string;
  socialLinks: SocialLink[];
  education: CareerEntryDraft[];
  exhibitions: CareerEntryDraft[];
  awards: CareerEntryDraft[];
  residencies: CareerEntryDraft[];
  publications: CareerEntryDraft[];
  institutionalCollections: CareerEntryDraft[];
}

export type SectionKey =
  | "artistStatement"
  | "biography"
  | "professionalExperience"
  | "education"
  | "exhibitions"
  | "awards"
  | "residencies"
  | "publications"
  | "institutionalCollections"
  | "selectedArtworks"
  | "links";

export const SECTION_LABELS: Record<SectionKey, string> = {
  artistStatement: "Artist Statement",
  biography: "Biography",
  professionalExperience: "Professional Experience",
  education: "Education",
  exhibitions: "Exhibitions",
  awards: "Awards & Recognition",
  residencies: "Residencies",
  publications: "Publications",
  institutionalCollections: "Collections",
  selectedArtworks: "Selected Artworks",
  links: "Website & Social Links",
};

/** Order sections appear both in the Select Sections checklist and, for
 *  whichever ones end up included, in the PDF itself. */
export const SECTION_ORDER: SectionKey[] = [
  "artistStatement",
  "biography",
  "professionalExperience",
  "education",
  "exhibitions",
  "awards",
  "residencies",
  "publications",
  "institutionalCollections",
  "selectedArtworks",
  "links",
];

/**
 * Converts stored rich-text HTML (real <p>/<h2>/<h3>/<li>/<br> structure
 * from components/RichTextEditor.tsx -- a full Tiptap editor, not the
 * minimal shape its own doc comment might suggest) into the flat,
 * blank-line-separated plain text this builder edits as a plain
 * <textarea>. Block-level boundaries become blank lines BEFORE remaining
 * tags are stripped, so paragraph structure survives -- a generic
 * lib/utils.ts#stripHtml (single-space-per-tag) would merge every
 * paragraph into one run-on line, and re-saving that shape via
 * plainTextToParagraphsHtml below would permanently collapse what were
 * separate paragraphs into one. Inline formatting (bold, italic, headings,
 * lists-as-lists, links) has no plain-text equivalent and is intentionally
 * dropped, matching this whole builder's "edit as plain text" design --
 * but see app/artist/profile-builder/actions.ts for how a field the artist
 * never actually touched here skips this lossy round trip entirely and
 * keeps its original HTML untouched on save.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|h4|h5|h6|li|div|blockquote)>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toCareerDraft(row: ArtistCareerEntryRow): CareerEntryDraft {
  return {
    subtype: row.subtype ?? "",
    title: row.title ?? "",
    organization: row.organization ?? "",
    location: row.location ?? "",
    yearLabel: row.year_label ?? "",
    description: row.description ?? "",
    url: row.url ?? "",
  };
}

/** Builds the builder's initial draft straight from the artist's saved
 *  profile and career history. Purely a starting point in local component
 *  state from here on -- see ProfileDraft's own doc comment above. */
export function buildInitialDraft(
  artist: ArtistRow,
  careerEntries: ArtistCareerEntryRow[]
): ProfileDraft {
  const of = (kind: ArtistCareerEntryKind) =>
    careerEntries.filter((e) => e.kind === kind).map(toCareerDraft);

  return {
    name: artist.name ?? "",
    location: artist.location ?? "",
    bio: htmlToPlainText(artist.bio ?? ""),
    artistStatement: htmlToPlainText(artist.artist_statement ?? ""),
    professionalExperience: htmlToPlainText(artist.professional_experience ?? ""),
    website: artist.website ?? "",
    instagram: artist.instagram ?? "",
    socialLinks: parseSocialLinks(artist.social_links),
    education: of("education"),
    exhibitions: of("exhibition"),
    awards: of("award"),
    residencies: of("residency"),
    publications: of("publication"),
    institutionalCollections: of("collection"),
  };
}

/** Whether a section currently has enough content to be worth including --
 *  used only to seed the Select Sections checkboxes' initial state (checked
 *  when there's something to show, unchecked when empty). The artist can
 *  still toggle any section either way afterward, and an included-but-empty
 *  section is simply skipped when the PDF is actually built (see
 *  ArtistProfileDocument.tsx) so a stray checkbox never produces an empty
 *  gap in the document. */
export function sectionHasContent(
  key: SectionKey,
  draft: ProfileDraft,
  selectedArtworkCount: number
): boolean {
  switch (key) {
    case "artistStatement":
      return draft.artistStatement.trim() !== "";
    case "biography":
      return draft.bio.trim() !== "";
    case "professionalExperience":
      return draft.professionalExperience.trim() !== "";
    case "education":
      return draft.education.length > 0;
    case "exhibitions":
      return draft.exhibitions.length > 0;
    case "awards":
      return draft.awards.length > 0;
    case "residencies":
      return draft.residencies.length > 0;
    case "publications":
      return draft.publications.length > 0;
    case "institutionalCollections":
      return draft.institutionalCollections.length > 0;
    case "selectedArtworks":
      return selectedArtworkCount > 0;
    case "links":
      return (
        draft.website.trim() !== "" || draft.instagram.trim() !== "" || draft.socialLinks.length > 0
      );
    default:
      return false;
  }
}

/**
 * Converts a plain-text edit from the builder back into the same minimal
 * paragraph-per-blank-line HTML shape RichTextEditor/RichText already
 * expect (see lib/utils.ts#sanitizeRichText and components/RichText.tsx) --
 * used only when the artist explicitly opts to save a normally-rich-text
 * field (bio/artistStatement/professionalExperience) back to their real
 * profile. HTML special characters are escaped first, so anything the
 * artist typed (a literal "<" or "&") round-trips as visible text instead
 * of being parsed as markup. Returns null for an all-blank edit, matching
 * how every other clearable profile field is stored as NULL rather than an
 * empty string.
 */
export function plainTextToParagraphsHtml(text: string): string | null {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return paragraphs.map((p) => `<p>${escape(p).replace(/\n/g, "<br/>")}</p>`).join("");
}
