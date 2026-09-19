"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

/**
 * A small rich-text editor for the handful of long-text fields across the
 * artist portal and admin (artwork description + the optional curatorial
 * write-ups, the artist statement). Deliberately minimal -- bold, italic,
 * headings, lists, and links -- matching the exact tag set globals.css's
 * `.richtext` class already styles and the exact set
 * lib/utils.ts#sanitizeRichText already allows through on display. The
 * public artwork detail page (app/artworks/[artwork_id]/page.tsx) renders
 * whatever this editor saves via that same RichText/.richtext path with no
 * changes needed on that side.
 *
 * Submits through a plain HTML form via a hidden input, the same pattern
 * MediumsPicker uses -- so it drops into the existing
 * `<form action={serverAction}>` / useActionState flow without any of the
 * surrounding form needing to become more "client-side" than it already is.
 */

const TOOLBAR_BUTTON =
  "flex h-8 min-w-8 items-center justify-center border border-line px-2 font-sans text-xs text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40";
const TOOLBAR_BUTTON_ACTIVE = "!border-ink bg-ink text-canvas";

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`${TOOLBAR_BUTTON} ${active ? TOOLBAR_BUTTON_ACTIVE : ""}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return; // cancelled
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex flex-wrap gap-1 border-b border-line bg-canvas/60 p-1.5">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
        Link
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({
  name,
  defaultValue,
  placeholder,
  minHeight = "8rem",
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  minHeight?: string;
}) {
  const editor = useEditor({
    // Avoids a Next.js SSR/hydration mismatch warning -- the editor only
    // ever needs to exist client-side.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disabled rather than left reachable only via markdown shortcuts
        // or pasted content with no toolbar control for it -- keep what's
        // offered and what's stored in sync (see the schema note in
        // lib/validation/artwork.ts).
        heading: { levels: [2, 3] },
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: defaultValue || "",
    editorProps: {
      attributes: {
        class: "richtext rte-content focus:outline-none",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  return (
    <div className="rte">
      {editor && <Toolbar editor={editor} />}
      <div className="rte-body">
        <EditorContent editor={editor} />
      </div>
      {/* Serialized on every keystroke via Tiptap's own reactive state
          (EditorContent re-renders as the doc changes), so the hidden
          input's value prop below always reflects the current content at
          submit time without a separate onUpdate handler to keep in sync. */}
      <input type="hidden" name={name} value={editor && !editor.isEmpty ? editor.getHTML() : ""} />
    </div>
  );
}
