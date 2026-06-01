import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PH Ride Promo Aggregator",
  description: "Private ride-hailing promo dashboard for the Philippines"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
