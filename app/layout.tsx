import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "KuripotCodes",
  description: "Private ride-hailing promo dashboard for the Philippines"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden">
        <Suspense fallback={<div className="w-56 border-r bg-white" />}>
          <Sidebar />
        </Suspense>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
