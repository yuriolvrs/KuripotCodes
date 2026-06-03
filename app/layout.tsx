import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
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
      <body className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden">{children}</div>
      </body>
    </html>
  );
}
