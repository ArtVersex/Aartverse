import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

const DRAG_THRESHOLD_PX = 6; // movement under this still counts as a tap/click, not a drag
const EDGE_MARGIN_PX = 12;

interface Position {
  x: number; // distance from the left edge, in px
  y: number; // distance from the top edge, in px
}

/**
 * Shared "press and drag to move, plain tap/click still works" behavior for
 * a fixed floating button. Originally built just for
 * components/WhatsAppButton.tsx; pulled out into this hook so
 * components/GeneralInquiryButton.tsx can be dragged the exact same way --
 * a visitor who finds either button in the way of something should be able
 * to nudge it aside, and both buttons sharing one default corner/stacking
 * means they can easily end up overlapping once either one moves, so
 * consistent behavior matters more here than usual.
 *
 * Position persists in sessionStorage (one key per button) for as long as
 * the current browser session lasts -- a reload or another page on the
 * site keeps it wherever it was dragged, but closing the tab/browser (or
 * opening a fresh one) resets it back to the caller's default corner next
 * time, rather than a dragged position lingering indefinitely. Defaults to
 * whatever fixed-position CSS classes the caller applies for a first-time
 * visitor (or a fresh session), or whenever storage is unavailable (private
 * browsing, blocked storage, SSR) -- every read/write is wrapped in
 * try/catch and silently falls back to that default rather than ever
 * breaking the button. Re-clamps to the viewport on resize so a button
 * dragged near an edge on a wide window can't end up stranded off-screen
 * after the viewport narrows.
 *
 * `consumeDragSuppressesClick()` exists for callers whose "tap" action has
 * no native default action to `preventDefault()` the way an anchor's
 * navigation does (e.g. a <button onClick> that opens a modal, as opposed
 * to WhatsAppButton's <a href>) -- call it at the top of that onClick
 * handler and bail out if it returns true, which it does exactly once,
 * right after a real drag ends.
 */
export function useDraggableFloatingButton<T extends HTMLElement>(storageKey: string) {
  const ref = useRef<T>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [mounted, setMounted] = useState(false);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const dragSuppressesClick = useRef(false);

  function clampToViewport(pos: Position): Position {
    const size = ref.current?.offsetWidth ?? 56;
    const maxX = Math.max(window.innerWidth - size - EDGE_MARGIN_PX, EDGE_MARGIN_PX);
    const maxY = Math.max(window.innerHeight - size - EDGE_MARGIN_PX, EDGE_MARGIN_PX);
    return {
      x: Math.min(Math.max(pos.x, EDGE_MARGIN_PX), maxX),
      y: Math.min(Math.max(pos.y, EDGE_MARGIN_PX), maxY),
    };
  }

  // Reads the saved position only after mounting on the client -- reading
  // sessionStorage during the initial render would mismatch the server-
  // rendered markup (which always starts from the caller's default corner).
  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Position>;
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition(clampToViewport({ x: parsed.x, y: parsed.y }));
        }
      }
    } catch {
      // Storage unavailable or the saved value was corrupted -- keep the
      // default corner position.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleResize() {
      setPosition((prev) => (prev ? clampToViewport(prev) : prev));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e: ReactPointerEvent<T>) {
    if (e.button !== undefined && e.button !== 0) return; // left click / primary touch only
    const rect = e.currentTarget.getBoundingClientRect();
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<T>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    setPosition(clampToViewport({ x: drag.originX + dx, y: drag.originY + dy }));
  }

  function onPointerUp(e: ReactPointerEvent<T>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragState.current = null;
    if (!drag.moved) return; // plain tap/click -- let the caller's own click behavior run as normal

    // A real drag: don't let it also act as a click/navigation, and
    // persist where it landed for the rest of this browser session (see
    // this hook's doc comment -- sessionStorage, not localStorage, so a
    // fresh session starts back at the default corner).
    e.preventDefault();
    dragSuppressesClick.current = true;
    setPosition((current) => {
      if (current) {
        try {
          window.sessionStorage.setItem(storageKey, JSON.stringify(current));
        } catch {
          // Ignore -- the position just won't persist for this session.
        }
      }
      return current;
    });
  }

  function onPointerCancel() {
    dragState.current = null;
  }

  /** Returns true exactly once, right after a real drag ends -- see this
   *  hook's own doc comment above for how a <button onClick> should use it. */
  function consumeDragSuppressesClick(): boolean {
    if (dragSuppressesClick.current) {
      dragSuppressesClick.current = false;
      return true;
    }
    return false;
  }

  const style: CSSProperties | undefined =
    mounted && position
      ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
      : undefined;

  return {
    ref,
    mounted,
    style,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    consumeDragSuppressesClick,
  };
}
