import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PipelineProvider } from "@/context/PipelineContext";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TalentAI — AI-Powered Candidate Sourcing",
  description: "Upload a job description. Our AI discovers, scores, and engages candidates — delivering a ranked shortlist in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <PipelineProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </PipelineProvider>
      </body>
    </html>
  );
}
