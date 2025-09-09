"use client";

import type { Category } from "@/lib/types";
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
} from "lucide-react";

const iconMap: Record<Category, React.ComponentType<LucideProps>> = {
  Alimentação: Utensils,
  Transporte: Car,
  Compras: ShoppingBag,
  Entretenimento: Ticket,
  Serviços: Bolt,
  Aluguel: Home,
  Salário: Landmark,
  Economias: PiggyBank,
  Outros: MoreHorizontal,
};

interface CategoryIconProps extends LucideProps {
  category: Category;
}

export function CategoryIcon({ category, ...props }: CategoryIconProps) {
  const IconComponent = iconMap[category] || MoreHorizontal;
  return <IconComponent {...props} />;
}
