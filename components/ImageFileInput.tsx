"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A plain <input type="file"> with a live preview of whatever the visitor
 * just picked, shown before the form is ever submitted -- most artists
 * upload from a phone (camera roll or straight from the camera), so seeing
 * the actual photo they picked, not just a filename, catches a wrong shot
 * immediately instead of after a full page round-trip. Falls back to
 * showing the existing image (edit forms) when nothing new has been
 * chosen yet, and to a plain placeholder box when there's neither.
 *
 * No cropping/resizing here on purpose -- the upload pipeline
 * (lib/uploads.ts) already re-encodes every image server-side, so a
 * client-side cropper would just be extra weight for a step the server
 * already handles.
 */
export default function ImageFileInput({
  name,
  id,
  label,
  existingUrl,
  aspect = "square",
  error,
  required,
  hint,
}: {
  name: string;
  id?: string;
  label: string;
  existingUrl?: string | null;
  aspect?: "square" | "cover";
  error?: string;
  required?: boolean;
  hint?: string;
}) {
  const inputId = id ?? name;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // A <input type="file">'s selected files can never be set back
  // programmatically, so when React resets this form's own uncontrolled
  // fields after a server action call (it does this on every call, not
  // just a failed one), the actual input goes back to empty -- but
  // previewUrl, a separate piece of React state, would otherwise keep
  // showing the photo the artist picked, silently lying about what's still
  // attached. Runs after every render (no dependency array) so it notices
  // as soon as that reset happens, whichever render it lands on.
  useEffect(() => {
    if (previewUrl && inputRef.current && inputRef.current.files?.length === 0) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPreviewUrl(null);
    }
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  const shownUrl = previewUrl ?? existingUrl ?? null;
  const boxClass = aspect === "cover" ? "h-32 w-full sm:h-40" : "h-28 w-28 sm:h-36 sm:w-36";

  return (
    <div>
      <p className="field-label">{label}</p>
      <div
        className={`mb-3 flex items-center justify-center overflow-hidden border border-line bg-white ${boxClass}`}
      >
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center font-sans text-xs text-muted">No image yet</span>
        )}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        required={required}
        className="block w-full font-sans text-xs text-muted file:mr-3 file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:font-sans file:text-xs file:text-ink hover:file:border-ink"
      />
      {hint && !previewUrl && <p className="mt-1 font-sans text-xs text-muted">{hint}</p>}
      {previewUrl && (
        <p className="mt-1 font-sans text-xs text-muted">New photo selected, not saved yet.</p>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
