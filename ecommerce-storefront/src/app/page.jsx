import LandingPageClient from "./LandingPageClient";
import {
    faqItems,
    LANDING_DESCRIPTION,
    LANDING_SITE_NAME,
    LANDING_SITE_URL,
    LANDING_TITLE,
    landingKeywords,
    pricingPlans,
} from "./landingContent";

const ogImage = `${LANDING_SITE_URL}/scaleup-og.svg`;

export const metadata = {
    metadataBase: new URL(LANDING_SITE_URL),
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    keywords: landingKeywords,
    alternates: {
        canonical: LANDING_SITE_URL,
    },
    openGraph: {
        type: "website",
        siteName: LANDING_SITE_NAME,
        title: LANDING_TITLE,
        description: LANDING_DESCRIPTION,
        url: LANDING_SITE_URL,
        locale: "en_US",
        images: [
            {
                url: ogImage,
                width: 1200,
                height: 630,
                alt: "Scaleup online store builder for Bangladesh sellers",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: LANDING_TITLE,
        description: LANDING_DESCRIPTION,
        images: [ogImage],
    },
    robots: {
        index: process.env.VERCEL_ENV === "preview" ? false : true,
        follow: process.env.VERCEL_ENV === "preview" ? false : true,
    },
};

export const revalidate = 300;

const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: LANDING_SITE_NAME,
    url: LANDING_SITE_URL,
    logo: `${LANDING_SITE_URL}/scaleup-logo.svg`,
    contactPoint: {
        "@type": "ContactPoint",
        email: "support@scaleup.codes",
        contactType: "customer support",
        areaServed: "BD",
        availableLanguage: ["en", "bn"],
    },
};

const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: LANDING_SITE_NAME,
    url: LANDING_SITE_URL,
    description: LANDING_DESCRIPTION,
};

const buildSoftwareApplicationJsonLd = (plans) => ({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: LANDING_SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: LANDING_SITE_URL,
    description: LANDING_DESCRIPTION,
    offers: {
        "@type": "AggregateOffer",
        priceCurrency: "BDT",
        lowPrice: "999",
        highPrice: "3999",
        offerCount: String(pricingPlans.length),
        offers: pricingPlans.map((plan) => ({
            "@type": "Offer",
            name: `${plan.name} plan`,
            price: plan.price.replace(/[^\d]/g, ""),
            priceCurrency: "BDT",
            url: LANDING_SITE_URL,
        })),
    },
});

const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
        },
    })),
};

const getPublicPricingPlans = async () => {
    const baseUrl = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api')
        .replace(/\/$/, '');
    try {
        const response = await fetch(`${baseUrl}/public/plans`, {
            next: { revalidate: 300 }
        });
        if (!response.ok) return pricingPlans;
        const payload = await response.json();
        return Array.isArray(payload?.data) && payload.data.length > 0 ? payload.data : pricingPlans;
    } catch {
        return pricingPlans;
    }
};

export default async function PlatformLandingPage() {
    const activePricingPlans = await getPublicPricingPlans();
    const jsonLd = [
        organizationJsonLd,
        websiteJsonLd,
        buildSoftwareApplicationJsonLd(activePricingPlans),
        faqJsonLd,
    ];

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <LandingPageClient plans={activePricingPlans} />
        </>
    );
}
