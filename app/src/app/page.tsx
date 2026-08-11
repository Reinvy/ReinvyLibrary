import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/types";

const COOKIE = "rl-locale";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const h = await headers();
  const acceptLanguage = h.get("accept-language") ?? "";
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(COOKIE)?.value;

  const preferred: Locale =
    cookieLocale === "id" || cookieLocale === "en"
      ? cookieLocale
      : /(^|,)(id|in|ms)(-|,|$)/i.test(acceptLanguage)
        ? "id"
        : "en";

  redirect(`/${preferred}`);
}
