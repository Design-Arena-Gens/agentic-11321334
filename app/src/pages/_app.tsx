import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark", "bg-ink-950");
    }
  }, []);

  return <Component {...pageProps} />;
}
