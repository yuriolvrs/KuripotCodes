import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/ui/toast";
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
    <html lang="en" suppressHydrationWarning>
      <body className="flex h-screen overflow-hidden">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()"
          }}
        />
        <ToastProvider>
          <Suspense fallback={<div className="w-56 border-r bg-background" />}>
            <Sidebar />
          </Suspense>
          <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
