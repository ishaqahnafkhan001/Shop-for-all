import { redirect } from "next/navigation";

const trimTrailingSlash = (value = "") => String(value || "").replace(/\/$/, "");

export default function LoginRedirectPage() {
    const directLoginUrl = process.env.NEXT_PUBLIC_ADMIN_PANEL_URL;
    if (directLoginUrl) redirect(directLoginUrl);

    const adminBaseUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
    if (adminBaseUrl) redirect(`${trimTrailingSlash(adminBaseUrl)}/login`);

    redirect("https://admin.scaleup.codes/login");
}
