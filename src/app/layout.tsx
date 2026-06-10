import type { Metadata } from "next";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";

// Schema.org structured data for SEO
const schemaData = {
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Private Chef Booking",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Maison des Chefs",
    "description": "Montreal's premier marketplace connecting you with verified private chefs for unforgettable at-home dining experiences.",
    "url": "https://maisondeschefs.com",
    "areaServed": {
      "@type": "City",
      "name": "Montreal"
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Montreal",
      "addressRegion": "QC",
      "addressCountry": "CA"
    },
    "priceRange": "$$$$",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "127"
    }
  },
  "areaServed": {
    "@type": "City",
    "name": "Montreal"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Private Chef Experiences",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Intimate Prix Fixe Dinner"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Cocktail & Hors d'oeuvres"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Cooking Class Experience"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Celebration & Events"
        }
      }
    ]
  }
};

export function generateMetadata(): Metadata {
  return {
    title: "Maison des Chefs | Premium Private Chef Experiences in Montreal",
    description: "Discover and book verified private chefs for unforgettable at-home dining in Montreal. Intimate dinners, cocktail parties, cooking classes, and celebrations.",
    keywords: ["private chef Montreal", "personal chef", "home dining", "private chef booking", "corporate catering Montreal"],
    openGraph: {
      title: "Maison des Chefs | Premium Private Chef Experiences in Montreal",
      description: "Discover and book verified private chefs for unforgettable at-home dining in Montreal.",
      type: "website",
      locale: "en_CA",
      siteName: "Maison des Chefs",
    },
    twitter: {
      card: "summary_large_image",
      title: "Maison des Chefs | Premium Private Chef Experiences in Montreal",
      description: "Book verified private chefs for unforgettable at-home dining in Montreal.",
    },
    other: {
      "application/ld+json": JSON.stringify(schemaData),
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
