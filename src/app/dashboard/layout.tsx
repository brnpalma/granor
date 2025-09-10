
"use client";

import { useState, useEffect } from "react";
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
  Menu,
  Target,
  CreditCard,
  Shapes,
  ArrowUpDown,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/icons";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateProvider, useDate } from "@/hooks/use-date";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/dashboard/accounts", label: "Contas", icon: Wallet },
  { href: "/dashboard/credit-cards", label: "Cartões de Crédito", icon: CreditCard },
  { href: "/dashboard/transactions", label: "Transações", icon: ArrowRightLeft },
  { href: "/dashboard/categories", label: "Categorias", icon: Shapes },
  { href: "/dashboard/budgets", label: "Orçamentos", icon: Target },
  { href: "/dashboard/reports", label: "Relatórios", icon: AreaChart },
  { href: "/dashboard/savings", label: "Metas", icon: PiggyBank },
];

function SidebarContent({ onLinkClick }: { onLinkClick: () => void }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground">
            <div className="flex h-[60px] items-center border-b border-border px-6 justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={onLinkClick}>
                    <CategoryIcon category="Economias" className="h-6 w-6 text-amber-500" />
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
                        onClick={onLinkClick}
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
                <div className="mt-auto border-t border-border p-4">
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

function Header() {
    const { selectedDate, goToNextMonth, goToPreviousMonth } = useDate();
    const [formattedDate, setFormattedDate] = useState('');

    useEffect(() => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const selectedYear = selectedDate.getFullYear();

        let dateString;

        if (currentYear === selectedYear) {
            dateString = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(selectedDate);
        } else {
            const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(selectedDate).replace('.', '');
            const year = selectedDate.getFullYear().toString().slice(-2);
            dateString = `${month.charAt(0).toUpperCase() + month.slice(1)}/${year}`;
        }

        setFormattedDate(dateString.replace(/^\w/, (c) => c.toUpperCase()));
    }, [selectedDate]);


    return (
        <div className="flex w-full items-center justify-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-gray-700" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-lg font-semibold w-32 text-center">{formattedDate}</span>
            <Button variant="ghost" size="icon" className="hover:bg-gray-700" onClick={goToNextMonth}>
                <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
    );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 300); // Small delay to allow the new page to start its own loading
        return () => clearTimeout(timer);
    }, [pathname]);

    const handleLinkClick = () => {
        setMobileMenuOpen(false);
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-[#18181b]">
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r border-border bg-background sm:flex">
                <SidebarContent onLinkClick={() => { }} />
            </aside>
            <div className="flex flex-col sm:pl-60">
                <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-[#18181b] px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 text-white">
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="outline" className="sm:hidden bg-transparent border-0 hover:bg-gray-700">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Alternar Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="sm:max-w-xs p-0 bg-background border-r-border">
                            <SheetHeader>
                                <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                            </SheetHeader>
                            <SidebarContent onLinkClick={handleLinkClick} />
                        </SheetContent>
                    </Sheet>

                    <Header />

                    <Button variant="ghost" size="icon" className="hover:bg-gray-700">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </header>
                <main className="flex-1 p-4 sm:px-6 sm:py-0">
                    {isLoading ? (
                        <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : (
                        children
                    )}
                </main>
                <div className="fixed bottom-6 right-6 z-40">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="rounded-full h-16 w-16 shadow-lg bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-8 w-8" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 mb-2" side="top" align="end">
                            <DropdownMenuItem>
                                <div className="bg-yellow-500/20 p-2 rounded-full mr-3">
                                    <ArrowUpDown className="h-5 w-5 text-yellow-500" />
                                </div>
                                <span>Transferência</span>
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <div className="bg-green-500/20 p-2 rounded-full mr-3">
                                    <Plus className="h-5 w-5 text-green-500" />
                                </div>
                                <span>Receita</span>
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                 <div className="bg-red-500/20 p-2 rounded-full mr-3">
                                    <Minus className="h-5 w-5 text-red-500" />
                                </div>
                                <span>Despesa</span>
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <div className="bg-blue-500/20 p-2 rounded-full mr-3">
                                    <CreditCard className="h-5 w-5 text-blue-500" />
                                </div>
                                <span>Despesa cartão</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DateProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </DateProvider>
    );
}
