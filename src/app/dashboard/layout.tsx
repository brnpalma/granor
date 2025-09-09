"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  AreaChart,
  PiggyBank,
  PanelLeft,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/icons";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transações", icon: ArrowRightLeft },
  { href: "/dashboard/budgets", label: "Orçamentos", icon: Wallet },
  { href: "/dashboard/reports", label: "Relatórios", icon: AreaChart },
  { href: "/dashboard/savings", label: "Economias", icon: PiggyBank },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const sidebarContent = (
     <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start gap-2 px-4 text-sm font-medium">
                {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    pathname === item.href && "bg-muted text-primary"
                    )}
                >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                </Link>
                ))}
            </nav>
        </div>
        <div className="mt-auto p-4">
            {mounted && (
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span className="text-sm font-medium">{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>
                </Button>
            )}
        </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        <div className="flex h-[60px] items-center border-b px-6 justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <CategoryIcon category="Economias" className="h-6 w-6 text-primary" />
            <span className="">Granor</span>
          </Link>
        </div>
        {sidebarContent}
      </aside>
      <div className="flex flex-col sm:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Alternar Menu</span>
              </Button>
            </SheetTrigger>
             <SheetContent side="left" className="sm:max-w-xs p-0">
                <SheetHeader>
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                </SheetHeader>
               <div className="flex h-[60px] items-center border-b px-6 justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <CategoryIcon category="Economias" className="h-6 w-6 text-primary" />
                    <span className="">Granor</span>
                </Link>
                </div>
               {sidebarContent}
            </SheetContent>
          </Sheet>
          
           <div className="flex w-full items-center justify-center gap-2">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-lg font-semibold">Julho</span>
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
        <div className="fixed bottom-4 right-4">
            <Button className="rounded-full h-16 w-16 shadow-lg">
                <Plus className="h-8 w-8" />
            </Button>
        </div>
      </div>
    </div>
  );
}
