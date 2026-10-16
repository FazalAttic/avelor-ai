import type { Metadata } from "next";
import { CartProvider } from "../context/CartContext";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Avelor AI — Conversational Commerce Storefront",
  description:
    "Next-generation conversational e-commerce storefront with reactive AI shopping assistant, real-time TypeSafe guardrails, and hybrid semantic discovery.",
  keywords: ["e-commerce", "AI shopping assistant", "conversational commerce", "Avelor AI"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="icon" href="/avelor-logo.png" type="image/png" />
      </head>
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
