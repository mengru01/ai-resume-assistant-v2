import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Resume Rewrite & Job Application Assistant",
  description:
    "Rewrite resumes, generate ATS versions, discover career paths, and find apply-ready job matches."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
