import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HostCenter.lg",
  description: "Sistema de gerenciamento de hospedagem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
