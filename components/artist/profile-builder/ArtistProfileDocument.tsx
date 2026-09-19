import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import type { CareerEntryDraft, ProfileDraft, SectionKey } from "@/lib/pdf/profileDraft";

/** One artwork as handed to the PDF -- already resolved to the plain
 *  fields the layout needs, and already carrying a pre-converted PNG data
 *  URI for its image rather than the original (WebP, possibly cross-origin)
 *  URL. See components/artist/profile-builder/PdfPreviewAndDownload.tsx for
 *  where both conversions happen, and app/api/pdf-image/route.ts for why. */
export interface PdfArtwork {
  title: string;
  year: number | null;
  category: string | null;
  dimensions: string | null;
  collectionName: string | null;
  imageDataUri: string | null;
}

const INK = "#171412";
const MUTED = "#726b62";
const LINE = "#e6e1da";

// Built-in standard PDF fonts only (Helvetica/Times family) -- no
// Font.register() call for a remote font file, trading a slightly less
// exact brand match for zero network/loading risk in the generated
// document. Times for display text mirrors this site's own serif
// font-display class; Helvetica for body/labels mirrors its font-sans.
const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: INK,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    objectFit: "cover",
    marginRight: 20,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontFamily: "Times-Bold",
    fontSize: 26,
    marginBottom: 4,
  },
  location: {
    fontSize: 10,
    color: MUTED,
    marginBottom: 6,
  },
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  linkItem: {
    fontSize: 9,
    color: MUTED,
    marginRight: 14,
    textDecoration: "none",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: MUTED,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  statement: {
    fontFamily: "Times-Italic",
    fontSize: 12.5,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  entry: {
    marginBottom: 10,
  },
  entryTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
  },
  entryYear: {
    fontSize: 9.5,
    color: MUTED,
  },
  entryMeta: {
    fontSize: 9.5,
    color: MUTED,
    marginTop: 1,
  },
  entryDescription: {
    fontSize: 9.5,
    lineHeight: 1.4,
    marginTop: 3,
  },
  artworkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  artworkCard: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 16,
  },
  artworkImage: {
    width: "100%",
    height: 150,
    objectFit: "cover",
    marginBottom: 6,
    backgroundColor: LINE,
  },
  artworkTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
  },
  artworkMeta: {
    fontSize: 8.5,
    color: MUTED,
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
  },
});

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

function CareerEntryBlock({ entry, showSubtype }: { entry: CareerEntryDraft; showSubtype?: boolean }) {
  const subtitleParts = [entry.organization, entry.location].filter(Boolean);
  return (
    <View style={styles.entry} wrap={false}>
      <View style={styles.entryTitleRow}>
        <Text style={styles.entryTitle}>
          {entry.title}
          {showSubtype && entry.subtype ? ` (${capitalize(entry.subtype)})` : ""}
        </Text>
        {entry.yearLabel ? <Text style={styles.entryYear}>{entry.yearLabel}</Text> : null}
      </View>
      {subtitleParts.length > 0 && <Text style={styles.entryMeta}>{subtitleParts.join(", ")}</Text>}
      {entry.description ? <Text style={styles.entryDescription}>{entry.description}</Text> : null}
    </View>
  );
}

function instagramHref(handleOrUrl: string): string {
  if (/^https?:\/\//i.test(handleOrUrl)) return handleOrUrl;
  return `https://instagram.com/${handleOrUrl.replace(/^@/, "")}`;
}

function instagramLabel(handleOrUrl: string): string {
  const bare = handleOrUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "");
  return `@${bare}`;
}

/**
 * The Artist Profile PDF itself -- a plain, presentational react-pdf
 * Document. Receives everything it needs as already-resolved props (no
 * fetching, no async work in here) so it can be rendered identically by
 * both the live <PDFViewer> preview and the final <PDFDownloadLink>.
 *
 * Only sections both toggled on in `includedSections` AND actually holding
 * content get a heading + body -- an included-but-empty section (say, the
 * artist checked "Awards" but never added any) is silently skipped rather
 * than leaving a heading over blank space, per the "no empty gaps for
 * skipped sections" requirement.
 */
export default function ArtistProfileDocument({
  draft,
  includedSections,
  artworks,
  photoDataUri,
}: {
  draft: ProfileDraft;
  includedSections: Record<SectionKey, boolean>;
  artworks: PdfArtwork[];
  photoDataUri: string | null;
}) {
  const show = (key: SectionKey, hasContent: boolean) => includedSections[key] && hasContent;
  const showLinks = show(
    "links",
    draft.website.trim() !== "" || draft.instagram.trim() !== "" || draft.socialLinks.length > 0
  );

  return (
    <Document title={`${draft.name || "Artist"} - Artist Profile`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          {photoDataUri && <Image src={photoDataUri} style={styles.photo} />}
          <View style={styles.headerText}>
            <Text style={styles.name}>{draft.name || "Untitled Artist"}</Text>
            {draft.location ? <Text style={styles.location}>{draft.location}</Text> : null}
            {showLinks && (
              <View style={styles.linksRow}>
                {draft.website ? (
                  <Link src={draft.website} style={styles.linkItem}>
                    {draft.website.replace(/^https?:\/\//i, "")}
                  </Link>
                ) : null}
                {draft.instagram ? (
                  <Link src={instagramHref(draft.instagram)} style={styles.linkItem}>
                    {instagramLabel(draft.instagram)}
                  </Link>
                ) : null}
                {draft.socialLinks.map((link, i) => (
                  <Link key={i} src={link.url} style={styles.linkItem}>
                    {link.label}
                  </Link>
                ))}
              </View>
            )}
          </View>
        </View>

        {show("artistStatement", draft.artistStatement.trim() !== "") && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Artist Statement</Text>
            {splitParagraphs(draft.artistStatement).map((p, i) => (
              <Text key={i} style={styles.statement}>
                {p}
              </Text>
            ))}
          </View>
        )}

        {show("biography", draft.bio.trim() !== "") && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biography</Text>
            {splitParagraphs(draft.bio).map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        )}

        {show("professionalExperience", draft.professionalExperience.trim() !== "") && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Experience</Text>
            {splitParagraphs(draft.professionalExperience).map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        )}

        {show("education", draft.education.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {draft.education.map((entry, i) => (
              <CareerEntryBlock key={i} entry={entry} />
            ))}
          </View>
        )}

        {show("exhibitions", draft.exhibitions.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exhibitions</Text>
            {draft.exhibitions.map((entry, i) => (
              <CareerEntryBlock key={i} entry={entry} showSubtype />
            ))}
          </View>
        )}

        {show("awards", draft.awards.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Awards &amp; Recognition</Text>
            {draft.awards.map((entry, i) => (
              <CareerEntryBlock key={i} entry={entry} />
            ))}
          </View>
        )}

        {show("residencies", draft.residencies.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Residencies</Text>
            {draft.residencies.map((entry, i) => (
              <CareerEntryBlock key={i} entry={entry} />
            ))}
          </View>
        )}

        {show("publications", draft.publications.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Publications</Text>
            {draft.publications.map((entry, i) => (
              <CareerEntryBlock key={i} entry={entry} />
            ))}
          </View>
        )}

        {show("institutionalCollections", draft.institutionalCollections.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Collections</Text>
            {draft.institutionalCollections.map((entry, i) => (
              <CareerEntryBlock key={i} entry={entry} />
            ))}
          </View>
        )}

        {show("selectedArtworks", artworks.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected Artworks</Text>
            <View style={styles.artworkGrid}>
              {artworks.map((art, i) => (
                <View key={i} style={styles.artworkCard} wrap={false}>
                  {art.imageDataUri && <Image src={art.imageDataUri} style={styles.artworkImage} />}
                  <Text style={styles.artworkTitle}>{art.title}</Text>
                  <Text style={styles.artworkMeta}>
                    {[art.year, art.category, art.dimensions].filter(Boolean).join(" · ")}
                  </Text>
                  {art.collectionName ? (
                    <Text style={styles.artworkMeta}>{art.collectionName}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${draft.name || "Artist Profile"} · Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
