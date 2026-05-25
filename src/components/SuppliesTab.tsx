import React, { useState } from "react";
import { 
  RefreshCw, 
  Search, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  History, 
  Printer as PrinterIcon,
  HelpCircle,
  Clock,
  Briefcase,
  Plus,
  Trash2,
  Package,
  Minus
} from "lucide-react";
import { Printer, Client, ReplacementLog, SupplyInventoryItem } from "../types";
import { formatNumber, formatDate, calculateSupplyStatus } from "../utils";

interface SuppliesTabProps {
  printers: Printer[];
  clients: Client[];
  replacementLogs: ReplacementLog[];
  suppliesInventory: SupplyInventoryItem[];
  setSuppliesInventory: React.Dispatch<React.SetStateAction<SupplyInventoryItem[]>>;
  onReplaceSupply: (
    printerId: string, 
    supplyType: "toner" | "drum", 
    customAutonomy?: number, 
    customDate?: string,
    selectedSupplyId?: string
  ) => void;
}

export default function SuppliesTab({ 
  printers, 
  clients, 
  replacementLogs, 
  suppliesInventory,
  setSuppliesInventory,
  onReplaceSupply 
}: SuppliesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false);

  // Replacement Register Form State
  const [replacementForm, setReplacementForm] = useState<{
    printerId: string;
    supplyType: "toner" | "drum";
    model: string;
    serial: string;
    defaultAutonomy: number;
    customAutonomy: string;
    date: string;
    selectedSupplyId?: string;
  } | null>(null);

  // Insumos Inventory register form state
  const [insumoType, setInsumoType] = useState<"toner" | "drum">("toner");
  const [insumoBrand, setInsumoBrand] = useState("");
  const [insumoModel, setInsumoModel] = useState("");
  const [insumoAutonomy, setInsumoAutonomy] = useState("10000");
  const [insumoStock, setInsumoStock] = useState("5");


  // Helpers for Insumo stock registry
  const handleAddInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumoBrand.trim() || !insumoModel.trim()) return;
    const newItem: SupplyInventoryItem = {
      id: `sup_${Date.now()}`,
      type: insumoType,
      brand: insumoBrand.trim(),
      model: insumoModel.trim(),
      autonomy: parseInt(insumoAutonomy, 10) || 5000,
      stock: parseInt(insumoStock, 10) || 0,
      createdAt: new Date().toISOString()
    };
    setSuppliesInventory(prev => [newItem, ...prev]);
    
    // reset form fields
    setInsumoBrand("");
    setInsumoModel("");
    setInsumoAutonomy("10000");
    setInsumoStock("5");
  };

  const handleUpdateStockQuantity = (id: string, delta: number) => {
    setSuppliesInventory(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, stock: Math.max(0, s.stock + delta) };
      }
      return s;
    }));
  };

  const handleDeleteInsumoFromCatalog = (id: string) => {
    setSuppliesInventory(prev => prev.filter(s => s.id !== id));
  };

  // Filter printers
  const activePrinters = printers.filter(p => !p.isDeleted && p.clientId !== "");

  const filteredPrinters = activePrinters.filter(p => {
    const client = clients.find(c => c.id === p.clientId);
    const clientName = client ? client.name.toLowerCase() : "";
    const matchesSearch = 
      p.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.includes(searchTerm.toLowerCase());

    const tonerStatus = calculateSupplyStatus(p.tonerAutonomy, p.tonerPrinted);
    const drumStatus = calculateSupplyStatus(p.drumAutonomy, p.drumPrinted);
    const hasAlert = tonerStatus.isWithinSafetyMargin || drumStatus.isWithinSafetyMargin;

    if (showOnlyAlerts) {
      return matchesSearch && hasAlert;
    }
    return matchesSearch;
  });

  const handleReplacement = (printerId: string, supplyType: "toner" | "drum", printerItem: Printer) => {
    const defaultAutonomy = supplyType === "toner" ? printerItem.tonerAutonomy : printerItem.drumAutonomy;
    setReplacementForm({
      printerId,
      supplyType,
      model: printerItem.model,
      serial: printerItem.serialNumber,
      defaultAutonomy,
      customAutonomy: defaultAutonomy.toString(),
      date: new Date().toISOString().split("T")[0],
      selectedSupplyId: ""
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Informative Banner about Safety Margin */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="md:col-span-3 space-y-1">
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs font-sans">
            <ShieldAlert size={16} />
            <span>Regra de Margem de Segurança de 10% Integrada</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            O sistema monitora o consumo dos fotocondutores (Cilindros) e cartuchos de pó (Toner). Ao restante de 10% da autonomia total nominal, o dispositivo entra na **Margem de Segurança Crítica** (representada abaixo em laranja/vermelho), notificando que suprimentos adicionais de reposição devem ser despachados ao local do cliente preventivamente.
          </p>
        </div>
        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center space-y-0.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Trocas Registradas</span>
          <span className="text-xl font-mono font-bold text-cyan-400">{replacementLogs.length} trocas</span>
        </div>
      </div>

      {/* SEÇÃO: CONTROLE E CADASTRO DE ESTOQUE DE INSUMOS */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-900 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-900 justify-between">
          <div className="flex items-center gap-2">
            <Package className="text-cyan-400" size={18} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Gestão e Cadastro de Estoque de Insumos
            </h3>
          </div>
          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
            {suppliesInventory.length} itens cadastrados
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA 1: FORMULÁRIO DE CADASTRO */}
          <form onSubmit={handleAddInsumo} className="bg-slate-900/40 p-4 rounded-xl border border-slate-900 space-y-3">
            <h4 className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
              Cadastrar Novo Insumo
            </h4>

            {/* Insumo Type Toggle */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 block">Tipo do Insumo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInsumoType("toner")}
                  className={`text-xs py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                    insumoType === "toner"
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  🧪 Toner
                </button>
                <button
                  type="button"
                  onClick={() => setInsumoType("drum")}
                  className={`text-xs py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                    insumoType === "drum"
                      ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  ⚡ Cilindro
                </button>
              </div>
            </div>

            {/* Brand and Model Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 block">Marca *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Brother, HP"
                  className="w-full bg-slate-950 text-slate-205 placeholder-slate-600 text-xs rounded-lg px-2.5 py-1.5 border border-slate-800 focus:outline-none focus:border-cyan-500"
                  value={insumoBrand}
                  onChange={(e) => setInsumoBrand(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 block">Modelo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TN-3472"
                  className="w-full bg-slate-950 text-slate-205 placeholder-slate-600 text-xs rounded-lg px-2.5 py-1.5 border border-slate-800 focus:outline-none focus:border-cyan-500"
                  value={insumoModel}
                  onChange={(e) => setInsumoModel(e.target.value)}
                />
              </div>
            </div>

            {/* Autonomy and Stock Qty Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 block">Autonomia (pág) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full bg-slate-950 text-slate-205 text-xs rounded-lg px-2.5 py-1.5 border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                  value={insumoAutonomy}
                  onChange={(e) => setInsumoAutonomy(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 block">Qtd em Estoque</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="w-full bg-slate-950 text-slate-250 text-xs rounded-lg px-2.5 py-1.5 border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                  value={insumoStock}
                  onChange={(e) => setInsumoStock(e.target.value)}
                />
              </div>
            </div>

            {/* CTA */}
            <button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-2 rounded-lg text-xs mt-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus size={14} />
              Adicionar ao Estoque
            </button>
          </form>

          {/* COLUNA 2 & 3: HISTÓRICO / ESTOQUE ATUAL DE INSUMOS */}
          <div className="lg:col-span-2 bg-slate-900/20 p-4 rounded-xl border border-slate-900 flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">
                Itens Ativos no Estoque de Reserva
              </h4>

              {suppliesInventory.length === 0 ? (
                <div className="py-12 text-center text-slate-600 text-xs italic">
                  Nenhum insumo de reposição cadastrado no estoque físico.<br />
                  Utilize o formulário ao lado para cadastrar marcas, modelos e autonomias nominais.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                  {suppliesInventory.map(item => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-900/80 rounded-lg border border-slate-850 flex flex-col justify-between space-y-2 transition-all hover:border-slate-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold py-0.5 px-1.5 rounded uppercase tracking-wider font-mono border inline-block mb-1">
                            {item.type === "toner" ? (
                              <span className="text-cyan-400 border-cyan-950 bg-cyan-950/40">🧪 Toner</span>
                            ) : (
                              <span className="text-indigo-400 border-indigo-950 bg-indigo-950/40">⚡ Cilindro</span>
                            )}
                          </span>
                          <h5 className="text-xs font-bold text-white block truncate max-w-[160px]">
                            {item.brand} {item.model}
                          </h5>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            Autonomia: <strong className="text-slate-400">{formatNumber(item.autonomy)} pág.</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteInsumoFromCatalog(item.id)}
                          className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-all cursor-pointer"
                          title="Excluir do Catálogo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Stock Adjuster Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                        <span className="text-slate-400">Qtd em Estoque:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateStockQuantity(item.id, -1)}
                            className="h-5 w-5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Minus size={10} />
                          </button>
                          <span className={`font-mono font-bold w-6 text-center ${
                            item.stock === 0 ? "text-red-400 animate-pulse" : item.stock <= 2 ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {item.stock}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateStockQuantity(item.id, 1)}
                            className="h-5 w-5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-500 italic mt-3 border-t border-slate-900 pt-2 font-sans font-medium">
              💡 <b>Dica operacional:</b> Ao registrar a troca de Cilindro ou Toner em uma impressora abaixo, escolha um insumo do estoque para deduzir 1 unidade do estoque correspondente e copiar a autonomia automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Supplies Replacement Form Slider / Draw Card */}
      {replacementForm && (
        <div className="bg-slate-950 border border-cyan-500/30 p-5 rounded-xl space-y-4 shadow-lg shadow-cyan-950/20">
          <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
            <div>
              <span className="text-[10px] bg-cyan-950/80 text-cyan-400 font-mono font-bold uppercase py-0.5 px-2 rounded border border-cyan-900/30">
                🧪 REGISTRAR TROCA DE INSUMO
              </span>
              <h3 className="text-sm font-bold text-white mt-1">
                Substituição de {replacementForm.supplyType === "toner" ? "Toner" : "Cilindro/Fotorreceptor"}
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Modelo: <b className="text-slate-300">{replacementForm.model}</b> | S/N: <b className="text-slate-300">{replacementForm.serial}</b>
              </p>
            </div>
            <button 
              onClick={() => setReplacementForm(null)}
              className="text-slate-500 hover:text-white text-xs cursor-pointer bg-slate-900 px-2 py-1 rounded border border-slate-800"
            >
              ✕ Fechar
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            const autonomyValue = parseInt(replacementForm.customAutonomy, 10) || replacementForm.defaultAutonomy;
            onReplaceSupply(
              replacementForm.printerId, 
              replacementForm.supplyType, 
              autonomyValue, 
              replacementForm.date,
              replacementForm.selectedSupplyId
            );
            setReplacementForm(null);
          }} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* STOCKS OPTION dropdown selector of compatible supplies inventory */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                📦 Selecionar Insumo do Estoque
              </label>
              <select
                className="w-full bg-slate-900 text-slate-100 text-xs border border-slate-805 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500 font-sans"
                value={replacementForm.selectedSupplyId || ""}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId) {
                    const found = suppliesInventory.find(s => s.id === selectedId);
                    if (found) {
                      setReplacementForm(prev => prev ? {
                        ...prev,
                        selectedSupplyId: selectedId,
                        customAutonomy: found.autonomy.toString()
                      } : null);
                    }
                  } else {
                    setReplacementForm(prev => prev ? {
                      ...prev,
                      selectedSupplyId: "",
                      customAutonomy: replacementForm.defaultAutonomy.toString()
                    } : null);
                  }
                }}
              >
                <option value="">-- Lançar Manual (Sem Debitar Estoque) --</option>
                {suppliesInventory
                  .filter(item => item.type === replacementForm.supplyType)
                  .map(item => (
                    <option key={item.id} value={item.id} disabled={item.stock === 0}>
                      {item.brand} {item.model} ({formatNumber(item.autonomy)} pág. | {item.stock} un. em estoque) {item.stock === 0 ? " [ESGOTADO]" : ""}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Custom Autonomy Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Autonomia de Páginas *
              </label>
              <input
                type="number"
                min="100"
                required
                className="w-full bg-slate-900 text-slate-100 text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500 font-mono"
                value={replacementForm.customAutonomy}
                onChange={(e) => setReplacementForm(prev => prev ? { ...prev, customAutonomy: e.target.value } : null)}
              />
              <span className="text-[9px] text-slate-500 block">
                Padrão nominal: <b>{formatNumber(replacementForm.defaultAutonomy)} pág.</b>
              </span>
            </div>

            {/* Replacement Date Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Data do Abastecimento
              </label>
              <input
                type="date"
                required
                className="w-full bg-slate-900 text-slate-100 text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500 font-mono"
                value={replacementForm.date}
                onChange={(e) => setReplacementForm(prev => prev ? { ...prev, date: e.target.value } : null)}
              />
            </div>

            {/* CTAs */}
            <div className="flex gap-2 justify-end pb-0.5">
              <button
                type="button"
                onClick={() => setReplacementForm(null)}
                className="bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-800 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/25"
              >
                <RefreshCw size={13} />
                Substituir
              </button>
            </div>
          </form>
          {replacementForm.selectedSupplyId && (
            <p className="text-[10px] text-emerald-400 font-semibold font-mono italic animate-pulse">
              ➔ Atenção: A confirmação desta troca irá descontar 1 unidade do estoque do item selecionado.
            </p>
          )}
        </div>
      )}

      {/* Control Tools Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-900">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Filtrar insumos por S/N, modelo ou por cliente..."
            className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 text-xs rounded-lg pl-9 pr-4 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer bg-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-800 select-none">
            <input
              type="checkbox"
              className="accent-cyan-500 h-4 w-4 rounded"
              checked={showOnlyAlerts}
              onChange={(e) => setShowOnlyAlerts(e.target.checked)}
            />
            <span className="text-xs font-semibold text-amber-500">Filtrar apenas em Margem Crítica (≤10%)</span>
          </label>
        </div>
      </div>

      {/* Supplies Grid overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPrinters.length === 0 ? (
          <div className="col-span-full py-16 bg-slate-950 border border-slate-900 text-center text-slate-500 rounded-xl">
            <CheckCircle size={40} className="mx-auto mb-2 opacity-50 text-emerald-400" />
            Nenhuma impressora ativa sob monitoramento correspondente aos parâmetros de filtro.
          </div>
        ) : (
          filteredPrinters.map(printer => {
            const client = clients.find(c => c.id === printer.clientId);
            
            // Stats
            const toner = calculateSupplyStatus(printer.tonerAutonomy, printer.tonerPrinted);
            const drum = calculateSupplyStatus(printer.drumAutonomy, printer.drumPrinted);
            const levelAlert = toner.isWithinSafetyMargin || drum.isWithinSafetyMargin;

            return (
              <div 
                key={printer.id}
                className={`p-5 rounded-xl border bg-slate-950 transition-all ${
                  levelAlert 
                    ? "border-amber-500/30 bg-gradient-to-br from-slate-950 to-amber-950/10 shadow-lg" 
                    : "border-slate-900 hover:border-slate-850"
                }`}
              >
                {/* Header detail */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-900">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                      {client ? client.name : "Em Estoque"} ({printer.location || "Padrão"})
                    </p>
                    <h4 className="text-sm font-bold text-white mt-0.5">{printer.brand} {printer.model}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      S/N: <span className="text-slate-300 font-semibold">{printer.serialNumber}</span>
                    </p>
                  </div>

                  {levelAlert && (
                    <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-500/35 px-2.5 py-0.5 rounded uppercase font-bold tracking-wide flex items-center gap-1 font-mono animate-pulse">
                      <AlertTriangle size={10} /> Alerta Margem 10%
                    </span>
                  )}
                </div>

                {/* Body: Two distinct supply level columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {/* TONER LEVEL CONTROL */}
                  <div className="space-y-3 bg-slate-900/30 p-3.5 rounded-lg border border-slate-900 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-slate-300">Toner Integrado</span>
                        <span className={`font-mono font-bold ${toner.isWithinSafetyMargin ? "text-amber-500 font-sans" : "text-cyan-400"}`}>
                          {toner.percentage}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            toner.isWithinSafetyMargin ? "bg-amber-500" : "bg-cyan-500"
                          }`}
                          style={{ width: `${toner.percentage}%` }}
                        ></div>
                      </div>

                      {/* Operational texts */}
                      <div className="mt-3.5 space-y-1 text-[11px] text-slate-400">
                        <p className="flex justify-between">
                          <span>Estimativa Autonomia:</span>
                          <span className="font-mono text-slate-300 font-medium">{formatNumber(printer.tonerAutonomy)} pág.</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Utilizado desde a troca:</span>
                          <span className="font-mono text-slate-300 font-medium">{formatNumber(printer.tonerPrinted)} pág.</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Vida Restante Estimada:</span>
                          <span className="font-mono text-slate-300 font-medium">{formatNumber(toner.remainingPages)} pág.</span>
                        </p>
                        <p className="flex justify-between border-t border-slate-900/60 pt-1.5 text-[10px]">
                          <span>Último abastecimento:</span>
                          <span className="font-mono text-slate-400">{formatDate(printer.lastTonerReplacementDate)}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleReplacement(printer.id, "toner", printer)}
                      className={`w-full text-[11px] font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-4 ${
                        toner.isWithinSafetyMargin 
                          ? "bg-amber-500 text-slate-950 hover:bg-amber-600 font-sans font-bold" 
                          : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                      }`}
                    >
                      <RefreshCw size={12} />
                      Registrar Novo Toner
                    </button>
                  </div>

                  {/* CYLINDER LEVEL CONTROL */}
                  <div className="space-y-3 bg-slate-900/30 p-3.5 rounded-lg border border-slate-900 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-slate-300">Cilindro (Fotorreceptor)</span>
                        <span className={`font-mono font-bold ${drum.isWithinSafetyMargin ? "text-amber-500 font-sans" : "text-indigo-400"}`}>
                          {drum.percentage}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            drum.isWithinSafetyMargin ? "bg-amber-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${drum.percentage}%` }}
                        ></div>
                      </div>

                      {/* Operational texts */}
                      <div className="mt-3.5 space-y-1 text-[11px] text-slate-400">
                        <p className="flex justify-between">
                          <span>Estimativa Autonomia:</span>
                          <span className="font-mono text-slate-300 font-medium">{formatNumber(printer.drumAutonomy)} pág.</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Utilizado desde a troca:</span>
                          <span className="font-mono text-slate-300 font-medium">{formatNumber(printer.drumPrinted)} pág.</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Vida Restante Estimada:</span>
                          <span className="font-mono text-slate-300 font-medium">{formatNumber(drum.remainingPages)} pág.</span>
                        </p>
                        <p className="flex justify-between border-t border-slate-900/60 pt-1.5 text-[10px]">
                          <span>Último fotorreceptor:</span>
                          <span className="font-mono text-slate-400">{formatDate(printer.lastDrumReplacementDate)}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleReplacement(printer.id, "drum", printer)}
                      className={`w-full text-[11px] font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-4 ${
                        drum.isWithinSafetyMargin 
                          ? "bg-amber-500 text-slate-950 hover:bg-amber-600 font-sans font-bold" 
                          : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                      }`}
                    >
                      <RefreshCw size={12} />
                      Registrar Novo Cilindro
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* HISTORIC LOG OF REPLACEMENTS */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-900 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
          <History className="text-cyan-400" size={18} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Histórico Recente de Trocas Físicas de Insumos
          </h3>
        </div>

        {replacementLogs.length === 0 ? (
          <p className="text-slate-600 text-xs italic py-4 text-center">Nenhuma troca gravada neste ciclo operacional.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="text-[10px] uppercase font-bold text-slate-500 font-mono border-b border-slate-900">
                <tr>
                  <th className="py-2.5 px-3">Data Troca</th>
                  <th className="py-2.5 px-3">Equipamento</th>
                  <th className="py-2.5 px-3">Insumo</th>
                  <th className="py-2.5 px-3">Cliente Alocado</th>
                  <th className="py-2.5 px-3 text-right">Contador no Ato</th>
                  <th className="py-2.5 px-3 text-right">Autonomia Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {replacementLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 font-mono text-slate-400">{formatDate(log.date)}</td>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-white block">{log.printerModel}</span>
                      <span className="text-[10px] text-slate-500 font-mono">S/N: {log.printerSerial}</span>
                    </td>
                    <td className="py-2 px-3 font-medium">
                      {log.supplyType === "toner" ? (
                        <span className="bg-cyan-950/80 text-cyan-400 px-2 py-0.5 rounded-full text-[10px] border border-cyan-900/30">
                          Toner
                        </span>
                      ) : (
                        <span className="bg-indigo-950/80 text-indigo-400 px-2 py-0.5 rounded-full text-[10px] border border-indigo-900/30">
                          Cilindro
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-400">{log.clientName}</td>
                    <td className="py-2 px-3 font-mono text-right font-medium text-slate-300">
                      {formatNumber(log.counterAtReplacement)} pág.
                    </td>
                    <td className="py-2 px-3 font-mono text-right text-slate-400">
                      {formatNumber(log.autonomy)} pág.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
