/** Route-level loading state. Mirrors the app's own ground so it never flashes white. */
export default function Loading() {
  return (
    <div className="grid min-h-[100svh] place-items-center" style={{ background: "var(--roti)" }} aria-busy="true">
      <p className="sr-only">Loading</p>
      <span className="loader h-8 w-8 rounded-full border-2 border-t-transparent"
        style={{ borderColor: "var(--kesar)", borderTopColor: "transparent" }} aria-hidden="true" />
    </div>
  );
}
