import "./globals.css";
import type { Metadata } from "next";

import { Toaster } from "../components/ui/toaster";

export const metadata: Metadata = {
  title: "SalesWay",
  description: "SalesWay workspace"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
