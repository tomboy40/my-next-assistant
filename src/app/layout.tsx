import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Service Management Assistant",
  description: "AI-powered autonomous mission execution with planning, tool use, autonomous, reflective, and goal-oriented capabilities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
