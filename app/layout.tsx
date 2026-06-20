import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "D-Quest — วิทยาลัยการอาชีพนายายอาม",
  description: "แพลตฟอร์มสะสมความดีของนักศึกษา",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${prompt.className} antialiased`}>{children}</body>
    </html>
  );
}