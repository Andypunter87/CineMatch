import { ReactNode } from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

export default function Layout({ children, hideFooter = false }: LayoutProps) {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "#FAF6EE" }}
    >
      <Header />
      <main className="flex-grow" style={{ background: "#FAF6EE" }}>
        {children}
      </main>
      {!hideFooter && <BottomNav />}
    </div>
  );
}
