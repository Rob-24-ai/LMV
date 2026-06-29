import type { Metadata } from "next";
import { Poppins, Bagel_Fat_One } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bagel = Bagel_Fat_One({
  variable: "--font-fun",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Lick My Vintage",
  description: "Groovy little listing machine for vintage threads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${bagel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
