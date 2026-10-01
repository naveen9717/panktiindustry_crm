import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CRM - Customer Relationship Management",
  description: "Modern CRM for managing customers, leads, and payments",
};

/**
 * Applies the persisted (or system) theme before hydration to avoid a flash
 * of the wrong theme. Kept as a plain string so bundlers never transform it
 * (next-themes' Function.toString() approach breaks under esbuild keepNames).
 */
const themeInitScript = `(function(){try{var s=localStorage.getItem("theme");var m=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var t=s||m;document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
