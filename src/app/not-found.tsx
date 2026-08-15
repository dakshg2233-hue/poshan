import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] grid place-items-center px-6">
      <div className="max-w-[46ch] text-center">
        {/* The thali mark, empty — the page equivalent of an empty plate. */}
        <svg viewBox="0 0 80 80" aria-hidden className="w-20 h-20 mx-auto mb-6">
          <circle cx={40} cy={40} r={34} fill="none" stroke="var(--steel)" strokeWidth={3} />
          <circle cx={40} cy={40} r={25} fill="none" stroke="var(--steel-lo)" strokeWidth={1.5} />
        </svg>
        <h1
          className="text-[clamp(1.7rem,4vw,2.4rem)] leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Nothing on this plate
        </h1>
        <p className="mt-3" style={{ color: "var(--ink-soft)" }}>
          That page does not exist. The thali, the meal plans and the biomarker
          tracker are all on the main page.
        </p>
        <Link
          href="/"
          className="inline-flex items-center min-h-12 px-6 rounded-full font-extrabold text-[0.94rem] no-underline mt-7"
          style={{ background: "var(--kesar-fill)", color: "#fff" }}
        >
          Back to Poshan
        </Link>
      </div>
    </div>
  );
}
