import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image to PDF - Convert, Reorder & Edit Photos to PDF",
  description: "Upload 30-40+ images, reorder pages, crop, rotate, and generate high quality PDF easily on mobile and desktop.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
