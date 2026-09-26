import { notFound } from "next/navigation";

/**
 * Everything under /dev is a developer tool: the meal library preview
 * lists all 1,000+ meals with filters and was marked "remove before
 * production". It shipped anyway and was reachable at poshan.co.in/dev/meals.
 *
 * A production build 404s the whole folder instead. NODE_ENV is inlined at
 * build time, so this is a constant in the bundle, and `npm run dev` keeps
 * the tool.
 */
export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
