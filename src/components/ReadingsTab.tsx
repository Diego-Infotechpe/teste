import React, { useState } from "react";
import { 
  FileText, 
  ChevronRight, 
  Calendar, 
  DollarSign, 
  Gauge, 
  CheckCircle, 
  AlertCircle, 
  Printer as PrinterIcon,
  Printer as PrintIcon,
  Bookmark,
  Sparkles,
  RefreshCw,
  Plus,
  Pencil,
  X,
  Lock,
  Edit2
} from "lucide-react";
import { Printer, Client, MeterReading } from "../types";
import { formatCurrency, formatNumber, formatDate } from "../utils";

interface ReadingsTabProps {
  printers: Printer[];
  clients: Client[];
  readings: MeterReading[];
  onAddReading: (reading: Omit<MeterReading, "id" | "recordedAt">) => void;
  onUpdateReading: (updatedReading: MeterReading) => void;
}

export default function ReadingsTab({ 
  printers, 
  clients, 
  readings, 
  onAddReading,
  onUpdateReading
}: ReadingsTabProps) {
  // Selection state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [readingMonth, setReadingMonth] = useState<string>("2026-05"); // Default to workspace timestamp month

  // Scratch values for interactive inputs (printerId -> value typing)
  const [monoInputs, setMonoInputs] = useState<{ [printerId: string]: string }>({});
  const [colorInputs, setColorInputs] = useState<{ [printerId: string]: string }>({});

  // IDs of printers currently in active "Edit Mode"
  const [editingPrinterIds, setEditingPrinterIds] = useState<string[]>([]);

  // Validation feedback state
  const [formError, setFormError] = useState<string | null>(null);

  // Active client setup
  const activeClient = clients.find(c => c.id === selectedClientId) || null;
  
  // Active associated client machines currently rented
  const clientPrinters = printers.filter(p => !p.isDeleted && p.clientId === selectedClientId && p.status === "active");

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setMonoInputs({});
    setColorInputs({});
    setEditingPrinterIds([]);
    setFormError(null);
  };

  // Safe previous counter retrieval PRIOR to the target competencies date
  const getPreviousCounterPriorToDate = (printer: Printer, targetDate: string) => {
    const priorReadings = readings
      .filter(r => r.printerId === printer.id && r.date < targetDate)
      .sort((a, b) => b.date.localeCompare(a.date)); // descending date
    
    if (priorReadings.length > 0) {
      return {
        mono: priorReadings[0].monoCounter,
        color: printer.type === "color" ? priorReadings[0].colorCounter : 0
      };
    }

    // Default back to initial numbers from registration day
    return {
      mono: printer.initialCounterMono,
      color: printer.type === "color" ? printer.initialCounterColor : 0
    };
  };

  const handleMonoInputChange = (printerId: string, val: string) => {
    setMonoInputs(prev => ({ ...prev, [printerId]: val }));
    setFormError(null);
  };

  const handleColorInputChange = (printerId: string, val: string) => {
    setColorInputs(prev => ({ ...prev, [printerId]: val }));
    setFormError(null);
  };

  const handleCancelEditing = (printerId: string) => {
    setEditingPrinterIds(prev => prev.filter(id => id !== printerId));
    // Revert scratch typing entries
    const updatedMono = { ...monoInputs };
    const updatedColor = { ...colorInputs };
    delete updatedMono[printerId];
    delete updatedColor[printerId];
    setMonoInputs(updatedMono);
    setColorInputs(updatedColor);
    setFormError(null);
  };

  const handleStartEditing = (printerId: string, existing: MeterReading) => {
    setEditingPrinterIds(prev => [...prev, printerId]);
    // Pre-fill active scratch values with saved figures
    setMonoInputs(prev => ({ ...prev, [printerId]: existing.monoCounter.toString() }));
    if (printerId) {
      setColorInputs(prev => ({ ...prev, [printerId]: existing.colorCounter.toString() }));
    }
  };

  // Pre-fill simulation data (for pending machines only)
  const handlePresetAllSame = () => {
    if (!activeClient) return;
    const monoMap: typeof monoInputs = {};
    const colorMap: typeof colorInputs = {};

    clientPrinters.forEach(p => {
      const existing = readings.find(r => r.printerId === p.id && r.date === readingMonth);
      if (!existing) {
        const prev = getPreviousCounterPriorToDate(p, readingMonth);
        monoMap[p.id] = (prev.mono + 450).toString();
        if (p.type === "color") {
          colorMap[p.id] = (prev.color + 200).toString();
        }
      }
    });

    setMonoInputs(prev => ({ ...prev, ...monoMap }));
    setColorInputs(prev => ({ ...prev, ...colorMap }));
  };

  // Standalone individual printer counter submission
  const handleSavePrinterReading = (printer: Printer) => {
    if (!activeClient) return;

    const existingReading = readings.find(r => r.printerId === printer.id && r.date === readingMonth);
    const prevMilestone = getPreviousCounterPriorToDate(printer, readingMonth);

    const inputMonoStr = monoInputs[printer.id] !== undefined 
      ? monoInputs[printer.id] 
      : (existingReading ? existingReading.monoCounter.toString() : "");

    const inputColorStr = colorInputs[printer.id] !== undefined 
      ? colorInputs[printer.id] 
      : (existingReading ? existingReading.colorCounter.toString() : "");

    if (!inputMonoStr) {
      setFormError(`Por favor insira o novo contador P&B para o equipamento ${printer.model} (${printer.serialNumber})`);
      return;
    }

    const nextMono = parseInt(inputMonoStr, 10);
    if (isNaN(nextMono) || nextMono < prevMilestone.mono) {
      setFormError(`O contador P&B para ${printer.model} (${printer.serialNumber}) não pode ser menor que o anterior (${prevMilestone.mono}).`);
      return;
    }

    let nextColor = 0;
    if (printer.type === "color") {
      if (!inputColorStr) {
        setFormError(`Por favor insira o novo contador Colorido para o equipamento S/N: ${printer.serialNumber}`);
        return;
      }
      nextColor = parseInt(inputColorStr, 10);
      if (isNaN(nextColor) || nextColor < prevMilestone.color) {
        setFormError(`O contador Colorido para ${printer.model} e S/N ${printer.serialNumber} não pode ser menor que o anterior (${prevMilestone.color}).`);
        return;
      }
    }

    const monoConsumed = nextMono - prevMilestone.mono;
    const colorConsumed = nextColor - prevMilestone.color;

    // Fallback amount (gets instantly balanced by the App core state handler anyway)
    const rawMonoCost = monoConsumed * activeClient.monoPricePerPage;
    const rawColorCost = colorConsumed * activeClient.colorPricePerPage;
    const fallbackAmount = rawMonoCost + rawColorCost;

    if (existingReading) {
      // Correcting/Updating an existing reading
      onUpdateReading({
        ...existingReading,
        monoCounter: nextMono,
        colorCounter: nextColor,
        monoConsumed,
        colorConsumed,
        amountCharged: fallbackAmount
      });
      // Remove from active editing mode
      setEditingPrinterIds(prev => prev.filter(id => id !== printer.id));
    } else {
      // Recording standard new readings manually
      onAddReading({
        printerId: printer.id,
        date: readingMonth,
        monoCounter: nextMono,
        colorCounter: nextColor,
        monoConsumed,
        colorConsumed,
        amountCharged: fallbackAmount
      });
    }

    // Clear typing cache
    setFormError(null);
    const updatedMono = { ...monoInputs };
    const updatedColor = { ...colorInputs };
    delete updatedMono[printer.id];
    delete updatedColor[printer.id];
    setMonoInputs(updatedMono);
    setColorInputs(updatedColor);
  };

  // --- Real-Time Franchise Live Summary Calculation logic ---
  const F = activeClient?.pageAllowance || 0;
  const fixedRental = activeClient?.fixedRentalFee || 0;
  const isFranchiseApplied = F > 0;

  // Gather current months readings recorded for this client's active printers
  const clientPrinterIds = new Set(clientPrinters.map(p => p.id));
  const currentMonthReadings = readings.filter(r => r.date === readingMonth && clientPrinterIds.has(r.printerId));

  // Compute calculated values
  const totalMonoPrinted = currentMonthReadings.reduce((sum, r) => sum + r.monoConsumed, 0);
  const totalColorPrinted = currentMonthReadings.reduce((sum, r) => sum + r.colorConsumed, 0);
  const totalPrinted = totalMonoPrinted + totalColorPrinted;

  let totalClientBill = 0;
  let exceededPageCount = 0;
  let excessChargedAmount = 0;
  let exceededMono = 0;
  let exceededColor = 0;

  if (currentMonthReadings.length > 0) {
    if (isFranchiseApplied) {
      if (totalPrinted <= F) {
        totalClientBill = fixedRental;
        exceededPageCount = 0;
        excessChargedAmount = 0;
      } else {
        exceededPageCount = totalPrinted - F;
        if (totalMonoPrinted <= F) {
          const remainingF = F - totalMonoPrinted;
          const colorCovered = Math.min(totalColorPrinted, remainingF);
          exceededColor = totalColorPrinted - colorCovered;
          exceededMono = 0;
        } else {
          exceededMono = totalMonoPrinted - F;
          exceededColor = totalColorPrinted;
        }
        const extraMonoCost = exceededMono * (activeClient?.monoPricePerPage || 0);
        const extraColorCost = exceededColor * (activeClient?.colorPricePerPage || 0);
        excessChargedAmount = extraMonoCost + extraColorCost;
        totalClientBill = fixedRental + excessChargedAmount;
      }
    } else {
      // Simple raw rate page count calculation
      const monoCost = totalMonoPrinted * (activeClient?.monoPricePerPage || 0);
      const colorCost = totalColorPrinted * (activeClient?.colorPricePerPage || 0);
      totalClientBill = monoCost + colorCost;
      excessChargedAmount = totalClientBill;
      exceededPageCount = totalPrinted;
      exceededMono = totalMonoPrinted;
      exceededColor = totalColorPrinted;
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: SELECT CLIENT & FILL PRINTER READINGS INDIVIDUALLY */}
      <div className="lg:col-span-2 space-y-4">
        
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-900 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-900 border border-slate-800 rounded-md text-cyan-400">
                <Gauge size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wide">
                  Leituras Individuais das Impressoras
                </h3>
                <p className="text-xs text-slate-500">Registre ou edite cada contagem separadamente para o mês selecionado</p>
              </div>
            </div>
            {activeClient && clientPrinters.length > 0 && (
              <button
                type="button"
                onClick={handlePresetAllSame}
                className="text-[10px] bg-slate-900 hover:bg-slate-850 text-slate-400 px-2 py-1 rounded border border-slate-800 transition-colors flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Sparkles size={11} className="text-cyan-400" /> Autofill Pendentes (+450 pág)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pick Client Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">🏢 Selecione o Cliente Contratante</label>
              <select
                className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                id="reading-client-select"
              >
                <option value="">-- Escolher Cliente --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Billing Reference Month Slider */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">🗓️ Mês de Referência da Cobrança</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Calendar size={14} />
                </span>
                <input
                  type="month"
                  className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                  value={readingMonth}
                  onChange={(e) => setReadingMonth(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Form Content list of client printers */}
          {selectedClientId ? (
            clientPrinters.length === 0 ? (
              <div className="p-8 bg-slate-900/40 text-center rounded-lg border border-slate-900 text-slate-500 text-xs">
                <AlertCircle className="mx-auto mb-2 text-amber-500 stroke-1" size={32} />
                Nenhum equipamento <b>Alugado Ativo</b> localizado para este cliente. <br />
                Vincule uma impressora na tela de "Impressoras" marcando este cliente.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="space-y-3">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block font-mono">
                    Equipamentos Vinculados:
                  </span>

                  {clientPrinters.map(printer => {
                    const existingReading = readings.find(r => r.printerId === printer.id && r.date === readingMonth);
                    const isEditing = editingPrinterIds.includes(printer.id);
                    const isLocked = !!existingReading && !isEditing;

                    const prevMilestone = getPreviousCounterPriorToDate(printer, readingMonth);

                    const currentMono = monoInputs[printer.id] !== undefined 
                      ? monoInputs[printer.id] 
                      : (existingReading ? existingReading.monoCounter.toString() : "");

                    const currentColor = colorInputs[printer.id] !== undefined 
                      ? colorInputs[printer.id] 
                      : (existingReading ? existingReading.colorCounter.toString() : "");

                    const typedMonoVal = parseInt(currentMono, 10) || 0;
                    const typedColorVal = parseInt(currentColor, 10) || 0;

                    const monoDiff = isLocked 
                      ? existingReading.monoConsumed 
                      : Math.max(0, typedMonoVal - prevMilestone.mono);

                    const colorDiff = isLocked 
                      ? existingReading.colorConsumed 
                      : Math.max(0, typedColorVal - prevMilestone.color);

                    const monoCost = monoDiff * (activeClient?.monoPricePerPage || 0);
                    const colorCost = colorDiff * (activeClient?.colorPricePerPage || 0);
                    
                    // Show exact saved billing portion if locked, else estimate 
                    const subtotal = isLocked ? existingReading.amountCharged : (monoCost + colorCost);

                    return (
                      <div 
                        key={printer.id} 
                        className={`p-4 rounded-xl border transition-all grid grid-cols-1 md:grid-cols-12 gap-4 items-center ${
                          isLocked 
                            ? "bg-emerald-950/10 border-emerald-900/30" 
                            : isEditing 
                              ? "bg-amber-950/15 border-amber-500/30 shadow-md"
                              : "bg-slate-900/60 border-slate-850"
                        }`}
                      >
                        {/* Printer specs */}
                        <div className="md:col-span-4 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`h-2 w-2 rounded-full ${isLocked ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"}`}></span>
                            <span className="font-bold text-slate-200 text-xs">{printer.brand} {printer.model}</span>
                            {isLocked && (
                              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-1 rounded font-bold uppercase tracking-wider">
                                Lançado
                              </span>
                            )}
                            {isEditing && (
                              <span className="text-[9px] font-mono text-amber-400 bg-amber-950/40 px-1 rounded font-bold uppercase tracking-wider animate-pulse">
                                Editando
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[10px] text-slate-400">
                            S/N: <span className="font-mono text-slate-300">{printer.serialNumber}</span> • {printer.location}
                          </p>
                          <div className="flex gap-2 text-[9px] pt-1 font-mono">
                            <span className="text-slate-500">Tarifas:</span>
                            <span className="text-cyan-400 font-semibold">P&B R${activeClient?.monoPricePerPage}</span>
                            {printer.type === "color" && (
                              <span className="text-pink-400 font-semibold">Col R${activeClient?.colorPricePerPage}</span>
                            )}
                          </div>
                        </div>

                        {/* Mono Counter Field */}
                        <div className="md:col-span-3 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>Anterior: <b>{formatNumber(prevMilestone.mono)}</b></span>
                            {monoDiff > 0 && <span className="text-emerald-400 font-bold">+{formatNumber(monoDiff)}</span>}
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              disabled={isLocked}
                              placeholder="Novo P&B"
                              min={prevMilestone.mono}
                              className="w-full bg-slate-950 text-white text-xs border border-slate-800 disabled:border-slate-900 rounded p-2 focus:outline-none focus:border-cyan-500 font-mono text-center disabled:opacity-70 disabled:text-slate-400"
                              value={currentMono}
                              onChange={(e) => handleMonoInputChange(printer.id, e.target.value)}
                            />
                            {isLocked && (
                              <span className="absolute inset-y-0 right-2.5 flex items-center text-slate-500">
                                <Lock size={12} />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Color Counter Field */}
                        <div className="md:col-span-3 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-450 font-mono">
                            <span>Anterior Color: <b>{formatNumber(prevMilestone.color)}</b></span>
                            {colorDiff > 0 && <span className="text-emerald-400 font-bold">+{formatNumber(colorDiff)}</span>}
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              disabled={printer.type !== "color" || isLocked}
                              placeholder={printer.type === "color" ? "Novo Color" : "Desativado"}
                              min={prevMilestone.color}
                              className="w-full bg-slate-950 text-white text-xs border border-slate-800 disabled:border-slate-900 rounded p-2 focus:outline-none focus:border-cyan-500 font-mono text-center disabled:opacity-30 disabled:cursor-not-allowed"
                              value={printer.type === "color" ? currentColor : "0"}
                              onChange={(e) => handleColorInputChange(printer.id, e.target.value)}
                            />
                            {isLocked && (
                              <span className="absolute inset-y-0 right-2.5 flex items-center text-slate-500">
                                <Lock size={12} />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons & subtotal cost section */}
                        <div className="md:col-span-2 text-right flex flex-col justify-between h-full space-y-1.5 pt-1.5 md:pt-0">
                          <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-mono tracking-wider">Porção Faturada</span>
                            <span className="font-mono text-xs font-bold text-emerald-400">{formatCurrency(subtotal)}</span>
                          </div>

                          <div className="flex gap-1 justify-end pt-1">
                            {isLocked ? (
                              <button
                                type="button"
                                onClick={() => handleStartEditing(printer.id, existingReading)}
                                className="text-[10px] bg-amber-950/30 hover:bg-amber-900/30 text-amber-400 border border-amber-900/40 py-1 px-2 rounded flex items-center gap-1 transition-colors cursor-pointer w-full justify-center font-bold"
                                title="Corrigir leitura incorreta lançada este mês"
                              >
                                <Pencil size={11} /> Corrigir
                              </button>
                            ) : (
                              <>
                                {isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelEditing(printer.id)}
                                    className="text-[10px] bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 py-1 px-1.5 rounded transition-colors cursor-pointer flex items-center"
                                    title="Cancelar edição"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSavePrinterReading(printer)}
                                  className="text-[10px] bg-cyan-500 hover:bg-cyan-600 font-bold text-slate-950 py-1 px-2.5 rounded transition-colors cursor-pointer flex-1 text-center"
                                >
                                  {isEditing ? "Corrigir" : "Gravar"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Info Disclaimer on Franchise limits */}
                {activeClient && activeClient.pageAllowance && activeClient.pageAllowance > 0 ? (
                  <div className="bg-slate-900/50 border border-slate-850 p-3.5 rounded-xl space-y-2 text-xs">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
                      📊 Franquia Geral de Páginas Ativa
                    </div>
                    <p className="text-[11px] text-slate-400">
                      O contratante possui franquia conjunta de <b>{formatNumber(activeClient.pageAllowance)} páginas inclusas</b> pela mensalidade contratual fixa de <b className="text-emerald-400">{formatCurrency(activeClient.fixedRentalFee || 0)}</b>. O consumo medido em cada impressora acima é somado e o excedente é faturado ao final do mês.
                    </p>
                  </div>
                ) : null}

                {formError && (
                  <div className="bg-red-950/40 border border-red-500/20 text-red-300 p-3 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle size={14} /> <span>{formError}</span>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="py-20 text-center text-slate-600 text-xs">
              <PrinterIcon size={44} className="mx-auto mb-2 opacity-30 text-slate-500" />
              Selecione o cliente de outsourcing e competencies acima para cadastrar as leituras físicas.
            </div>
          )}
        </div>

        {/* LOG OF RECENTLY SUBMITTED READINGS */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-900 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Histórico Recente de Leituras Gravadas
          </h4>

          {readings.length === 0 ? (
            <p className="text-xs text-slate-605 italic text-center py-5">Nenhuma leitura cadastrada ainda no sistema.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {readings.slice(-6).reverse().map(r => {
                const printer = printers.find(p => p.id === r.printerId);
                const client = printer ? clients.find(c => c.id === printer.clientId) : null;
                return (
                  <div key={r.id} className="p-2.5 bg-slate-900 border border-slate-850/60 rounded-lg flex items-center justify-between text-xs">
                    <div className="max-w-[70%]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono bg-slate-950 text-slate-400 px-1 py-0.5 rounded text-[9px] font-bold">{formatDate(r.date)}</span>
                        <span className="text-[11px] text-slate-200 font-bold truncate">
                          {client ? client.name.split("-")[0] : "Estoque"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1 truncate">
                        {printer ? `${printer.brand} ${printer.model}` : "Equipamento Removido"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-emerald-400 font-bold text-[11px] block">{formatCurrency(r.amountCharged)}</span>
                      <span className="text-[8.5px] text-slate-500 font-mono block">
                        PB: +{formatNumber(r.monoConsumed)} {r.colorConsumed > 0 && `| C: +${formatNumber(r.colorConsumed)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: REAL TIME MONTHLY ADVANCED INVOICE DEMONSTRATIVE */}
      <div className="lg:col-span-1">
        
        {activeClient ? (
          <div className="bg-slate-950 rounded-xl border border-slate-900 p-5 space-y-4 relative overflow-hidden shadow-xl" id="invoice-receipt-panel">
            <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none transform rotate-12">
              <PrintIcon size={120} className="text-cyan-400" />
            </div>

            <div className="text-center pb-4 border-b border-dashed border-slate-850">
              <span className="text-[9px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/30 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                Resumo de Faturamento Mensal
              </span>
              <h3 className="text-sm font-black text-white mt-1.5">{activeClient.name}</h3>
              <p className="text-[10px] text-slate-500">Mês de Referência: <b className="text-cyan-400 font-mono">{formatDate(readingMonth)}</b></p>
            </div>

            {/* Receipt Summary */}
            <div className="space-y-3.5 text-xs">
              
              {/* Target Readings List */}
              <div className="space-y-2">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold font-mono block">Consumo por Equipamento:</span>
                
                {clientPrinters.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">Nenhum equipamento vinculado.</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {clientPrinters.map(p => {
                      const rd = currentMonthReadings.find(r => r.printerId === p.id);
                      return (
                        <div key={p.id} className="p-2.5 bg-slate-900 border border-slate-850 rounded space-y-1">
                          <div className="flex justify-between font-semibold text-[10.5px]">
                            <span className="text-slate-200 truncate max-w-[130px]">{p.brand} {p.model}</span>
                            <span className={`font-mono ${rd ? "text-emerald-400" : "text-amber-500/80 font-normal italic text-[10px]"}`}>
                              {rd ? formatCurrency(rd.amountCharged) : "Pendente ⏳"}
                            </span>
                          </div>
                          
                          <div className="text-[9.5px] text-slate-500 flex justify-between font-mono bg-slate-950/40 px-1.5 py-1 rounded">
                            <span>S/N: {p.serialNumber}</span>
                            <span>
                              {rd 
                                ? `PB: +${formatNumber(rd.monoConsumed)}${rd.colorConsumed > 0 ? ` | Col: +${formatNumber(rd.colorConsumed)}` : ""}`
                                : "Aguardando contagem"
                              }
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Franchise Calculation Details (If applicable) */}
              {isFranchiseApplied ? (
                <div className="bg-slate-900/90 border border-slate-850 p-3 rounded-lg space-y-2 text-[11px]">
                  <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider font-mono block">📑 Memória de Cálculo de Franquia:</span>
                  <div className="space-y-1 font-mono text-slate-400 border-t border-slate-850/60 pt-1.5">
                    <div className="flex justify-between">
                      <span>Total de Páginas Medidas:</span>
                      <span className="text-slate-200 font-bold">{formatNumber(totalPrinted)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Franquia Conjunta Inclusa:</span>
                      <span className="text-slate-200 font-bold">{formatNumber(F)} págs</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-850/40 pt-1">
                      <span>Páginas Excedentes:</span>
                      <span className={exceededPageCount > 0 ? "text-amber-400 font-bold" : "text-emerald-400"}>
                        {exceededPageCount > 0 ? `+${formatNumber(exceededPageCount)}` : "0 (Dentro)"}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-850/40">
                      <span>Mensalidade Fixa (Mínimo):</span>
                      <span className="text-slate-100 font-semibold">{formatCurrency(fixedRental)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adicional de Excesso:</span>
                      <span className={excessChargedAmount > 0 ? "text-amber-400 font-bold" : "text-slate-500"}>
                        {formatCurrency(excessChargedAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/90 border border-slate-850 p-2 text-center rounded text-[10.5px] text-slate-400 font-sans">
                  📑 Tarifa simples por página consumida (sem franquia fixa)
                </div>
              )}

              {/* Total Billing */}
              <div className="bg-cyan-950/30 border border-cyan-500/20 p-4 rounded-xl space-y-1 text-center font-sans">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">Total Medido no Mês</span>
                <span className="text-2xl font-black text-cyan-400 font-mono leading-none block">
                  {formatCurrency(currentMonthReadings.length === 0 ? 0 : totalClientBill)}
                </span>
                <span className="text-[9px] text-slate-500 block leading-normal mt-1">
                  {currentMonthReadings.length === 0 
                    ? "Registre ao menos 1 leitura para estimar faturamento."
                    : `${currentMonthReadings.length} de ${clientPrinters.length} impressoras cadastradas.`
                  }
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={currentMonthReadings.length === 0}
                onClick={() => {
                  window.print();
                }}
                className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-850 text-xs text-white font-bold py-2.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <PrintIcon size={12} /> Imprimir Recibo
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950 rounded-xl border border-dashed border-slate-900 p-8 text-center text-slate-500 flex flex-col justify-center items-center py-16 h-full space-y-3">
            <div className="p-3 bg-slate-900 rounded-full border border-slate-800 text-slate-400">
              <FileText size={24} />
            </div>
            <div>
              <h5 className="font-bold text-slate-300 text-xs uppercase font-mono tracking-wide">Recibo de Outsourcing</h5>
              <p className="text-[11px] text-slate-550 max-w-xs mt-1 leading-normal">
                Ao selecionar o cliente de outsourcing e competencies, um demonstrativo e cálculo de faturamento será gerado em tempo real nesta área.
              </p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
