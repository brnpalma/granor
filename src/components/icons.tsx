
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


export function CreditCardIcon(props: LucideProps) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
    )
}

export const ItauLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="bg-[#FF7A00] rounded-full p-1 h-8 w-8 flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M21.5625 21.9375H18.0469V8.0625H21.5625V21.9375ZM13.8281 21.9375H10.3125V8.0625H13.8281V21.9375ZM6.09375 21.9375H2.57812V8.0625H6.09375V21.9375Z" fill="white"/>
            <path d="M12.0083 4.60938C12.5532 4.60938 13.0805 4.41703 13.4862 4.07348C13.892 3.72993 14.1488 3.25624 14.2081 2.74414H9.80859C9.86789 3.25624 10.1247 3.72993 10.5305 4.07348C10.9362 4.41703 11.4635 4.60938 12.0083 4.60938Z" fill="#0055A4"/>
        </svg>
    </div>
);

export const PicpayLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="bg-[#21C25E] rounded-full h-8 w-8 flex items-center justify-center" {...props}>
       <span className="font-bold text-white text-lg">P</span>
    </div>
);

export const MercadoPagoLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <div className="bg-[#009EE3] rounded-full h-8 w-8 flex items-center justify-center" {...props}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.5 10.3125C17.5 9.04688 16.5 8.5 15.1875 8.5H12.625V15.5H13.875V11.875H15.1875C16.5 11.875 17.5 11.5 17.5 10.3125ZM15.1875 10.8125H13.875V9.5625H15.1875C15.8125 9.5625 16.25 9.8125 16.25 10.3125C16.25 10.6875 15.9375 10.8125 15.1875 10.8125Z" fill="white"/>
      <path d="M6.5 6H18C19.65 6 21 7.35 21 9V15C21 16.65 19.65 18 18 18H6.5C4.85 18 3.5 16.65 3.5 15V9C3.5 7.35 4.85 6 6.5 6ZM10.5 15.5V8.5H7.5V15.5H8.75V11.8125L10.5 15.5Z" fill="white"/>
    </svg>
  </div>
);

export const BradescoLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <div className="bg-[#CC092F] rounded-full h-8 w-8 flex items-center justify-center" {...props}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" fill="white"/>
        <path d="M12.18 10.35L14.99 7.54L16.4 8.95L13.59 11.76L17.5 11.76V13.76H11.5V7.76H13.5V10.35H12.18Z" fill="white"/>
        <path d="M8 8H10V16H8V8Z" fill="white"/>
    </svg>
  </div>
);


export const NubankLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <div className="bg-[#820AD1] rounded-full h-8 w-8 flex items-center justify-center" {...props}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.0125 14.1558C11.956 14.1558 11.905 14.1558 11.8494 14.1558V9.89886H10.1035V14.5942C9.02246 14.3643 8.27441 13.3857 8.27441 12.1797C8.27441 10.6699 9.50781 9.43652 11.0176 9.43652C12.3135 9.43652 13.376 10.2954 13.6855 11.458H15.4424C15.1152 9.2207 13.2422 7.64844 11.0176 7.64844C8.52441 7.64844 6.5166 9.65625 6.5166 12.1797C6.5166 14.606 8.32617 16.5371 10.748 16.6621V21.5L13.9131 18.3349L12.0125 16.4343V14.1558Z" fill="white"/>
        <path d="M15.4883 9.84375H17.2344V14.1007H18.9805V9.84375H20.7266V8.10303H15.4883V9.84375Z" fill="white"/>
    </svg>
  </div>
);

export const BankIcon = ({ name }: { name: string }) => {
    const lowerCaseName = name.toLowerCase();
    if (lowerCaseName.includes("itaú") || lowerCaseName.includes("itau")) {
        return <ItauLogo />;
    }
    if (lowerCaseName.includes("nubank")) {
        return <NubankLogo />;
    }
    if (lowerCaseName.includes("picpay")) {
        return <PicpayLogo />;
    }
    if (lowerCaseName.includes("mercado pago")) {
        return <MercadoPagoLogo />;
    }
     if (lowerCaseName.includes("bradesco")) {
        return <BradescoLogo />;
    }
    if (lowerCaseName.includes("carteira")) {
        return <div className="bg-muted rounded-full h-8 w-8 flex items-center justify-center"><Wallet className="h-5 w-5 text-muted-foreground"/></div>;
    }
    return <CategoryIcon category="Outros" className="h-8 w-8 text-muted-foreground" />;
};
