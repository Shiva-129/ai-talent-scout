import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PipelineProvider } from "@/context/PipelineContext";
import PipelineStepper from "@/components/PipelineStepper";
import PageTransition from "@/components/PageTransition";
import { ToastProvider } from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Talent Scout",
  description: "AI-Powered Candidate Sourcing & Engagement",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-[#f8fafc] text-slate-900`}>
        <PipelineProvider>
          <ToastProvider>
            <Navbar />
            <PipelineStepper />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <ErrorBoundary>
                <PageTransition>
                  {children}
                </PageTransition>
              </ErrorBoundary>
            </main>
          </ToastProvider>
        </PipelineProvider>
      </body>
    </html>
  );
}
