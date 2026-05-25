import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Trash2, 
  FileEdit, 
  Printer as PrinterIcon, 
  CheckCircle2, 
  AlertCircle, 
  Wrench, 
  MapPin, 
  Gauge, 
  Percent,
  Layers,
  Sparkles,
  RefreshCcw
} from "lucide-react";
import { Printer, Client, MeterReading } from "../types";
import { formatNumber, calculateSupplyStatus } from "../utils";

interface PrintersTabProps {
  printers: Printer[];
  clients: Client[];
  readings: MeterReading[];
  onAddPrinter: (newPrinter: Omit<Printer, "id" | "createdAt" | "currentCounterMono" | "currentCounterColor">) => void;
  onUpdatePrinter: (updatedPrinter: Printer) => void;
  onDeletePrinter: (id: string) => void;
  onAddReading: (reading: Omit<MeterReading, "id" | "recordedAt">) => void;
}

export default function PrintersTab({ 
  printers, 
  clients, 
  readings,
  onAddPrinter, 
  onUpdatePrinter, 
  onDeletePrinter,
  onAddReading
}: PrintersTabProps) {
  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "mono" | "color">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "maintenance" | "inactive">("all");
  const [filterClient, setFilterClient] = useState<string>("all");

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);

  // Retirada / Manutenção States
  const [originalPrinterState, setOriginalPrinterState] = useState<Printer | null>(null);
  const [retireMonoCounter, setRetireMonoCounter] = useState("");
  const [retireColorCounter, setRetireColorCounter] = useState("");
  const [retireMonth, setRetireMonth] = useState("2026-05");
  const [retireError, setRetireError] = useState<string | null>(null);

  // Deletion States
  const [printerToDelete, setPrinterToDelete] = useState<Printer | null>(null);

  // Form Fields
  const [serialNumber, setSerialNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [clientId, setClientId] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<"mono" | "color">("mono");
  const [initialCounterMono, setInitialCounterMono] = useState("0");
  const [initialCounterColor, setInitialCounterColor] = useState("0");
  const [status, setStatus] = useState<"active" | "maintenance" | "inactive">("active");
  const [needsDrumReplacement, setNeedsDrumReplacement] = useState(false);

  const BRANDS = ["HP", "Brother", "Kyocera", "Epson", "Samsung", "Ricoh", "Canon", "Xerox"];

  // Filter logic
  const filteredPrinters = printers.filter(p => {
    if (p.isDeleted) return false;
    
    const matchedSearch = 
      p.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchedType = filterType === "all" || p.type === filterType;
    const matchedStatus = filterStatus === "all" || p.status === filterStatus;
    
    let matchedClient = true;
    if (filterClient !== "all") {
      matchedClient = p.clientId === filterClient;
    }

    return matchedSearch && matchedType && matchedStatus && matchedClient;
  });

  const handleOpenAddForm = () => {
    setEditingPrinter(null);
    setOriginalPrinterState(null);
    setSerialNumber("");
    setBrand("Brother");
    setModel("");
    setClientId("");
    setLocation("");
    setType("mono");
    setInitialCounterMono("0");
    setInitialCounterColor("0");
    setStatus("active");
    setNeedsDrumReplacement(false);
    setIsFormOpen(true);
    setRetireError(null);
  };

  const handleOpenEditForm = (printer: Printer) => {
    setEditingPrinter(printer);
    setOriginalPrinterState(printer);
    setSerialNumber(printer.serialNumber);
    setBrand(printer.brand);
    setModel(printer.model);
    setClientId(printer.clientId);
    setLocation(printer.location);
    setType(printer.type);
    setInitialCounterMono(printer.initialCounterMono.toString());
    setInitialCounterColor(printer.initialCounterColor.toString());
    setStatus(printer.status);
    setNeedsDrumReplacement(!!printer.needsDrumReplacement);
    setIsFormOpen(true);

    // Initial default retraction values
    setRetireMonoCounter(printer.currentCounterMono.toString());
    setRetireColorCounter(printer.currentCounterColor.toString());
    setRetireMonth("2026-05");
    setRetireError(null);
  };

  const getPreviousCounterPriorToDate = (printer: Printer, targetDate: string) => {
    const priorReadings = readings
      .filter(r => r.printerId === printer.id && r.date < targetDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    
    if (priorReadings.length > 0) {
      return {
        mono: priorReadings[0].monoCounter,
        color: printer.type === "color" ? priorReadings[0].colorCounter : 0
      };
    }

    return {
      mono: printer.initialCounterMono,
      color: printer.type === "color" ? printer.initialCounterColor : 0
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber || !brand || !model) {
      alert("Marca, Modelo e S/N (Número de Série) são obrigatórios!");
      return;
    }

    const isLeavingClient = !!editingPrinter && 
      originalPrinterState && 
      originalPrinterState.clientId !== "" && 
      (status === "maintenance" || status === "inactive" || clientId === "");

    let finalCounterMonoVal = editingPrinter ? editingPrinter.currentCounterMono : 0;
    let finalCounterColorVal = editingPrinter ? editingPrinter.currentCounterColor : 0;

    if (editingPrinter && isLeavingClient) {
      const finalMono = parseInt(retireMonoCounter, 10);
      if (isNaN(finalMono) || finalMono < editingPrinter.currentCounterMono) {
        setRetireError(`O contador de retirada P&B não pode ser menor que o contador atual (${editingPrinter.currentCounterMono}).`);
        return;
      }
      let finalColor = 0;
      if (editingPrinter.type === "color") {
        finalColor = parseInt(retireColorCounter, 10);
        if (isNaN(finalColor) || finalColor < editingPrinter.currentCounterColor) {
          setRetireError(`O contador de retirada Colorido não pode ser menor que o contador atual (${editingPrinter.currentCounterColor}).`);
          return;
        }
      }

      // Record reading for the original client
      const prevMilestone = getPreviousCounterPriorToDate(editingPrinter, retireMonth);
      const monoConsumed = finalMono - prevMilestone.mono;
      const colorConsumed = finalColor - prevMilestone.color;

      onAddReading({
        printerId: editingPrinter.id,
        date: retireMonth,
        monoCounter: finalMono,
        colorCounter: finalColor,
        monoConsumed: Math.max(0, monoConsumed),
        colorConsumed: Math.max(0, colorConsumed),
        amountCharged: 0 // Will auto recalculate based on client setup in App handler
      });

      finalCounterMonoVal = finalMono;
      finalCounterColorVal = finalColor;
    }

    const payload = {
      serialNumber,
      brand,
      model,
      clientId,
      location,
      type,
      initialCounterMono: parseInt(initialCounterMono, 10) || 0,
      initialCounterColor: parseInt(initialCounterColor, 10) || 0,
      tonerAutonomy: editingPrinter ? editingPrinter.tonerAutonomy : 8000,
      tonerPrinted: editingPrinter ? editingPrinter.tonerPrinted : 0,
      lastTonerReplacementDate: editingPrinter ? editingPrinter.lastTonerReplacementDate : new Date().toISOString().split("T")[0],
      drumAutonomy: editingPrinter ? editingPrinter.drumAutonomy : 30000,
      drumPrinted: editingPrinter ? editingPrinter.drumPrinted : 0,
      lastDrumReplacementDate: editingPrinter ? editingPrinter.lastDrumReplacementDate : new Date().toISOString().split("T")[0],
      status,
      needsDrumReplacement
    };

    if (editingPrinter) {
      const updated: Printer = {
        ...editingPrinter,
        ...payload,
        // Carry on current counter adjustments
        currentCounterMono: isLeavingClient ? finalCounterMonoVal : (editingPrinter.currentCounterMono < payload.initialCounterMono ? payload.initialCounterMono : editingPrinter.currentCounterMono),
        currentCounterColor: isLeavingClient ? finalCounterColorVal : (editingPrinter.currentCounterColor < payload.initialCounterColor ? payload.initialCounterColor : editingPrinter.currentCounterColor)
      };
      onUpdatePrinter(updated);
    } else {
      onAddPrinter(payload);
    }

    setIsFormOpen(false);
    setEditingPrinter(null);
    setOriginalPrinterState(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Strip */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
        {/* Search */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar por S/N, Marca, Modelo ou setor..."
            className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 text-xs rounded-lg pl-9 pr-4 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Client filter */}
        <div>
          <select
            className="w-full bg-slate-900 text-slate-300 text-xs rounded-lg px-3 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="all">Filtro: Clientes (Todos)</option>
            <option value="">🛒 Em Estoque / Laboratório</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            className="w-full bg-slate-900 text-slate-300 text-xs rounded-lg px-3 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">Tipo: Todos</option>
            <option value="mono">P&B (Mono)</option>
            <option value="color">Colorida (Color)</option>
          </select>
        </div>

        {/* Button */}
        <button
          onClick={handleOpenAddForm}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus size={15} />
          Nova Impressora
        </button>
      </div>

      {/* Register / Edit Form Drawer */}
      {isFormOpen && (
        <div className="bg-slate-900 p-6 rounded-xl border border-cyan-500/20 shadow-lg space-y-4">
          <div className="pb-3 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">
                {editingPrinter ? "✏️ Editar Cadastro de Impressora" : "⚙️ Cadastrar Equipamento no Outsourcing"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Informe as especificações, autonomia de insumos e contadores no momento de integração.</p>
            </div>
            <button onClick={() => setIsFormOpen(false)} className="text-xs hover:text-white text-slate-500">✕ Cancelar</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Brand SELECT */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Marca *</label>
                <select
                  required
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {BRANDS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Modelo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: LaserJet Pro M404dw"
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>

              {/* Serial Number (S/N) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Número de Série (S/N) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: BRO-L5652-33D4F"
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500 font-mono"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>

              {/* Client Assignment */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Cliente Cedido</label>
                <select
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">🛒 Em estoque / Laboratório (Sem vínculo)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Location inside Client */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Localização / Setor no Cliente</label>
                <input
                  type="text"
                  placeholder="Ex: Recepção, T.I, Triagem"
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              {/* Printer Color Type */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Paleta de Impressão</label>
                <select
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <option value="mono">Preto & Branco (Mono)</option>
                  <option value="color">Colorida (Color)</option>
                </select>
              </div>

              {/* Initial Mono Count */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Contador Inicial P&B (Mono)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ex: 12500"
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500 font-mono"
                  value={initialCounterMono}
                  onChange={(e) => setInitialCounterMono(e.target.value)}
                />
              </div>

              {/* Initial Color Count */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Contador Inicial Colorido *</label>
                <input
                  type="number"
                  min="0"
                  disabled={type === "mono"}
                  placeholder="Ex: 2400"
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-40"
                  value={type === "mono" ? "0" : initialCounterColor}
                  onChange={(e) => setInitialCounterColor(e.target.value)}
                />
              </div>

              {/* Printer Status */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Status Operacional</label>
                <select
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="active">🟢 Ativa e Alugada</option>
                  <option value="maintenance">🔧 Em Manutenção / Lab</option>
                  <option value="inactive">🔴 Desativada do Contrato</option>
                </select>
              </div>

              {/* DRUM REPLACEMENT CONFIGURATION */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 md:col-span-3">
                <div className="text-[11px] font-bold text-cyan-400 font-mono uppercase tracking-wider mb-2">
                  ⚡ Estado do Cilindro / Tambor
                </div>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-slate-900 hover:bg-slate-850 transition-all border border-slate-800">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 cursor-pointer"
                    checked={needsDrumReplacement}
                    onChange={(e) => setNeedsDrumReplacement(e.target.checked)}
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 block">Sinalizar: Precisa de Troca de Cilindro</span>
                    <span className="text-[10px] text-slate-400 block leading-normal">
                      Marque se o cilindro deste equipamento está no fim da vida útil ou com desgaste visível, gerando um alerta visual para a equipe.
                    </span>
                  </div>
                </label>
              </div>

              {/* FINAL LEITURA DE RETIRADA COMPULSORY CONTROLS */}
              {editingPrinter && 
                originalPrinterState && 
                originalPrinterState.clientId !== "" && 
                (status === "maintenance" || status === "inactive" || clientId === "") && (
                  <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl space-y-3 md:col-span-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                        <Gauge size={14} />
                      </span>
                      <div>
                        <span className="text-xs font-bold text-amber-400 block uppercase tracking-wide font-sans">
                          Aferição de Leitura de Retirada
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          Lançamento compulsório do contador final para o cliente {clients.find(c => c.id === originalPrinterState.clientId)?.name || "Original"}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Esta impressora está saindo de serviço ativo no cliente. Para faturar e totalizar corretamente todas as páginas impressas por ela antes de ser desinstalada, preencha as últimas medições coletadas.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider font-mono">Competência (Mês)</label>
                        <input
                          type="month"
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 focus:outline-none focus:border-cyan-500 text-xs font-semibold font-mono"
                          value={retireMonth}
                          onChange={(e) => setRetireMonth(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider font-mono">Último Contador P&B</label>
                        <input
                          type="number"
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 focus:outline-none focus:border-cyan-500 text-xs font-semibold font-mono"
                          value={retireMonoCounter}
                          onChange={(e) => setRetireMonoCounter(e.target.value)}
                          placeholder={`Mínimo: ${editingPrinter.currentCounterMono}`}
                        />
                        <span className="text-[9px] text-slate-500 block">Atual: {editingPrinter.currentCounterMono}</span>
                      </div>

                      {editingPrinter.type === "color" && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider font-mono">Último Contador Color</label>
                          <input
                            type="number"
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded p-2 focus:outline-none focus:border-cyan-500 text-xs font-semibold font-mono"
                            value={retireColorCounter}
                            onChange={(e) => setRetireColorCounter(e.target.value)}
                            placeholder={`Mínimo: ${editingPrinter.currentCounterColor}`}
                          />
                          <span className="text-[9px] text-slate-500 block">Atual: {editingPrinter.currentCounterColor}</span>
                        </div>
                      )}
                    </div>

                    {retireError && (
                      <div className="text-[10px] font-bold text-red-400 bg-red-950/10 border border-red-500/20 p-2 rounded">
                        ⚠️ {retireError}
                      </div>
                    )}
                  </div>
              )}

            </div>

            {/* CTAs */}
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="bg-slate-850 hover:bg-slate-805 text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-800 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold px-5 py-2 rounded-lg transition-colors cursor-pointer"
              >
                {editingPrinter ? "Salvar Alterações" : "Cadastrar Impressora"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPrinters.length === 0 ? (
          <div className="col-span-full py-16 bg-slate-950 border border-slate-900 text-center text-slate-500 rounded-xl">
            <PrinterIcon size={48} className="mx-auto mb-2 opacity-30 text-slate-400" />
            Nenhuma impressora localizada com os filtros selecionados.
          </div>
        ) : (
          filteredPrinters.map(p => {
            const client = clients.find(c => c.id === p.clientId);
            
            // Calculate supply statuses
            const tonerStatus = calculateSupplyStatus(p.tonerAutonomy, p.tonerPrinted);
            const drumStatus = calculateSupplyStatus(p.drumAutonomy, p.drumPrinted);

            // Level alert triggers
            const criticalAlert = tonerStatus.isWithinSafetyMargin || drumStatus.isWithinSafetyMargin || !!p.needsDrumReplacement;

            return (
              <div 
                key={p.id}
                className={`bg-slate-950 border rounded-xl p-5 hover:border-slate-800 transition-all flex flex-col justify-between space-y-4 ${
                  p.needsDrumReplacement ? "border-red-900/50 relative shadow-red-950/10 shadow-lg" : criticalAlert ? "border-amber-900/40 relative shadow-red-950/10 shadow-lg" : "border-slate-900"
                }`}
              >
                {/* Upper line: Brand + Name & Status */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wide px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded">
                          {p.brand}
                        </span>
                        <span className={`text-[10px] font-bold rounded px-2 py-0.5 ${
                          p.type === "color" ? "bg-pink-950/40 text-pink-400 border border-pink-900/30" : "bg-slate-900/80 text-cyan-400 border border-slate-800"
                        }`}>
                          {p.type === "color" ? "Colorida" : "Mono"}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1 leading-snug">{p.model}</h4>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
                      {p.needsDrumReplacement && (
                        <span className="text-[10px] text-red-400 bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded font-bold flex items-center gap-1 animate-pulse" title="Este equipamento precisa de troca de cilindro">
                          ⚠️ Trocar Cilindro
                        </span>
                      )}
                      {p.status === "active" && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Ativa
                        </span>
                      )}
                      {p.status === "maintenance" && (
                        <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          <Wrench size={10} /> Lab
                        </span>
                      )}
                      {p.status === "inactive" && (
                        <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                          Inativa
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Serial Number & Client Link */}
                  <div className="mt-3.5 space-y-1 bg-slate-900/40 p-2.5 rounded-lg border border-slate-900 text-xs">
                    <p className="text-slate-400">
                      S/N: <b className="font-mono text-slate-300 text-xs">{p.serialNumber}</b>
                    </p>
                    <p className="text-slate-400 flex items-center gap-1.5 truncate">
                      <MapPin size={12} className="text-slate-500" />
                      Client: <span className="font-semibold text-slate-200">
                        {client ? client.name.split("-")[0].trim() : "🛒 Em Estoque (Lab)"}
                      </span>
                    </p>
                    {p.location && (
                      <p className="text-[10px] text-slate-500 pl-4">
                        Setor: <span className="text-slate-400">{p.location}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Gauge list info */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-[11px] text-slate-400 border-b border-slate-900 pb-1">
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                      <Gauge size={13} className="text-slate-500" /> Contadores Atuais
                    </span>
                    <span className="font-mono text-white font-semibold">
                      {p.type === "color" 
                        ? `P&B: ${formatNumber(p.currentCounterMono)} | Col: ${formatNumber(p.currentCounterColor)}` 
                        : `${formatNumber(p.currentCounterMono)} páginas`
                      }
                    </span>
                  </div>

                  {/* Toner visual level bar */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="text-slate-400 font-semibold">Nível de Toner</span>
                      <span className={`font-mono font-bold font-sans ${
                        tonerStatus.percentage <= 10 ? "text-amber-500 flex items-center gap-1" : "text-white"
                      }`}>
                        {tonerStatus.percentage <= 10 && <AlertCircle size={11} />}
                        {tonerStatus.percentage}% {tonerStatus.percentage <= 10 && "(Margem Crítica)"}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          tonerStatus.percentage <= 10 ? "bg-amber-500" : "bg-cyan-500"
                        }`}
                        style={{ width: `${tonerStatus.percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Drum/Cilindro visual level bar */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="text-slate-400 font-semibold">Retenção de Cilindro (Tambor)</span>
                      <span className={`font-mono font-bold font-sans ${
                        drumStatus.percentage <= 10 ? "text-amber-500 flex items-center gap-1" : "text-white"
                      }`}>
                        {drumStatus.percentage <= 10 && <AlertCircle size={11} />}
                        {drumStatus.percentage}% {drumStatus.percentage <= 10 && "(Margem Crítica)"}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          drumStatus.percentage <= 10 ? "bg-amber-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${drumStatus.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons edit & trash */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-900 text-xs">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Cadastrado em {new Date(p.createdAt || new Date()).toLocaleDateString("pt-BR")}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditForm(p)}
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-900 py-1 px-2 rounded border border-slate-900 hover:border-slate-800 flex items-center gap-1 transition-all text-[11px]"
                    >
                      <FileEdit size={11} /> Editar
                    </button>
                    <button
                      onClick={() => setPrinterToDelete(p)}
                      className="text-red-400 hover:text-red-300 hover:bg-slate-900 py-1 px-2 rounded border border-red-950/20 hover:border-red-950/50 flex items-center gap-1 transition-all text-[11px]"
                    >
                      <Trash2 size={11} /> Excluir
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Deletion Confirmation Modal */}
      {printerToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 shadow-xl max-w-md w-full animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-400">
              <span className="p-2 bg-red-950 rounded-lg border border-red-900/40">
                <Trash2 size={20} />
              </span>
              <div>
                <h3 className="font-bold text-white text-base">Confirmar Exclusão</h3>
                <p className="text-[10px] text-red-400 font-mono font-bold uppercase tracking-wider">Ação Irreversível</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Deseja realmente excluir permanentemente a impressora <strong className="text-white">{printerToDelete.brand} {printerToDelete.model}</strong> com número de série <strong className="font-mono text-cyan-400">{printerToDelete.serialNumber}</strong> do sistema de outsourcing?
            </p>
            
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-1.5 text-[11px] text-slate-400 font-mono">
              <p className="flex justify-between">
                <span>Contador P&B:</span>
                <span className="text-slate-200">{formatNumber(printerToDelete.currentCounterMono)} pág.</span>
              </p>
              {printerToDelete.type === "color" && (
                <p className="flex justify-between">
                  <span>Contador Colorido:</span>
                  <span className="text-slate-200">{formatNumber(printerToDelete.currentCounterColor)} pág.</span>
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPrinterToDelete(null)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors border border-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePrinter(printerToDelete.id);
                  setPrinterToDelete(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Confirmar e Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
