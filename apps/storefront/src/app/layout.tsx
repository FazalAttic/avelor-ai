import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avelor AI - Conversational Commerce",
  description: "Next-generation AI-powered shopping platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
