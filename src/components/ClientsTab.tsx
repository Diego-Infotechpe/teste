import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Trash2, 
  FileEdit, 
  DollarSign, 
  Printer as PrinterIcon, 
  Briefcase, 
  ArrowRight,
  User,
  Mail,
  Phone,
  FileText,
  AlertCircle
} from "lucide-react";
import { Client, Printer, MeterReading } from "../types";
import { formatCurrency, formatDate, formatNumber } from "../utils";

interface ClientsTabProps {
  clients: Client[];
  printers: Printer[];
  readings: MeterReading[];
  onAddClient: (newClient: Omit<Client, "id" | "createdAt">) => void;
  onUpdateClient: (updatedClient: Client) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientsTab({ 
  clients, 
  printers, 
  readings,
  onAddClient, 
  onUpdateClient, 
  onDeleteClient
}: ClientsTabProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");

  // Deletion States
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [monoPrice, setMonoPrice] = useState("0.10");
  const [colorPrice, setColorPrice] = useState("0.50");
  const [reserveToners, setReserveToners] = useState("0");
  const [reserveDrums, setReserveDrums] = useState("0");
  const [pageAllowance, setPageAllowance] = useState("0");
  const [fixedRentalFee, setFixedRentalFee] = useState("0");

  // Selected Client for detail view
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Filter clients based on search
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj.includes(searchTerm) ||
    c.contactName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open form for a new client
  const handleOpenAddForm = () => {
    setEditingClient(null);
    setName("");
    setCnpj("");
    setContactName("");
    setEmail("");
    setPhone("");
    setMonoPrice("0.10");
    setColorPrice("0.50");
    setReserveToners("0");
    setReserveDrums("0");
    setPageAllowance("0");
    setFixedRentalFee("0");
    setIsFormOpen(true);
  };

  // Open form to edit client
  const handleOpenEditForm = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setCnpj(client.cnpj);
    setContactName(client.contactName);
    setEmail(client.email);
    setPhone(client.phone);
    setMonoPrice(client.monoPricePerPage.toString());
    setColorPrice(client.colorPricePerPage.toString());
    setReserveToners((client.reserveToners ?? 0).toString());
    setReserveDrums((client.reserveDrums ?? 0).toString());
    setPageAllowance((client.pageAllowance ?? 0).toString());
    setFixedRentalFee((client.fixedRentalFee ?? 0).toString());
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cnpj) {
      alert("Nome do Cliente e CNPJ são obrigatórios!");
      return;
    }

    const payload = {
      name,
      cnpj,
      contactName,
      email,
      phone,
      monoPricePerPage: parseFloat(monoPrice) || 0,
      colorPricePerPage: parseFloat(colorPrice) || 0,
      reserveToners: parseInt(reserveToners, 10) || 0,
      reserveDrums: parseInt(reserveDrums, 10) || 0,
      pageAllowance: parseInt(pageAllowance, 10) || 0,
      fixedRentalFee: parseFloat(fixedRentalFee) || 0,
    };

    if (editingClient) {
      onUpdateClient({
        ...editingClient,
        ...payload
      });
    } else {
      onAddClient(payload);
    }

    setIsFormOpen(false);
    setEditingClient(null);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingClient(null);
  };

  // Utilities for selected client details
  const activeDetailClient = clients.find(c => c.id === selectedClientId) || null;
  const clientPrinters = activeDetailClient ? printers.filter(p => p.clientId === activeDetailClient.id) : [];
  const clientReadings = activeDetailClient ? readings.filter(r => {
    const printer = printers.find(p => p.id === r.printerId);
    return printer?.clientId === activeDetailClient.id;
  }).sort((a, b) => b.date.localeCompare(a.date)) : [];

  // Calculate total billing accumulator for active client
  const totalClientBilled = clientReadings.reduce((sum, r) => sum + r.amountCharged, 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* 1. Main Client Management Listing Column */}
      <div className={`${selectedClientId ? "xl:col-span-2" : "xl:col-span-3"} space-y-4 transition-all duration-300`}>
               {/* Header Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-900">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Buscar cliente por nome, CNPJ ou contato..."
              className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 text-sm rounded-lg pl-9 pr-4 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="client-search-input"
            />
          </div>
          <button
            onClick={handleOpenAddForm}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer shrink-0"
            id="add-client-btn"
          >
            <Plus size={16} />
            Cadastrar Cliente
          </button>
        </div>

        {/* Client Form Drawer/Modal Overlay */}
        {isFormOpen && (
          <div className="bg-slate-900 p-6 rounded-xl border border-cyan-500/20 shadow-lg space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest font-mono">
                {editingClient ? "✏️ Editar Informações do Cliente" : "🏢 Novo Cadastro de Cliente"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Defina os contatos, CNPJ e preços de faturamento de página de outsourcing</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Razão Social / Nome Fantasia *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Hospital Aliança S.A."
                    className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* CNPJ */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">CNPJ *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 00.000.000/0001-00"
                    className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                  />
                </div>

                {/* Contact Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 font-sans">Nome do Contato Principal</label>
                  <input
                    type="text"
                    placeholder="Ex: João da Silva (TI)"
                    className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">E-mail para Faturamento</label>
                  <input
                    type="email"
                    placeholder="Ex: faturamento@cliente.com"
                    className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ex: (81) 98888-7777"
                    className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 md:col-span-2">
                  <div className="md:col-span-2 pb-1 text-[11px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
                    💰 Configurações de Preço por Página Impressa (Varia por Cliente)
                  </div>
                  {/* Mono price page */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-300">Preço Página Mono (P&B)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 bg-slate-900 border-r border-slate-800 px-2.5 flex items-center rounded-l text-[10px] text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg pl-10 pr-2.5 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                        value={monoPrice}
                        onChange={(e) => setMonoPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Color price page */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-300">Preço Página Colorida</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 bg-slate-900 border-r border-slate-800 px-2.5 flex items-center rounded-l text-[10px] text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg pl-10 pr-2.5 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                        value={colorPrice}
                        onChange={(e) => setColorPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* FRANCHISE ALLOWANCE & FIXED FEE SETUP */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 md:col-span-2">
                  <div className="md:col-span-2 pb-1 text-[11px] font-bold text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    📄 Franquia de Páginas & Valor Fixo Contratual
                  </div>
                  
                  {/* Page Allowance Limit */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-300">
                      Franquia de Páginas (Inclusas no Fixo)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-cyan-500 font-mono"
                      value={pageAllowance}
                      onChange={(e) => setPageAllowance(e.target.value)}
                      placeholder="Ex: 10000"
                    />
                    <span className="text-[9px] text-slate-500 block">Carência somada das impressoras</span>
                  </div>

                  {/* Fixed Monthly rental fee */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-300">Valor Fixo Mensal (Contrato)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 bg-slate-900 border-r border-slate-800 px-2.5 flex items-center rounded-l text-[10px] text-slate-400 font-mono">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg pl-10 pr-2.5 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                        value={fixedRentalFee}
                        onChange={(e) => setFixedRentalFee(e.target.value)}
                        placeholder="Ex: 800.00"
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 block">Cobrança mínima com direito à franquia</span>
                  </div>
                </div>

                {/* Reserve stock values */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 md:col-span-2">
                  <div className="md:col-span-2 pb-1 text-[11px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
                    🎒 Estoque de Insumos Reserva no Cliente
                  </div>
                  {/* Reserve Toners */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-300">Quantidade de Toner Reserva</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-cyan-500 font-mono"
                      value={reserveToners}
                      onChange={(e) => setReserveToners(e.target.value)}
                    />
                  </div>

                  {/* Reserve Cylinders */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-300">Quantidade de Cilindros Reserva</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-cyan-500 font-mono"
                      value={reserveDrums}
                      onChange={(e) => setReserveDrums(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Form CTA buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-705 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  {editingClient ? "Salvar Alterações" : "Concluir Cadastro"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Clients list cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClients.length === 0 ? (
            <div className="col-span-full bg-slate-950 text-center py-12 rounded-xl border border-slate-900 text-slate-500">
              <Briefcase size={40} className="mx-auto mb-2 opacity-50" />
              Nenhum cliente cadastrado no momento ou encontrado na busca.
            </div>
          ) : (
            filteredClients.map(client => {
              const clientPrintersActive = printers.filter(p => !p.isDeleted && p.clientId === client.id);
              const clientPrintersCount = clientPrintersActive.length;
              const clientPrintersDeletedCount = printers.filter(p => p.isDeleted && p.clientId === client.id).length;
              
              return (
                <div 
                  key={client.id}
                  className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group ${
                    selectedClientId === client.id 
                      ? "bg-slate-900 border-cyan-500" 
                      : "bg-slate-950 border-slate-900 hover:border-slate-800 hover:bg-slate-900/40"
                  }`}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <div>
                    {/* Header line */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-slate-900 text-cyan-400 rounded-md border border-slate-800">
                            <Briefcase size={14} />
                          </span>
                          <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors leading-tight">
                            {client.name}
                          </h3>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500">CNPJ: {client.cnpj}</p>
                      </div>

                      {/* CTA edits */}
                      <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEditForm(client)}
                          title="Editar"
                          className="p-1 px-1.5 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 rounded border border-slate-800"
                        >
                          <FileEdit size={12} />
                        </button>
                        <button
                          onClick={() => setClientToDelete(client)}
                          title="Deletar"
                          className="p-1 px-1.5 bg-red-950/20 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded border border-red-950"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Contacts info list */}
                    <div className="mt-4 space-y-1 text-[11px] text-slate-400">
                      <p className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-500" />
                        Contato: <span className="text-slate-300 font-medium">{client.contactName || "-"}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-500" />
                        Email: <span className="text-slate-300">{client.email || "-"}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-500" />
                        Telefone: <span className="text-slate-300">{client.phone || "-"}</span>
                      </p>
                    </div>

                    {/* Franchise and Contract Summary Badge */}
                    {client.pageAllowance && client.pageAllowance > 0 ? (
                      <div className="mt-3 px-3 py-2 bg-cyan-950/20 border border-cyan-800/30 rounded-lg text-[10.5px] text-slate-300 flex items-center justify-between font-mono">
                        <span className="text-cyan-400 font-sans font-bold">📄 Franquia Contrato:</span>
                        <span><b>{formatNumber(client.pageAllowance || 0)}</b> pág • <b className="text-emerald-400">{formatCurrency(client.fixedRentalFee || 0)}</b></span>
                      </div>
                    ) : (
                      <div className="mt-3 px-3 py-1 bg-slate-900 border border-slate-850 rounded-lg text-[10px] text-slate-500 flex items-center justify-between font-medium">
                        <span>📄 Sem franquia fixa</span>
                        <span className="font-mono text-[9px]">Apenas custo/pág</span>
                      </div>
                    )}

                    {/* Reserve indicators on card */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-900/40 p-2 rounded border border-slate-900/80">
                      <span className="text-slate-400 flex items-center gap-1.5 justify-center py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                        Toners: <b className="text-cyan-400">{client.reserveToners ?? 0} un.</b>
                      </span>
                      <span className="text-slate-400 flex items-center gap-1.5 justify-center py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                        Cilindros: <b className="text-indigo-400">{client.reserveDrums ?? 0} un.</b>
                      </span>
                    </div>
                  </div>

                  {/* Foot rates / assigned block */}
                  <div className="pt-3 border-t border-slate-900 flex justify-between items-center text-xs">
                    <span className="text-slate-500 text-[10px] flex items-center gap-1.5 truncate">
                      <PrinterIcon size={12} className="shrink-0" />
                      <span>
                        {clientPrintersCount} Impressoras Ativas
                        {clientPrintersDeletedCount > 0 && (
                          <span className="text-[9px] text-red-400 ml-1">({clientPrintersDeletedCount} exc.)</span>
                        )}
                      </span>
                    </span>

                    <div className="flex gap-2 text-[10px] font-mono shrink-0">
                      <span className="bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        Mono: <b className="text-cyan-400">{formatCurrency(client.monoPricePerPage)}</b>
                      </span>
                      <span className="bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        Color: <b className="text-pink-400">{formatCurrency(client.colorPricePerPage)}</b>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Client Side Detail Pane Columns (Active if client selected) */}
      {selectedClientId && activeDetailClient && (
        <div className="bg-slate-950 rounded-xl border border-slate-900 p-5 space-y-5 shadow-lg h-fit max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-900">
            <div>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 font-bold uppercase rounded tracking-wider font-mono">
                Detalhes do Trabalho
              </span>
              <h3 className="text-sm font-bold text-white mt-1 leading-tight">{activeDetailClient.name}</h3>
            </div>
            <button
              onClick={() => setSelectedClientId(null)}
              className="text-slate-500 hover:text-slate-300 text-xs focus:outline-none"
            >
              Fechar Panel ✕
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-900 text-center col-span-2">
              <span className="text-[10px] text-slate-500 block">Total Faturado no Histórico</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{formatCurrency(totalClientBilled)}</span>
            </div>
            
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-900 text-center font-sans">
              <span className="text-[10px] text-slate-500 block">Franquia Contratada</span>
              <span className="text-sm font-bold text-yellow-500 font-mono">
                {activeDetailClient.pageAllowance ? `${formatNumber(activeDetailClient.pageAllowance)}` : "Sem Franquia"}
              </span>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-900 text-center font-sans">
              <span className="text-[10px] text-slate-500 block">Mensalidade Fixa</span>
              <span className="text-sm font-bold text-cyan-400 font-mono">
                {formatCurrency(activeDetailClient.fixedRentalFee || 0)}
              </span>
            </div>
            
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-900 text-center font-sans">
              <span className="text-[10px] text-slate-500 block">Excedente P&B</span>
              <span className="text-xs font-bold text-slate-300 font-mono">{formatCurrency(activeDetailClient.monoPricePerPage)} /pág</span>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-900 text-center font-sans">
              <span className="text-[10px] text-slate-500 block">Excedente Cor</span>
              <span className="text-xs font-bold text-pink-400 font-mono">{formatCurrency(activeDetailClient.colorPricePerPage)} /pág</span>
            </div>
          </div>

          {/* Reserve Supplies Inventory */}
          <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-xl space-y-2">
            <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">Suprimentos Reserva em Estoque</h4>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-900 flex items-center justify-between text-xs">
                <span className="text-slate-400">Toners Reserva:</span>
                <span className="font-mono font-bold text-cyan-400 text-xs">{(activeDetailClient.reserveToners ?? 0)} un.</span>
              </div>
              <div className="bg-slate-950 p-1.5 rounded border border-slate-900 flex items-center justify-between text-xs">
                <span className="text-slate-400">Cilindros:</span>
                <span className="font-mono font-bold text-indigo-400 text-xs">{(activeDetailClient.reserveDrums ?? 0)} un.</span>
              </div>
            </div>
          </div>

          {/* Connected Printers */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 flex items-center justify-between">
              <span>Impressoras Vinculadas</span>
              <span className="text-[10px] font-mono bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded">
                {clientPrinters.filter(p => !p.isDeleted).length} ativas
                {clientPrinters.some(p => p.isDeleted) && ` | ${clientPrinters.filter(p => p.isDeleted).length} exc.`}
              </span>
            </h4>

            {clientPrinters.length === 0 ? (
              <p className="text-slate-600 text-[11px] italic py-2">Nenhuma impressora no contrato deste cliente.</p>
            ) : (
              <div className="space-y-1.5">
                {clientPrinters.map(p => (
                  <div key={p.id} className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${p.isDeleted ? "bg-red-950/10 border-red-950/20 text-slate-400" : "bg-slate-900 border-slate-850 text-slate-200"}`}>
                    <div>
                      <span className={`font-semibold block ${p.isDeleted ? "text-slate-400 line-through decoration-red-900/60" : "text-slate-200"}`}>
                        {p.brand} {p.model}
                        {p.isDeleted && <span className="text-[9px] font-bold text-red-400 ml-1.5 px-1 py-0.5 bg-red-950/60 rounded uppercase font-mono tracking-wider">Excluída</span>}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">S/N: {p.serialNumber}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 italic font-mono">
                      {p.isDeleted ? "Ex-Equip." : (p.location || "Padrão")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Billings Statement Ledger */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 flex items-center justify-between">
              <span>Extrato de Leituras e Repasse</span>
              <span className="text-[10px] font-mono bg-slate-900 text-slate-300 px-1.5 rounded">{clientReadings.length}</span>
            </h4>

            {clientReadings.length === 0 ? (
              <div className="text-center py-4 text-slate-600 text-[11px]">
                <FileText size={20} className="mx-auto mb-1 opacity-40" />
                Sem leituras lançadas ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {clientReadings.map(r => {
                  const printer = printers.find(p => p.id === r.printerId);
                  return (
                    <div key={r.id} className="p-2.5 bg-slate-900 rounded-lg border border-slate-850 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded font-bold">
                          {formatDate(r.date)}
                        </span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {formatCurrency(r.amountCharged)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between items-center bg-slate-950/40 p-1.5 rounded">
                        <span className="truncate">Mod: {printer?.model || "Impressora"}{printer?.isDeleted ? " (Excluída)" : ""}</span>
                        <span>
                          {r.monoConsumed > 0 && `P&B: ${formatNumber(r.monoConsumed)} `}
                          {r.colorConsumed > 0 && `Col: ${formatNumber(r.colorConsumed)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {clientToDelete && (
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
              Deseja realmente excluir permanentemente o cliente <strong className="text-white">{clientToDelete.name}</strong> do portfólio de outsourcing?
            </p>

            <div className="bg-red-950/10 p-3 rounded-lg border border-red-950/30 text-[10.5px] text-red-400/90 leading-relaxed font-sans">
              ⚠️ <b>Aviso:</b> Isso não afetará as leituras históricas já lançadas, mas <b>removerá o vínculo</b> de todas as impressoras atualmente locadas neste cliente! Elas retornarão ao estoque (Lab) como sem vínculo.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors border border-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteClient(clientToDelete.id);
                  if (selectedClientId === clientToDelete.id) {
                    setSelectedClientId(null);
                  }
                  setClientToDelete(null);
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
