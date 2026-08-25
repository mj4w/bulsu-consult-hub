import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const display = localFont({
  src: "../../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2",
  variable: "--font-display",
  display: "swap",
});
const neutral = localFont({
  src: "../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2",
  variable: "--font-neutral",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Consultation Scheduler | Bulacan State University",
  description: "A simple way for Bulacan State University students to connect with instructors.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

const themeScript = `
  (function () {
    try {
      var theme = window.localStorage.getItem("scheduler-theme") || "light";
      document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
    } catch (error) {
      document.documentElement.dataset.theme = "light";
    }
  })();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${neutral.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-neutral)]">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
