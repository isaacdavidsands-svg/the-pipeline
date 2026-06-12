import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Pipeline",
  description: "Connect the clubs. Build the timeline. The ultimate football grid game.",
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