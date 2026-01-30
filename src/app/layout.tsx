import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/context/LanguageContext';
import { RealtimeProvider } from "@/context/RealtimeContext";
import ErrorBoundary from "@/components/ErrorBoundary";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "eqscience - Rayong EQ.Science Learning Center",
  description: "Student Assessment System - ระบบจัดการผลสัมฤทธิ์นักเรียน",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${kanit.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <RealtimeProvider>
                <ErrorBoundary>{children}</ErrorBoundary>
                <Toaster position="top-right" richColors closeButton theme="light" />
              </RealtimeProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
