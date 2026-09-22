import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

/**
 * Avatar upload.
 *
 * This route previously accepted any file, of any size, under any name, and
 * handed back a permanently public URL — because the `avatars` bucket was
 * created public and nothing here narrowed that. Any signed-in account could
 * therefore host arbitrary content on Poshan's own domain, which is the part
 * that makes it worth fixing rather than merely tidy: a phishing page served
 * from poshan.co.in is Poshan's problem regardless of who uploaded it.
 *
 * Nothing in the app calls this yet — there is no avatar_url column on
 * profiles and no UI that posts here. It is kept rather than deleted because
 * a profile photograph is a reasonable thing to want later, and a hardened
 * unused route costs nothing; but that is also why it went unnoticed, and
 * the same should not be true of the next one.
 *
 * Four checks, each closing something that was open:
 *
 *   Type, by allowlist rather than by rejecting a blocklist of bad ones. The
 *   dangerous cases here are SVG, which can carry script and would execute
 *   against Poshan's origin if ever served inline, and HTML. An allowlist of
 *   three raster formats cannot be extended by an extension nobody thought of.
 *
 *   Size. An unbounded upload is a storage bill and a memory spike, and this
 *   route reads the whole file into an ArrayBuffer before writing it.
 *
 *   Filename. The old path interpolated `file.name` directly; a name
 *   containing slashes or `..` could write outside the user's own folder,
 *   which is exactly what the new storage policies key on.
 *
 *   URL. The bucket is private now, so the response carries a signed URL that
 *   expires rather than a permanent public one.
 */

/** Raster images only. SVG is deliberately absent — it is a script carrier. */
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const MAX_BYTES = 5 * 1024 * 1024;

/** How long a returned link stays good. Long enough to render, not to share. */
const SIGNED_URL_SECONDS = 60 * 60;

export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return NextResponse.json(
      { error: "Upload a JPEG, PNG or WebP image.", received: file.type || "unknown" },
      { status: 415 }
    );
  }

  /* Checked before reading the body, so an oversized upload is refused
     rather than buffered and then refused. */
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That image is too large. The limit is ${MAX_BYTES / 1024 / 1024}MB.` },
      { status: 413 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }

  /* The name is generated, never taken from the client. The extension comes
     from the allowlist above rather than from the filename, so a .png named
     file that is actually something else still lands as whatever its real
     content type said — and a name full of slashes has nowhere to go. */
  const path = `${user.id}/${Date.now()}.${ext}`;

  const buffer = await file.arrayBuffer();

  const { data, error } = await supabase.storage.from("avatars").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  /* The bucket is private, so there is no public URL to hand back. A signed
     one expires, which also means a link that leaks stops working instead of
     being permanent. */
  const { data: signed, error: signErr } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, SIGNED_URL_SECONDS);

  if (signErr) {
    /* The file is stored; only the link failed. Say so, and return the path,
       so the caller can ask for a fresh URL rather than re-uploading. */
    return NextResponse.json(
      { path: data.path, error: `Uploaded, but could not sign a URL: ${signErr.message}` },
      { status: 207 }
    );
  }

  return NextResponse.json({
    url: signed.signedUrl,
    path: data.path,
    expiresIn: SIGNED_URL_SECONDS,
  });
}
