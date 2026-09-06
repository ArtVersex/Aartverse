export default function EmptyState({
  title = "Nothing here yet",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-line px-6 py-24 text-center">
      <p className="font-display text-2xl">{title}</p>
      {message && <p className="max-w-md text-muted">{message}</p>}
    </div>
  );
}
