

"use client";

import { useState, useEffect, createContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  AreaChart,
  PiggyBank,
  PanelLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  LogOut,
  Menu,
  Target,
  CreditCard,
  Shapes,
  ArrowUpDown,
  Minus,
  Eye,
  EyeOff,
  Settings,
  Merge,
  RotateCcw,
  CalendarClock,
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateProvider, useDate } from "@/hooks/use-date";
import type { UserPreferences } from "@/lib/types";
import { getUserPreferences, updateUserPreferences } from "@/lib/firestore";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/dashboard/accounts", label: "Contas", icon: Wallet },
  { href: "/dashboard/credit-cards", label: "Cartões de Crédito", icon: CreditCard },
  { href: "/dashboard/transactions", label: "Transações", icon: ArrowRightLeft },
  { href: "/dashboard/categories", label: "Categorias", icon: Shapes },
  { href: "/dashboard/budgets", label: "Orçamentos", icon: Target },
  { href: "/dashboard/savings", label: "Metas", icon: PiggyBank },
  { href: "/dashboard/reports", label: "Relatórios", icon: AreaChart },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
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
                    <Image src="/icone/iconeTransp.png" width={41} height={41} alt="Granor Logo" />
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
                        pathname === item.href && "bg-muted text-primary dark:text-blue-200"
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
    const { user } = useAuth();
    const { selectedDate, goToNextMonth, goToPreviousMonth, goToCurrentMonth } = useDate();
    const [formattedDate, setFormattedDate] = useState('');
    const [preferences, setPreferences] = useState<UserPreferences>({ showBalance: true, includePreviousMonthBalance: true, includeBudgetsInForecast: false, includeBudgetsInPastForecast: false });
    
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const handleLinkClick = () => {
        setMobileMenuOpen(false);
    }

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = getUserPreferences(user.uid, setPreferences);
        return () => unsubscribe();
    }, [user]);

    const handlePreferenceToggle = (key: keyof UserPreferences, checked: boolean) => {
        if (!user?.uid) return;
        updateUserPreferences(user.uid, { [key]: checked });
    };

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
        <header className="sticky top-0 z-40 flex h-14 items-center justify-center bg-blue-900 text-white px-4 sm:h-auto">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="sm:hidden bg-transparent border-0 hover:bg-white/10 absolute left-4">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Alternar Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-60 p-0 bg-background border-r-border">
                    <SheetHeader>
                        <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                    </SheetHeader>
                    <SidebarContent onLinkClick={handleLinkClick} />
                </SheetContent>
            </Sheet>

            <div className="flex items-center justify-center sm:gap-2">
                <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={goToPreviousMonth}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-lg font-semibold w-24 sm:w-32 text-center">{formattedDate}</span>
                <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={goToNextMonth}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            <div className="absolute right-4 flex items-center gap-1">
                <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={goToCurrentMonth}>
                    <CalendarClock className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-white/10">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center justify-between">
                            <Label htmlFor="show-balance-switch" className="flex items-center gap-2 cursor-pointer">
                                {preferences.showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                <span>Exibir Saldo</span>
                            </Label>
                            <Switch
                                id="show-balance-switch"
                                checked={preferences.showBalance}
                                onCheckedChange={(checked) => handlePreferenceToggle('showBalance', checked)}
                            />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center justify-between">
                            <Label htmlFor="include-previous-balance-switch" className="flex items-center gap-2 cursor-pointer">
                                <Merge className="h-4 w-4" />
                                <span className="flex-1">Somar saldo anterior em meses futuros</span>
                            </Label>
                            <Switch
                                id="include-previous-balance-switch"
                                checked={preferences.includePreviousMonthBalance}
                                onCheckedChange={(checked) => handlePreferenceToggle('includePreviousMonthBalance', checked)}
                            />
                        </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center justify-between">
                            <Label htmlFor="include-budgets-forecast-switch" className="flex items-center gap-2 cursor-pointer">
                                <Target className="h-4 w-4" />
                                <span className="flex-1">Incluir orçamentos na previsão (mês atual/futuro)</span>
                            </Label>
                            <Switch
                                id="include-budgets-forecast-switch"
                                checked={preferences.includeBudgetsInForecast}
                                onCheckedChange={(checked) => handlePreferenceToggle('includeBudgetsInForecast', checked)}
                            />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center justify-between">
                            <Label htmlFor="include-budgets-past-forecast-switch" className="flex items-center gap-2 cursor-pointer">
                                <RotateCcw className="h-4 w-4" />
                                <span className="flex-1">Incluir orçamentos na previsão (meses passados)</span>
                            </Label>
                            <Switch
                                id="include-budgets-past-forecast-switch"
                                checked={preferences.includeBudgetsInPastForecast}
                                onCheckedChange={(checked) => handlePreferenceToggle('includeBudgetsInPastForecast', checked)}
                            />
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { clearBalanceCache } = useDate();
    
    const showHeader = !pathname.startsWith('/dashboard/transactions/new');

    const paddingPainel = pathname === '/dashboard' || pathname === '/dashboard/' 
                            ? "flex-1"
                            : "flex-1 p-4 sm:p-6";

    useEffect(() => {
        setIsLoading(true);
        clearBalanceCache();
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 300); // Small delay to allow the new page to start its own loading
        return () => clearTimeout(timer);
    }, [pathname, clearBalanceCache]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <aside className={cn("fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r border-border bg-background sm:flex", !showHeader && "sm:hidden")}>
                <SidebarContent onLinkClick={() => { }} />
            </aside>
            <div className={cn("flex flex-col", showHeader && "sm:pl-60")}>
                {showHeader && <Header />}
                <main id="main-principal" className={cn(paddingPainel, showHeader && "")}>
                    {isLoading ? (
                        <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : (
                        children
                    )}
                </main>
                {showHeader && (
                    <div className="fixed bottom-6 right-6 z-40">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90">
                                    <Plus className="h-7 w-7" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 mb-2" side="top" align="end">
                                <DropdownMenuItem onClick={() => router.push('/dashboard/transactions/new?type=transfer')}>
                                    <div className="bg-yellow-500/20 p-2 rounded-full mr-3">
                                        <ArrowUpDown className="h-5 w-5 text-yellow-500" />
                                    </div>
                                    <span>Transferência</span>
                                </DropdownMenuItem>
                                 <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push('/dashboard/transactions/new?type=income')}>
                                    <div className="bg-green-500/20 p-2 rounded-full mr-3">
                                        <Plus className="h-5 w-5 text-green-500" />
                                    </div>
                                    <span>Receita</span>
                                </DropdownMenuItem>
                                 <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push('/dashboard/transactions/new?type=expense')}>
                                     <div className="bg-red-500/20 p-2 rounded-full mr-3">
                                        <Minus className="h-5 w-5 text-red-500" />
                                    </div>
                                    <span>Despesa</span>
                                </DropdownMenuItem>
                                 <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push('/dashboard/transactions/new?type=expense&isCreditCard=true')}>
                                    <div className="bg-blue-500/20 p-2 rounded-full mr-3">
                                        <CreditCard className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <span>Despesa cartão</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push('/dashboard/transactions/new?type=credit_card_reversal')}>
                                    <div className="bg-green-500/20 p-2 rounded-full mr-3">
                                        <RotateCcw className="h-5 w-5 text-green-500" />
                                    </div>
                                    <span>Estorno Cartão</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
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
