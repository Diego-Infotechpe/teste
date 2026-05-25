import React from "react";
import { 
  Users, 
  Printer as PrinterIcon, 
  DollarSign, 
  AlertTriangle, 
  FileText, 
  Activity,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Client, Printer, MeterReading } from "../types";
import { formatCurrency, formatNumber, calculateSupplyStatus } from "../utils";

interface DashboardProps {
  clients: Client[];
  printers: Printer[];
  readings: MeterReading[];
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ clients, printers, readings, onNavigate }: DashboardProps) {
  // 1. Calculations for KPIs
  const activeClientsCount = clients.length;
  const activePrinters = printers.filter(p => !p.isDeleted);
  const rentedPrintersCount = activePrinters.filter(p => p.clientId !== "").length;
  
  // Safety margin warning count (Toner or Drum <= 10% or manual drum replacement flag)
  const lowSuppliesCount = activePrinters.filter(p => {
    if (p.clientId === "") return false; // ignore unassigned machines in stock
    const tonerStatus = calculateSupplyStatus(p.tonerAutonomy, p.tonerPrinted);
    const drumStatus = calculateSupplyStatus(p.drumAutonomy, p.drumPrinted);
    return tonerStatus.isWithinSafetyMargin || drumStatus.isWithinSafetyMargin || p.needsDrumReplacement;
  }).length;

  // Let's compute current month (May 2026 based on timestamp) faturamento
  const currentMonthReadings = readings.filter(r => r.date === "2026-05");
  const currentMonthRevenue = currentMonthReadings.reduce((sum, r) => sum + r.amountCharged, 0);

  // 2. Prepare charts data
  // Table 1: Billing over time (group by Month/Year)
  const monthlyRevenueMap: { [key: string]: { date: string; mono: number; color: number; revenue: number } } = {};
  
  readings.forEach(r => {
    if (!monthlyRevenueMap[r.date]) {
      // Find month name nicely
      const parts = r.date.split("-");
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const displayDate = parts.length === 2 ? `${monthNames[parseInt(parts[1], 10) - 1]}/${parts[0].slice(2)}` : r.date;
      
      monthlyRevenueMap[r.date] = {
        date: displayDate,
        mono: 0,
        color: 0,
        revenue: 0
      };
    }
    monthlyRevenueMap[r.date].revenue += r.amountCharged;
    monthlyRevenueMap[r.date].mono += r.monoConsumed;
    monthlyRevenueMap[r.date].color += r.colorConsumed;
  });

  const revenueChartData = Object.values(monthlyRevenueMap).sort((a, b) => {
    // Sort logically by month keys (like "2026-02", "2026-03")
    return a.date.localeCompare(b.date);
  });

  // Table 2: Printing volume per client (Mono vs Color) for the current month or total
  const clientVolumeMap: { [clientId: string]: { clientName: string; mono: number; color: number } } = {};
  clients.forEach(c => {
    clientVolumeMap[c.id] = { clientName: c.name.split("-")[0].trim(), mono: 0, color: 0 };
  });

  readings.forEach(r => {
    const printer = printers.find(p => p.id === r.printerId);
    if (printer && printer.clientId && clientVolumeMap[printer.clientId]) {
      clientVolumeMap[printer.clientId].mono += r.monoConsumed;
      clientVolumeMap[printer.clientId].color += r.colorConsumed;
    }
  });

  const clientVolumeData = Object.values(clientVolumeMap).filter(item => item.mono > 0 || item.color > 0);

  // Table 3: Printer Brand Distribution
  const brandMap: { [brand: string]: number } = {};
  printers.forEach(p => {
    if (!p.isDeleted) {
      brandMap[p.brand] = (brandMap[p.brand] || 0) + 1;
    }
  });

  const brandChartData = Object.entries(brandMap).map(([name, value]) => ({ name, value }));
  const COLORS = ["#0284c7", "#0d9488", "#4f46e5", "#db2777", "#ea580c"];

  // 3. Find top 4 critical printers inside the safety margin or with manual replacement flags
  const criticalPrinters = printers
    .filter(p => !p.isDeleted && p.clientId !== "")
    .map(p => {
      const toner = calculateSupplyStatus(p.tonerAutonomy, p.tonerPrinted);
      const drum = calculateSupplyStatus(p.drumAutonomy, p.drumPrinted);
      const client = clients.find(c => c.id === p.clientId);
      return {
        printer: p,
        clientName: client?.name || "Desconhecido",
        tonerPercent: toner.percentage,
        drumPercent: drum.percentage,
        isCritical: toner.isWithinSafetyMargin || drum.isWithinSafetyMargin || !!p.needsDrumReplacement,
        worstLevel: p.needsDrumReplacement ? 0 : Math.min(toner.percentage, drum.percentage)
      };
    })
    .filter(item => item.isCritical)
    .sort((a, b) => a.worstLevel - b.worstLevel)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Activity size={180} className="text-cyan-400" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-wider uppercase mb-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Centro de Operações InfotechPE
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Gestão de Outsourcing de Impressoras
          </h1>
          <p className="mt-2 text-slate-300 text-sm md:text-base leading-relaxed">
            Painel em tempo real para monitoramento de suprimentos, alarmes de margem de segurança de 10%, controle de leituras mensais e faturamento personalizado por cliente.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Faturamento (Maio/2026)</p>
            <h3 className="text-2xl font-bold text-white">{formatCurrency(currentMonthRevenue)}</h3>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <TrendingUp size={12} />
              <span>Baseado nas leituras manuais</span>
            </p>
          </div>
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/10">
            <DollarSign size={20} />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Clientes Ativos</p>
            <h3 className="text-2xl font-bold text-white">{activeClientsCount}</h3>
            <button 
              onClick={() => onNavigate("clientes")}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-0.5"
            >
              <span>Gerenciar contratos</span>
              <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="p-3.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/15">
            <Users size={20} />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">Impressoras Alugadas</p>
            <h3 className="text-2xl font-bold text-white">
              {rentedPrintersCount} <span className="text-xs font-normal text-slate-500">de {printers.filter(p => !p.isDeleted).length}</span>
            </h3>
            <button 
              onClick={() => onNavigate("impressoras")}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-0.5"
            >
              <span>Ver inventário</span>
              <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/15">
            <PrinterIcon size={20} />
          </div>
        </div>

        {/* KPI 4 */}
        <div className={`p-5 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
          lowSuppliesCount > 0 
            ? "bg-amber-950/40 border-amber-500/30 text-amber-100 animate-pulse" 
            : "bg-slate-900/60 border-slate-800"
        }`}>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Abaixo do Limite (10%)</p>
            <h3 className="text-2xl font-bold text-white">{lowSuppliesCount}</h3>
            <button 
              onClick={() => onNavigate("insumos")}
              className="text-xs text-amber-400 hover:underline flex items-center gap-0.5 font-medium"
            >
              {lowSuppliesCount > 0 ? "Ver chamados críticos" : "Nenhum alerta crítico"}
              <ArrowUpRight size={12} />
            </button>
          </div>
          <div className={`p-3.5 rounded-lg border ${
            lowSuppliesCount > 0 
              ? "bg-amber-500/20 text-amber-400 border-amber-500/20" 
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}>
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue over Time Chart */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 shadow-md lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-900">
            <div>
              <h3 className="text-base font-semibold text-slate-200">Faturamento Mensal Consolidado</h3>
              <p className="text-xs text-slate-500">Evolução dos repasses de outsourcing de acordo com as leituras criadas</p>
            </div>
            <span className="text-xs bg-slate-900 text-cyan-400 px-2.5 py-1 rounded-full border border-slate-800 font-mono flex items-center gap-1.5">
              <TrendingUp size={14} /> Histórico
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {revenueChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                <FileText size={40} className="stroke-1 mb-2 opacity-50 text-slate-600" />
                Sem histórico de leituras disponível.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `R$${val}`} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                    formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#38bdf8" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Brand Distribution Chart */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-900">
            <div>
              <h3 className="text-base font-semibold text-slate-200">Inventário por Fabricante</h3>
              <p className="text-xs text-slate-500">Distribuição total das impressoras</p>
            </div>
          </div>

          <div className="h-56 w-full flex items-center justify-center relative">
            {brandChartData.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhuma cadastrada</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {brandChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                    formatter={(value) => [value, "Máquinas"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            <div className="absolute text-center">
              <span className="text-2xl font-bold text-white font-mono">{printers.filter(p => !p.isDeleted).length}</span>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Impressoras</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            {brandChartData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-slate-300">
                <span 
                  className="h-2 w-2 rounded-full shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></span>
                <span className="truncate">{item.name}:</span>
                <span className="font-semibold text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row: Printing Volumes and Safety Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Print Consumption */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-900">
            <div>
              <h3 className="text-base font-semibold text-slate-200">Volume de Impressão por Cliente</h3>
              <p className="text-xs text-slate-500">Total de páginas (Mono e Coloridas) consumidas</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {clientVolumeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Nenhum consumo registrado ainda. Insira leituras manuais.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientVolumeData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                  <YAxis dataKey="clientName" type="category" stroke="#94a3b8" fontSize={10} width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                  />
                  <Legend fontSize={10} />
                  <Bar dataKey="mono" name="Preto & Branco (Mono)" fill="#0284c7" stackId="a" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="color" name="Colorida" fill="#db2777" stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Safety Margin Alert Area (10% limit) */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-900">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-amber-500" size={18} />
              <div>
                <h3 className="text-base font-semibold text-slate-200">Gargalos & Margens de Segurança (10%)</h3>
                <p className="text-xs text-slate-500">Impressoras que atingiram o limite mínimo recomendado</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate("insumos")}
              className="text-xs text-cyan-400 hover:underline font-mono"
            >
              Ver Tudo
            </button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {criticalPrinters.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-12 text-sm text-center">
                <div className="p-3 bg-slate-900 rounded-full text-emerald-400 border border-slate-800 mb-2">
                  ✓
                </div>
                <p className="font-medium text-slate-300">Tudo sob controle!</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Nenhuma impressora ativa está operando dentro da margem crítica de 10% de toner/cilindro.
                </p>
              </div>
            ) : (
              criticalPrinters.map(({ printer, clientName, tonerPercent, drumPercent }) => {
                const tonerCritical = tonerPercent <= 10;
                const drumCritical = drumPercent <= 10 || !!printer.needsDrumReplacement;
                return (
                  <div key={printer.id} className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg hover:border-red-500/40 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight font-sans">
                          {printer.brand} {printer.model}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          S/N: <span className="font-mono text-slate-300">{printer.serialNumber}</span> • {clientName} ({printer.location})
                        </p>
                      </div>
                      <span className="text-[10px] bg-red-900/30 text-red-400 border border-red-500/30 px-2 py-0.5 rounded uppercase font-mono font-bold animate-pulse">
                        {printer.needsDrumReplacement ? "Cilindro ⚠️" : "Troca Urgente"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      {/* Toner alert */}
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-slate-400 text-[10px]">Toner Restante</span>
                          <span className={`font-mono font-semibold ${tonerCritical ? "text-red-400" : "text-slate-300"}`}>
                            {tonerPercent}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-850 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${tonerCritical ? "bg-red-500" : "bg-emerald-500"}`}
                            style={{ width: `${tonerPercent}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Cylinder alert */}
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-slate-400 text-[10px]">Cilindro Restante</span>
                          <span className={`font-mono font-semibold ${drumCritical ? "text-red-400" : "text-slate-300"}`}>
                            {printer.needsDrumReplacement ? "🚨 Requer Troca" : `${drumPercent}%`}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-850 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${drumCritical ? "bg-red-500" : "bg-indigo-500"}`}
                            style={{ width: `${printer.needsDrumReplacement ? 0 : drumPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-normal">
            💡 <span className="text-slate-300 font-semibold">Regra de Negócio:</span> A margem de segurança de 10% representa o limite onde os insumos já consumiram mais de 90% de sua vida útil estimada. Recomenda-se realizar a entrega de novos suprimentos preventivamente ao atingir este estágio.
          </div>
        </div>
      </div>
    </div>
  );
}
