"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, MoreVertical, Search, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react';
import { CreditCardIcon, ItauLogo, NubankLogo, BradescoLogo, PicpayLogo, MercadoPagoLogo } from "@/components/icons";

const chartData = [
  { date: '30/06', value: 450 },
  { date: '01/07', value: 1506 },
  { date: '02/07', value: 600 },
  { date: '03/07', value: 800 },
  { date: '04/07', value: 1200 },
  { date: '05/07', value: 1800 },
  { date: '06/07', value: 2259 },
]

const accounts = [
    { name: 'COFRINHO', provider: 'Itaú', amount: 3114.69, icon: <ItauLogo className="h-8 w-8" /> },
    { name: 'ITAÚ', provider: 'Previsto', amount: 1093.08, subAmount: 180.69, icon: <ItauLogo className="h-8 w-8" /> },
]

const creditCards = [
    { name: 'PICPAY CARD', provider: 'PicPay', amount: 2349.55, dueDate: '05/JUL', paid: true, icon: <PicpayLogo className="h-8 w-8" /> },
    { name: 'MERCADO PAGO', provider: 'Visa', amount: 552.59, dueDate: '04/JUL', paid: true, icon: <MercadoPagoLogo className="h-8 w-8" /> },
    { name: 'BRADESCO', provider: 'Visa', amount: 390.26, dueDate: '10/JUL', locked: true, icon: <BradescoLogo className="h-8 w-8" /> },
    { name: 'NUBANK', provider: 'Mastercard', amount: 1569.62, dueDate: '01/JUL', paid: true, icon: <NubankLogo className="h-8 w-8" /> },
]

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState('saldo');
  
  const totalAmount = accounts.reduce((acc, account) => acc + account.amount, 0);

  return (
    <div className="space-y-4 pb-16">
        <div className="grid grid-cols-3 gap-2 text-center">
            <div onClick={() => setActiveTab('inicial')} className={`cursor-pointer p-2 rounded-lg ${activeTab === 'inicial' ? 'bg-muted' : ''}`}>
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Check className={`h-4 w-4 ${activeTab === 'inicial' ? 'text-primary' : ''}`} />
                    Inicial
                </div>
                <div className="text-lg font-bold">R$ 38,51</div>
            </div>
             <div onClick={() => setActiveTab('saldo')} className={`cursor-pointer p-2 rounded-lg ${activeTab === 'saldo' ? 'bg-muted' : ''}`}>
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <div className={`h-3 w-3 rounded-full ${activeTab === 'saldo' ? 'bg-primary' : 'bg-gray-500'}`} />
                    Saldo
                </div>
                <div className="text-2xl font-bold text-primary">R$ 1.093,08</div>
            </div>
             <div onClick={() => setActiveTab('previsto')} className={`cursor-pointer p-2 rounded-lg ${activeTab === 'previsto' ? 'bg-muted' : ''}`}>
                <div className="text-sm text-muted-foreground">Previsto *</div>
                <div className="text-lg font-bold">R$ 180,14</div>
            </div>
        </div>

      <Card className="bg-card">
        <CardContent className="p-2 h-[200px]">
          <ChartContainer config={{}} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                <YAxis hide={true} domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip 
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} 
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Pesquisar no Minhas Finanças" className="pl-10 bg-card border-card" />
        </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Contas</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon"><ExternalLink className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
          </div>
        </div>
        <Card className="bg-card">
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {accounts.map((account, index) => (
                  <TableRow key={index} className="border-b border-border/50">
                    <TableCell className="p-3">
                        <div className="flex items-center gap-4">
                            {account.icon}
                            <div>
                                <div className="font-semibold">{account.name}</div>
                                <div className="text-sm text-muted-foreground">{account.provider}</div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="p-3 text-right">
                        <div>{account.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                         {account.subAmount && <div className="text-sm text-muted-foreground">{account.subAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>}
                    </TableCell>
                     <TableCell className="p-3 w-10">
                        <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                 <TableRow>
                    <TableCell className="p-3">
                        <div className="font-semibold">Total</div>
                        <div className="text-sm text-muted-foreground">Previsto</div>
                    </TableCell>
                    <TableCell className="p-3 text-right">
                        <div className="font-semibold">{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                        <div className="text-sm text-muted-foreground">{accounts.find(a => a.name === 'ITAÚ')?.subAmount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </TableCell>
                     <TableCell className="p-3 w-10"></TableCell>
                  </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Cartões de crédito</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon"><ExternalLink className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
          </div>
        </div>
        <Card className="bg-card">
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {creditCards.map((card, index) => (
                  <TableRow key={index} className="border-b border-border/50 last:border-b-0">
                    <TableCell className="p-3">
                        <div className="flex items-center gap-4">
                           {card.icon}
                            <div>
                                <div className="font-semibold">{card.name}</div>
                                <div className="text-sm text-muted-foreground">Vencimento</div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                            {card.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            {card.paid && <ShieldCheck className="h-5 w-5 text-green-500" />}
                            {card.locked && <ShieldAlert className="h-5 w-5 text-yellow-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground">{card.dueDate}</div>
                    </TableCell>
                     <TableCell className="p-3 w-10">
                        <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
