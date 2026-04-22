import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maison des Chefs | Premium Private Chef Experiences in Montreal",
  description: "Discover and book trusted private chefs for unforgettable at-home dining experiences in Montreal. From intimate dinners to grand celebrations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
