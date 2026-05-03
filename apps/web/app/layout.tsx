import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hestia Portal",
  description: "Hestia Real Estate Development — property and tenant operations",
  icons: {
    icon: [{ url: "/brand/hestia-icon.png", type: "image/png" }],
    apple: "/brand/hestia-icon.png"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
