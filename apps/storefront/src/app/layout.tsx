import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

/* Figures get their own face. Jakarta's digits are round and even, which reads
   generic at the sizes the console now uses for values; Space Grotesk has
   flagged ones, open fours and real tabular widths. Scoped through the
   `font-numbers` utility so prose never leaves the text face. */
const numbers = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafd" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c18" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Avelor AI - Conversational Commerce",
  description:
    "Discover products through natural conversation. Next-generation AI-powered shopping platform.",
  keywords: [
    "Avelor",
    "conversational commerce",
    "AI shopping",
    "generative discovery",
    "ecommerce",
  ],
  icons: {
    icon: [
      { url: "/avelor-logo.png", sizes: "32x32", type: "image/png" },
      { url: "/avelor-logo.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/avelor-logo.png",
    apple: [{ url: "/avelor-logo.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Avelor AI - Conversational Commerce",
    description:
      "Discover products through natural conversation. Next-generation AI-powered shopping platform.",
    url: "https://avelor.ai",
    siteName: "Avelor AI",
    images: [
      {
        url: "/avelor-ai-banner.png",
        width: 1200,
        height: 630,
        alt: "Avelor AI - Conversational Commerce",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Avelor AI - Conversational Commerce",
    description:
      "Discover products through natural conversation. Next-generation AI-powered shopping platform.",
    images: ["/avelor-ai-banner.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${numbers.variable}`} suppressHydrationWarning>
      <body>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: inline no-flash theme init
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('avelor-theme');var d=t?t==='night':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()",
          }}
        />
        {children}
      </body>
    </html>
  );
}
