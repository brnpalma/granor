
"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  AreaChart,
  PiggyBank,
  PanelLeft,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  LogOut,
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
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transações", icon: ArrowRightLeft },
  { href: "/dashboard/budgets", label: "Orçamentos", icon: Wallet },
  { href: "/dashboard/reports", label: "Relatórios", icon: AreaChart },
  { href: "/dashboard/savings", label: "Economias", icon: PiggyBank },
];

function SidebarContent() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex h-[60px] items-center border-b px-6 justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <CategoryIcon category="Economias" className="h-6 w-6 text-primary" />
                    <span className="">Granor</span>
                </Link>
                <ThemeToggleButton />
            </div>
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
             {user && (
                <div className="mt-auto border-t p-4">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user.photoURL || undefined} alt="Avatar" />
                            <AvatarFallback>{user.displayName?.[0] || user.email?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-medium text-sm truncate">{user.displayName || user.email}</span>
                             <Button variant="ghost" size="sm" onClick={handleLogout} className="justify-start p-0 h-auto text-muted-foreground hover:text-primary">
                                <LogOut className="mr-2 h-4 w-4" />
                                Sair
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        <SidebarContent />
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
                    <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                 </SheetHeader>
                 <SidebarContent />
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
