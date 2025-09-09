"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer
} from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, MoreVertical, Search, ExternalLink, ShieldCheck, ShieldAlert, Baby, User, Pill, Fuel, ShoppingCart, Wheat, MoreHorizontal } from 'lucide-react';
import { CreditCardIcon, ItauLogo, NubankLogo, BradescoLogo, PicpayLogo, MercadoPagoLogo } from "@/components/icons";
import { Progress } from "@/components/ui/progress";

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

const expenseBudgets = [
    { name: 'BERNARDO FIXAS', amount: 0.00, spent: 0.00, icon: Baby, color: 'text-cyan-400' },
    { name: 'BIANCA', amount: 0.54, spent: 0.53, icon: User, color: 'text-fuchsia-400' },
    { name: 'FARMÁCIA', amount: 0.00, spent: 0.00, icon: Pill, color: 'text-pink-500' },
    { name: 'GASOLINA', amount: 0.00, spent: 0.00, icon: Fuel, color: 'text-amber-400' },
    { name: 'MERCADO', amount: 0.00, spent: 0.00, icon: ShoppingCart, color: 'text-pink-400' },
    { name: 'PÃO', amount: 0.00, spent: 0.00, icon: Wheat, color: 'text-yellow-400' },
]

const categoryExpenses = {
    total: 5155.85,
    data: [
        { name: 'Eletrônicos', value: 764, color: '#38bdf8' }, // cyan-400
        { name: 'Outros', value: 719, color: '#f472b6' }, // pink-400
        { name: 'Saúde', value: 711, color: '#f97316' }, // orange-500
        { name: 'Casa', value: 467, color: '#f59e0b' }, // amber-500
        { name: 'Demais...', value: 2495, color: '#6366f1' }, // indigo-500
    ]
}


export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState('saldo');
  
  const totalAmount = accounts.reduce((acc, account) => acc + account.amount, 0);

  return (
    <div className="space-y-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
            <div onClick={() => setActiveTab('inicial')} className={`cursor-pointer p-2 rounded-lg ${activeTab === 'inicial' ? 'bg-muted' : ''}`}>
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                    <Check className={`h-4 w-4 ${activeTab === 'inicial' ? 'text-primary' : ''}`} />
                    Inicial
                </div>
                <div className="text-xl font-bold whitespace-nowrap">R$ 38,51</div>
            </div>
             <div onClick={() => setActiveTab('saldo')} className={`cursor-pointer p-2 rounded-lg ${activeTab === 'saldo' ? 'bg-muted' : ''}`}>
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                    <div className={`h-3 w-3 rounded-full ${activeTab === 'saldo' ? 'bg-primary' : 'bg-gray-500'}`} />
                    Saldo
                </div>
                <div className="text-3xl font-bold text-primary whitespace-nowrap">R$ 1.093,08</div>
            </div>
             <div onClick={() => setActiveTab('previsto')} className={`cursor-pointer p-2 rounded-lg ${activeTab === 'previsto' ? 'bg-muted' : ''}`}>
                <div className="text-sm text-muted-foreground whitespace-nowrap">Previsto *</div>
                <div className="text-xl font-bold whitespace-nowrap">R$ 180,14</div>
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
          <h2 className="text-xl font-semibold">Orçamentos de despesas</h2>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-5 w-5" /></Button>
        </div>
        <Card>
          <CardContent className="p-4 space-y-4">
            {expenseBudgets.map((budget, index) => {
              const progress = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 100;
              const Icon = budget.icon;
              return (
                <div key={index}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${budget.color.replace('text-', 'bg-')}/20`}>
                        <Icon className={`h-6 w-6 ${budget.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{budget.name}</span>
                        <span className="text-sm font-medium">{budget.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-2" />
                        <span className="text-xs text-muted-foreground">{Math.floor(progress)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Despesas por categoria</h2>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon"><ExternalLink className="h-5 w-5" /></Button>
            </div>
        </div>
        <Card>
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 items-center">
                    <div className="h-48 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={categoryExpenses.data} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius="60%" 
                                    outerRadius="80%"
                                    paddingAngle={2}
                                    stroke="none"
                                >
                                    {categoryExpenses.data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                             <span className="text-2xl font-bold">
                                {categoryExpenses.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                        {categoryExpenses.data.map((entry, index) => (
                             <div key={index} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                <span>{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
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

    