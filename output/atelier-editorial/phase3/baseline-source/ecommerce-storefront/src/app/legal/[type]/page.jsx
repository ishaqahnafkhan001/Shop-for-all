import Link from "next/link";
import { notFound } from "next/navigation";
import { LANDING_SITE_NAME, LANDING_SITE_URL, legalPages } from "../../landingContent";

export function generateStaticParams() {
    return Object.keys(legalPages).map((type) => ({ type }));
}

export async function generateMetadata({ params }) {
    const { type } = await params;
    const page = legalPages[type];
    if (!page) {
        return {
            title: "Legal Page",
            robots: { index: false, follow: false },
        };
    }

    return {
        title: `${page.title} | ${LANDING_SITE_NAME}`,
        description: page.description,
        alternates: {
            canonical: `${LANDING_SITE_URL}/legal/${type}`,
        },
        openGraph: {
            type: "website",
            siteName: LANDING_SITE_NAME,
            title: `${page.title} | ${LANDING_SITE_NAME}`,
            description: page.description,
            url: `${LANDING_SITE_URL}/legal/${type}`,
        },
    };
}

export default async function LegalPage({ params }) {
    const { type } = await params;
    const page = legalPages[type];
    if (!page) notFound();

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-950 sm:px-8 lg:px-10">
            <article className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                <Link href="/" className="text-sm font-black text-indigo-700 hover:text-indigo-900">
                    ← Back to Scaleup
                </Link>
                <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Scaleup legal</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{page.title}</h1>
                <p className="mt-4 text-base leading-7 text-slate-600">{page.description}</p>

                <div className="mt-8 space-y-5 text-sm leading-7 text-slate-700">
                    {page.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                    ))}
                </div>

                <div className="mt-10 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    For questions, contact <a className="font-bold text-indigo-700" href="mailto:support@scaleup.codes">support@scaleup.codes</a>.
                </div>
            </article>
        </main>
    );
}
