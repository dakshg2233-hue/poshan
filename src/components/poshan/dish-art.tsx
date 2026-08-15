import Image from "next/image";
import type { DishKey } from "@/lib/poshan-data";

/**
 * Photograph where one exists, vector drawing where it does not.
 *
 * The old comment here claimed you could "pass `photo` on a Dish" — you could
 * not: this component only ever received a DishKey, never the Dish object, so
 * there was structurally no path to an image. A keyed lookup fixes that
 * without changing the signature at all six call sites.
 *
 * Any dish absent from this map keeps its SVG, so a partial photo set looks
 * deliberate rather than broken.
 */
const DISH_PHOTOS: Partial<Record<DishKey, string>> = {
  dal: "/dishes/dal.jpg",
  roti: "/dishes/roti.jpg",
  sabzi: "/dishes/sabzi.jpg",
  dahi: "/dishes/dahi.jpg",
  rice: "/dishes/rice.jpg",
  /* chutney: no photograph yet — falls through to the vector below. */
};

const DISH_ALT: Record<DishKey, string> = {
  dal: "A steel katori of yellow dal",
  roti: "A stack of three rotis",
  sabzi: "A steel katori of green vegetable sabzi",
  dahi: "A steel katori of plain curd",
  rice: "A steel katori of steamed rice",
  chutney: "A small katori of red chutney",
};

export function DishArt({ dish }: { dish: DishKey }) {
  const common = "w-full h-auto max-h-[120px] block";

  const photo = DISH_PHOTOS[dish];
  if (photo) {
    return (
      <span className="block relative w-full h-[120px] rounded-xl overflow-hidden">
        <Image
          src={photo}
          alt={DISH_ALT[dish]}
          fill
          sizes="(max-width: 768px) 45vw, 220px"
          className="object-cover"
        />
      </span>
    );
  }

  switch (dish) {
    case "dal":
      return (
        <svg viewBox="0 0 200 130" aria-hidden className={common}>
          <ellipse cx={100} cy={66} rx={62} ry={46} fill="none" stroke="var(--steel)" strokeWidth={5} />
          <ellipse cx={100} cy={66} rx={53} ry={38} fill="var(--haldi)" />
          <ellipse cx={100} cy={60} rx={53} ry={38} fill="#EDBB35" opacity={0.55} />
          <circle cx={84} cy={56} r={4} fill="#C98E10" />
          <circle cx={110} cy={63} r={4} fill="#C98E10" />
          <circle cx={97} cy={72} r={3.4} fill="#C98E10" />
          <path d="M74 46q10-7 20 0" stroke="var(--elaichi)" strokeWidth={3} fill="none" strokeLinecap="round" />
        </svg>
      );
    case "roti":
      return (
        <svg viewBox="0 0 200 130" aria-hidden className={common}>
          <ellipse cx={100} cy={82} rx={66} ry={30} fill="#E8D4A8" stroke="var(--imli)" strokeWidth={3} />
          <ellipse cx={100} cy={70} rx={66} ry={30} fill="#F1DEB6" stroke="var(--imli)" strokeWidth={3} />
          <ellipse cx={100} cy={58} rx={66} ry={30} fill="#FAECCD" stroke="var(--imli)" strokeWidth={3} />
          <circle cx={80} cy={52} r={3.2} fill="var(--imli)" opacity={0.5} />
          <circle cx={112} cy={62} r={2.6} fill="var(--imli)" opacity={0.4} />
        </svg>
      );
    case "sabzi":
      return (
        <svg viewBox="0 0 200 130" aria-hidden className={common}>
          <ellipse cx={100} cy={66} rx={62} ry={46} fill="none" stroke="var(--steel)" strokeWidth={5} />
          <ellipse cx={100} cy={66} rx={53} ry={38} fill="var(--elaichi)" />
          <circle cx={82} cy={58} r={8} fill="#6FA173" />
          <circle cx={112} cy={66} r={7} fill="#6FA173" />
          <circle cx={98} cy={76} r={6} fill="#3E6B42" />
          <circle cx={120} cy={52} r={5.5} fill="var(--mirch)" />
          <circle cx={104} cy={50} r={4} fill="var(--haldi)" />
        </svg>
      );
    case "dahi":
      return (
        <svg viewBox="0 0 200 130" aria-hidden className={common}>
          <ellipse cx={100} cy={66} rx={62} ry={46} fill="none" stroke="var(--steel)" strokeWidth={5} />
          <ellipse cx={100} cy={66} rx={53} ry={38} fill="#F0EFEA" />
          <ellipse cx={100} cy={61} rx={43} ry={29} fill="#FBFBF9" />
          <path d="M78 62q22-13 44 0" stroke="var(--steel-lo)" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </svg>
      );
    case "rice":
      return (
        <svg viewBox="0 0 200 130" aria-hidden className={common}>
          <path d="M46 100q0-56 54-56t54 56Z" fill="#F5F1E6" stroke="var(--steel)" strokeWidth={4} />
          <circle cx={86} cy={78} r={2.8} fill="var(--steel-lo)" />
          <circle cx={106} cy={70} r={2.8} fill="var(--steel-lo)" />
          <circle cx={98} cy={88} r={2.8} fill="var(--steel-lo)" />
          <path d="M92 50q8-10 16 0" stroke="var(--elaichi)" strokeWidth={3} fill="none" strokeLinecap="round" />
        </svg>
      );
    case "chutney":
      return (
        <svg viewBox="0 0 200 130" aria-hidden className={common}>
          <ellipse cx={100} cy={66} rx={62} ry={46} fill="none" stroke="var(--steel)" strokeWidth={5} />
          <ellipse cx={100} cy={66} rx={53} ry={38} fill="var(--mirch)" />
          <ellipse cx={94} cy={60} rx={34} ry={22} fill="#C9522F" opacity={0.7} />
          <circle cx={88} cy={62} r={3} fill="#7E2412" />
          <path d="M76 48q12-8 24 0" stroke="var(--elaichi)" strokeWidth={3} fill="none" strokeLinecap="round" />
        </svg>
      );
  }
}
