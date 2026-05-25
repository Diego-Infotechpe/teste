import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Printer as PrinterIcon, 
  Layers, 
  Gauge, 
  Menu, 
  X, 
  ShieldAlert,
  Settings,
  HelpCircle,
  Clock,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// @ts-ignore
import logoImage from "./assets/images/infotech_logo_1779449843887.png";

import { Client, Printer, MeterReading, ReplacementLog, SupplyInventoryItem } from "./types";
import { 
  INITIAL_CLIENTS, 
  INITIAL_PRINTERS, 
  INITIAL_READINGS, 
  INITIAL_REPLACEMENTS,
  INITIAL_SUPPLIES_INVENTORY
} from "./data/mockData";

// Components
import Dashboard from "./components/Dashboard";
import ClientsTab from "./components/ClientsTab";
import PrintersTab from "./components/PrintersTab";
import SuppliesTab from "./components/SuppliesTab";
import ReadingsTab from "./components/ReadingsTab";
import ReportsTab from "./components/ReportsTab";

export default function App() {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core App states populated from LocalStorage or mock data
  const [clients, setClients] = useState<Client[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [replacementLogs, setReplacementLogs] = useState<ReplacementLog[]>([]);
  const [suppliesInventory, setSuppliesInventory] = useState<SupplyInventoryItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Double state initialization wrapper with local storage checks
  useEffect(() => {
    const savedClients = localStorage.getItem("infotech_clients");
    const savedPrinters = localStorage.getItem("infotech_printers");
    const savedReadings = localStorage.getItem("infotech_readings");
    const savedLogs = localStorage.getItem("infotech_logs");
    const savedSupplies = localStorage.getItem("infotech_supplies");

    if (savedClients) setClients(JSON.parse(savedClients));
    else setClients(INITIAL_CLIENTS);

    if (savedPrinters) setPrinters(JSON.parse(savedPrinters));
    else setPrinters(INITIAL_PRINTERS);

    if (savedReadings) setReadings(JSON.parse(savedReadings));
    else setReadings(INITIAL_READINGS);

    if (savedLogs) setReplacementLogs(JSON.parse(savedLogs));
    else setReplacementLogs(INITIAL_REPLACEMENTS);

    if (savedSupplies) setSuppliesInventory(JSON.parse(savedSupplies));
    else setSuppliesInventory(INITIAL_SUPPLIES_INVENTORY);

    setIsInitialized(true);
  }, []);

  // 2. Local storage persistence triggers on change (safe for empty arrays [])
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("infotech_clients", JSON.stringify(clients));
    }
  }, [clients, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("infotech_printers", JSON.stringify(printers));
    }
  }, [printers, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("infotech_readings", JSON.stringify(readings));
    }
  }, [readings, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("infotech_logs", JSON.stringify(replacementLogs));
    }
  }, [replacementLogs, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("infotech_supplies", JSON.stringify(suppliesInventory));
    }
  }, [suppliesInventory, isInitialized]);


  // 3. Mutation handlers: CLIENTS
  const handleAddClient = (newClientData: Omit<Client, "id" | "createdAt">) => {
    const newClient: Client = {
      ...newClientData,
      id: `cli_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setClients(prev => [newClient, ...prev]);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const handleDeleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    // Set associated printers back to stock
    setPrinters(prev => prev.map(p => p.clientId === id ? { ...p, clientId: "" } : p));
  };


  // 4. Mutation handlers: PRINTERS
  const handleAddPrinter = (newPrinterData: Omit<Printer, "id" | "createdAt" | "currentCounterMono" | "currentCounterColor">) => {
    const newPrinter: Printer = {
      ...newPrinterData,
      id: `pri_${Date.now()}`,
      currentCounterMono: newPrinterData.initialCounterMono,
      currentCounterColor: newPrinterData.initialCounterColor,
      createdAt: new Date().toISOString()
    };
    setPrinters(prev => [newPrinter, ...prev]);
  };

  const handleUpdatePrinter = (updatedPrinter: Printer) => {
    setPrinters(prev => prev.map(p => p.id === updatedPrinter.id ? updatedPrinter : p));
  };

  const handleDeletePrinter = (id: string) => {
    setPrinters(prev => prev.map(p => p.id === id ? { ...p, isDeleted: true } : p));
  };


  // 5. Mutation handlers: READINGS (MANUAL COUNTER FEEDING)
  const recalculateMonthlyFranchiseReadings = (
    allReadings: MeterReading[], 
    clientId: string, 
    month: string, 
    client: Client
  ): MeterReading[] => {
    const clientPrinterIds = new Set(printers.filter(p => p.clientId === clientId).map(p => p.id));
    const targetReadings = allReadings.filter(r => r.date === month && clientPrinterIds.has(r.printerId));
    if (targetReadings.length === 0) return allReadings;

    const F = client.pageAllowance || 0;
    const fixedRental = client.fixedRentalFee || 0;
    const isFranchiseApplied = F > 0;

    let updatedTargetReadings: MeterReading[] = [];

    if (isFranchiseApplied) {
      const totalMonoDiff = targetReadings.reduce((sum, r) => sum + r.monoConsumed, 0);
      const totalColorDiff = targetReadings.reduce((sum, r) => sum + r.colorConsumed, 0);
      const totalPrinted = totalMonoDiff + totalColorDiff;

      let totalClientBill = 0;
      if (totalPrinted <= F) {
        totalClientBill = fixedRental;
      } else {
        let exceededMono = 0;
        let exceededColor = 0;
        if (totalMonoDiff <= F) {
          const remainingF = F - totalMonoDiff;
          const colorCovered = Math.min(totalColorDiff, remainingF);
          exceededColor = totalColorDiff - colorCovered;
          exceededMono = 0;
        } else {
          exceededMono = totalMonoDiff - F;
          exceededColor = totalColorDiff;
        }
        const extraMonoCost = exceededMono * client.monoPricePerPage;
        const extraColorCost = exceededColor * client.colorPricePerPage;
        totalClientBill = fixedRental + extraMonoCost + extraColorCost;
      }

      const rawCosts = targetReadings.map(r => {
        const rawMono = r.monoConsumed * client.monoPricePerPage;
        const rawColor = r.colorConsumed * client.colorPricePerPage;
        return rawMono + rawColor;
      });
      const totalRawCost = rawCosts.reduce((sum, cost) => sum + cost, 0);

      updatedTargetReadings = targetReadings.map((r, idx) => {
        const rawCost = rawCosts[idx];
        let portionVal = 0;
        if (totalRawCost > 0) {
          portionVal = (rawCost / totalRawCost) * totalClientBill;
        } else {
          portionVal = totalClientBill / targetReadings.length;
        }
        return {
          ...r,
          amountCharged: parseFloat(portionVal.toFixed(2))
        };
      });
    } else {
      updatedTargetReadings = targetReadings.map(r => {
        const monoCost = r.monoConsumed * client.monoPricePerPage;
        const colorCost = r.colorConsumed * client.colorPricePerPage;
        return {
          ...r,
          amountCharged: parseFloat((monoCost + colorCost).toFixed(2))
        };
      });
    }

    return allReadings.map(r => {
      const found = updatedTargetReadings.find(ur => ur.id === r.id);
      return found ? found : r;
    });
  };

  const handleAddReading = (newReadingData: Omit<MeterReading, "id" | "recordedAt">) => {
    const newReading: MeterReading = {
      ...newReadingData,
      id: `read_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      recordedAt: new Date().toISOString()
    };

    const printer = printers.find(p => p.id === newReadingData.printerId);
    const client = printer ? clients.find(c => c.id === printer.clientId) : null;

    setReadings(prev => {
      let updated = [...prev, newReading];
      if (client) {
        updated = recalculateMonthlyFranchiseReadings(updated, client.id, newReadingData.date, client);
      }
      return updated;
    });

    // UPDATE corresponding printer's page counters & supply usage
    setPrinters(prevPrinters => prevPrinters.map(p => {
      if (p.id === newReadingData.printerId) {
        // Calculate newly printed pages
        const monoDiff = newReadingData.monoConsumed;
        const colorDiff = newReadingData.colorConsumed;
        const totalDiff = monoDiff + colorDiff;

        // update toner printed and drum printed pages
        return {
          ...p,
          currentCounterMono: newReadingData.monoCounter,
          currentCounterColor: newReadingData.colorCounter,
          tonerPrinted: p.tonerPrinted + totalDiff,
          drumPrinted: p.drumPrinted + totalDiff
        };
      }
      return p;
    }));
  };

  const handleUpdateReading = (updatedReading: MeterReading) => {
    const prevReading = readings.find(r => r.id === updatedReading.id);
    if (!prevReading) return;

    const printer = printers.find(p => p.id === updatedReading.printerId);
    const client = printer ? clients.find(c => c.id === printer.clientId) : null;

    setReadings(prev => {
      let updated = prev.map(r => r.id === updatedReading.id ? updatedReading : r);
      if (client) {
        updated = recalculateMonthlyFranchiseReadings(updated, client.id, updatedReading.date, client);
      }
      return updated;
    });

    // UPDATE corresponding printer's page counters & supply usage
    setPrinters(prevPrinters => prevPrinters.map(p => {
      if (p.id === updatedReading.printerId) {
        const monoDiffCorrection = updatedReading.monoConsumed - prevReading.monoConsumed;
        const colorDiffCorrection = updatedReading.colorConsumed - prevReading.colorConsumed;
        const totalDiffCorrection = monoDiffCorrection + colorDiffCorrection;

        return {
          ...p,
          currentCounterMono: updatedReading.monoCounter,
          currentCounterColor: updatedReading.colorCounter,
          tonerPrinted: Math.max(0, p.tonerPrinted + totalDiffCorrection),
          drumPrinted: Math.max(0, p.drumPrinted + totalDiffCorrection)
        };
      }
      return p;
    }));
  };


  // 6. Mutation handlers: SUPPLY REPLACEMENT RESET
  const handleReplaceSupply = (printerId: string, supplyType: "toner" | "drum", customAutonomy?: number, customDate?: string) => {
    const dateToday = customDate || new Date().toISOString().split("T")[0];
    
    setPrinters(prevPrinters => prevPrinters.map(p => {
      if (p.id === printerId) {
        // Look up details to archive in replacementLogs
        const client = clients.find(c => c.id === p.clientId);
        const resolvedAutonomy = customAutonomy !== undefined ? customAutonomy : (supplyType === "toner" ? p.tonerAutonomy : p.drumAutonomy);
        const logEntry: ReplacementLog = {
          id: `rep_${Date.now()}`,
          printerId: p.id,
          printerModel: p.model,
          printerSerial: p.serialNumber,
          clientName: client ? client.name : "Em Estoque",
          supplyType,
          autonomy: resolvedAutonomy,
          counterAtReplacement: p.currentCounterMono, // use master mono counter as print milestone
          date: dateToday
        };

        // Append to logs block
        setReplacementLogs(prev => [logEntry, ...prev]);

        // Reset the print counter since last change and assign updated autonomy nominal standard
        if (supplyType === "toner") {
          return {
            ...p,
            tonerPrinted: 0,
            tonerAutonomy: resolvedAutonomy,
            lastTonerReplacementDate: dateToday
          };
        } else {
          return {
            ...p,
            drumPrinted: 0,
            drumAutonomy: resolvedAutonomy,
            lastDrumReplacementDate: dateToday,
            needsDrumReplacement: false
          };
        }
      }
      return p;
    }));
  };

  // Warnings Count logic
  const lowSuppliesAlertCount = printers.filter(p => {
    if (p.clientId === "") return false;
    const tonerUsedPct = (p.tonerAutonomy - p.tonerPrinted) / p.tonerAutonomy * 100;
    const drumUsedPct = (p.drumAutonomy - p.drumPrinted) / p.drumAutonomy * 100;
    return tonerUsedPct <= 10 || drumUsedPct <= 10;
  }).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row antialiased">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 shrink-0 select-none flex flex-col justify-between">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-lg shadow-black/20 overflow-hidden shrink-0 border border-slate-700/50 p-0.5">
                <img 
                  src={logoImage} 
                  alt="InfotechPE Logo" 
                  className="h-full w-full object-contain rounded-full" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-white block">InfotechPE</span>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block font-mono">Outsourcing</span>
              </div>
            </div>

            {/* Mobile burger button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1 text-slate-400 hover:text-white md:hidden hover:bg-slate-850 rounded"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className={`p-4 space-y-1.5 md:block ${isMobileMenuOpen ? "block" : "hidden"}`}>
            {/* Dashboard link */}
            <button
              onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === "dashboard"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-850"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Painel de Controle</span>
            </button>

            {/* Clients link */}
            <button
              onClick={() => { setActiveTab("clientes"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === "clientes"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-850"
              }`}
            >
              <Users size={16} />
              <span>Clientes</span>
            </button>

            {/* Printers link */}
            <button
              onClick={() => { setActiveTab("impressoras"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === "impressoras"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-850"
              }`}
            >
              <PrinterIcon size={16} />
              <span>Printers (Equipamentos)</span>
            </button>

            {/* Supplies link */}
            <button
              onClick={() => { setActiveTab("insumos"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === "insumos"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-850"
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers size={16} />
                <span>Controle de Insumos</span>
              </div>
              {lowSuppliesAlertCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                  activeTab === "insumos" ? "bg-slate-950 text-amber-400" : "bg-amber-500/20 text-amber-400"
                }`}>
                  {lowSuppliesAlertCount}
                </span>
              )}
            </button>

            {/* Counter feeding readings link */}
            <button
              onClick={() => { setActiveTab("leituras"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === "leituras"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-850"
              }`}
            >
              <Gauge size={16} />
              <span>Leituras Mensais</span>
            </button>

            {/* Reports tab PDF link */}
            <button
              onClick={(): void => { setActiveTab("relatorios"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === "relatorios"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-850"
              }`}
            >
              <FileText size={16} />
              <span>Relatórios PDF</span>
            </button>
          </nav>
        </div>

        {/* Footer info box on desktop */}
        <div className="hidden md:block p-4 border-t border-slate-800 space-y-2 bg-slate-900/40">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Clock size={12} className="text-cyan-400" />
            <span>Ref: 21 de Maio, 2026</span>
          </div>
          <div className="text-[9px] text-slate-500 leading-normal">
            InfotechPE Outsourcing • Desenvolvido para controle de ativos e faturamento automatizado por páginas.
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 p-4 md:p-8 space-y-6 overflow-x-hidden md:overflow-y-auto md:max-h-screen">
        
        {/* Dynamic header route description block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-900/80 gap-2">
          <div>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold block">
              SISTEMA INTEGRADO DE INVENTÁRIO
            </span>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold font-sans tracking-tight text-white capitalize">
                {activeTab === "dashboard" && "Painel Gerencial"}
                {activeTab === "clientes" && "Portfólio de Clientes"}
                {activeTab === "impressoras" && "Inventário de Impressoras"}
                {activeTab === "insumos" && "Níveis de Cilindro & Toner"}
                {activeTab === "leituras" && "Gerador de Faturamento"}
                {activeTab === "relatorios" && "Emissor de Relatórios Consolidados"}
              </h2>
            </div>
          </div>
          
          <div className="text-xs bg-slate-900 border border-slate-850 text-slate-400 px-3 py-1.5 rounded-lg flex items-center gap-2 self-start font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Serviço Ativo: <b className="text-white">v2.1.0</b></span>
          </div>
        </div>

        {/* TAB ANNOTATED PANEL ROUTING WRAPPED IN TRANSITIONAL MOTION */}
        <div className="outline-none" id="main-content-flow-tab">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === "dashboard" && (
                <Dashboard 
                  clients={clients} 
                  printers={printers} 
                  readings={readings} 
                  onNavigate={(tab) => setActiveTab(tab)} 
                />
              )}

              {activeTab === "clientes" && (
                <ClientsTab
                  clients={clients}
                  printers={printers}
                  readings={readings}
                  onAddClient={handleAddClient}
                  onUpdateClient={handleUpdateClient}
                  onDeleteClient={handleDeleteClient}
                />
              )}

              {activeTab === "impressoras" && (
                <PrintersTab
                  printers={printers}
                  clients={clients}
                  readings={readings}
                  onAddPrinter={handleAddPrinter}
                  onUpdatePrinter={handleUpdatePrinter}
                  onDeletePrinter={handleDeletePrinter}
                  onAddReading={handleAddReading}
                />
              )}

              {activeTab === "insumos" && (
                <SuppliesTab
                  printers={printers}
                  clients={clients}
                  replacementLogs={replacementLogs}
                  suppliesInventory={suppliesInventory}
                  setSuppliesInventory={setSuppliesInventory}
                  onReplaceSupply={(printerId, supplyType, customAutonomy, customDate, selectedSupplyId) => {
                    handleReplaceSupply(printerId, supplyType, customAutonomy, customDate);
                    // Decrement stock in catalog if a supply item was selected
                    if (selectedSupplyId) {
                      setSuppliesInventory(prev => prev.map(s => 
                        s.id === selectedSupplyId ? { ...s, stock: Math.max(0, s.stock - 1) } : s
                      ));
                    }
                  }}
                />
              )}

              {activeTab === "leituras" && (
                <ReadingsTab
                  printers={printers}
                  clients={clients}
                  readings={readings}
                  onAddReading={handleAddReading}
                  onUpdateReading={handleUpdateReading}
                />
              )}

              {activeTab === "relatorios" && (
                <ReportsTab
                  printers={printers}
                  clients={clients}
                  readings={readings}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>
      
    </div>
  );
}
