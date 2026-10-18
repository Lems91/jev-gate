import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JEV Gate",
  description: "Un portero que decide PASA, FRENA o ESCALA para las acciones de agentes internos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
