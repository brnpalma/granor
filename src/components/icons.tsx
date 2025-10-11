
"use client";

import {
  Utensils,
  Car,
  ShoppingBag,
  Ticket,
  Bolt,
  Home,
  Landmark,
  PiggyBank,
  MoreHorizontal,
  type LucideProps,
  Shapes,
  Wallet,
  ArrowRightLeft,
  PlusCircle,
  Calendar,
  CreditCard,
} from "lucide-react";
import Image from 'next/image';

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  Alimentação: Utensils,
  Transporte: Car,
  Compras: ShoppingBag,
  Entretenimento: Ticket,
  Serviços: Bolt,
  Aluguel: Home,
  Salário: Landmark,
  Economias: PiggyBank,
  Outros: MoreHorizontal,
  Categorias: Shapes,
  "Parcela inicial": ArrowRightLeft,
  "Quantidade": PlusCircle,
  "Periodicidade": Calendar,
};

interface CategoryIconProps extends LucideProps {
  category: string;
}

export function CategoryIcon({ category, ...props }: CategoryIconProps) {
  const IconComponent = (iconMap as Record<string, React.ComponentType<LucideProps>>)[category] || MoreHorizontal;
  return <IconComponent {...props} />;
}


export function CreditCardDisplayIcon({ color }: { color?: string }) {
    return (
        <div style={{ backgroundColor: color || '#607D8B' }} className="rounded-full h-8 w-8 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-white"/>
        </div>
    );
}

export const BankIcon = ({ name, color }: { name: string; color?: string }) => {
    const lowerCaseName = name.toLowerCase();
    
    if (lowerCaseName.includes("carteira")) {
        return <div style={{ backgroundColor: color || '#607D8B' }} className="rounded-full h-8 w-8 flex items-center justify-center"><Wallet className="h-5 w-5 text-white"/></div>;
    }
    
    return <div style={{ backgroundColor: color || '#607D8B' }} className="rounded-full h-8 w-8 flex items-center justify-center"><Landmark className="h-5 w-5 text-white"/></div>;
};
