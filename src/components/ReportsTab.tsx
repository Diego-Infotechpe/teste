import React, { useState } from "react";
import { 
  FileText, 
  Printer as PrintIcon, 
  Calendar, 
  TrendingUp, 
  BarChart2, 
  Layers, 
  CheckSquare, 
  Square, 
  Users, 
  BookOpen, 
  Search,
  Check,
  ChevronDown,
  Info
} from "lucide-react";
import { Printer, Client, MeterReading } from "../types";
import { formatCurrency, formatNumber, formatDate } from "../utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ReportsTabProps {
  printers: Printer[];
  clients: Client[];
  readings: MeterReading[];
}

export default function ReportsTab({ printers, clients, readings }: ReportsTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  // Filters
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [reportPeriodType, setReportPeriodType] = useState<"month" | "year" | "custom">("month");
  
  // Single Month Selection
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-05");
  
  // Year Selection
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  
  // Custom checked months (month names mapping in Portuguese)
  const MONTHS_LIST = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" }
  ];

  const [checkedMonths, setCheckedMonths] = useState<string[]>(["05"]); // default to May

  const handleToggleMonth = (monthVal: string) => {
    if (checkedMonths.includes(monthVal)) {
      if (checkedMonths.length > 1) {
        setCheckedMonths(prev => prev.filter(m => m !== monthVal));
      }
    } else {
      setCheckedMonths(prev => [...prev, monthVal]);
    }
  };

  const handleSelectAllMonths = () => {
    setCheckedMonths(MONTHS_LIST.map(m => m.value));
  };

  const handleClearMonths = () => {
    setCheckedMonths(["05"]); // reset to May
  };

  // --- Aggregate & Filter Readings ---
  const activeClientName = selectedClientId === "all" 
    ? "Todos os Clientes" 
    : clients.find(c => c.id === selectedClientId)?.name || "Cliente Desconhecido";

  const getFilteredReadings = (): MeterReading[] => {
    return readings.filter(r => {
      // 1. Client filter
      if (selectedClientId !== "all") {
        const printer = printers.find(p => p.id === r.printerId);
        if (!printer || printer.clientId !== selectedClientId) {
          return false;
        }
      }

      // 2. Period filter
      if (reportPeriodType === "month") {
        return r.date === selectedMonth;
      } else if (reportPeriodType === "year") {
        return r.date.startsWith(selectedYear);
      } else {
        // "custom" check list
        const [yearPart, monthPart] = r.date.split("-");
        if (yearPart !== selectedYear) return false;
        return checkedMonths.includes(monthPart);
      }
    });
  };

  const filteredReadings = getFilteredReadings();

  // Aggregate stats
  const totalMonoPrinted = filteredReadings.reduce((sum, r) => sum + r.monoConsumed, 0);
  const totalColorPrinted = filteredReadings.reduce((sum, r) => sum + r.colorConsumed, 0);
  const totalPrinted = totalMonoPrinted + totalColorPrinted;
  const totalRevenue = filteredReadings.reduce((sum, r) => sum + r.amountCharged, 0);

  // Group by printer
  const printerSummary: { 
    [printerId: string]: { 
      printer: Printer;
      mono: number;
      color: number;
      total: number;
      cost: number;
    } 
  } = {};

  filteredReadings.forEach(r => {
    const printer = printers.find(p => p.id === r.printerId);
    if (!printer) return;

    if (!printerSummary[printer.id]) {
      printerSummary[printer.id] = {
        printer,
        mono: 0,
        color: 0,
        total: 0,
        cost: 0
      };
    }

    printerSummary[printer.id].mono += r.monoConsumed;
    printerSummary[printer.id].color += r.colorConsumed;
    printerSummary[printer.id].total += (r.monoConsumed + r.colorConsumed);
    printerSummary[printer.id].cost += r.amountCharged;
  });

  const parsedPrinterSummaries = Object.values(printerSummary).sort((a, b) => b.total - a.total);

  // Chart data formatting
  const chartData = parsedPrinterSummaries.slice(0, 10).map(item => ({
    name: item.printer.model.length > 15 ? `${item.printer.brand} ${item.printer.model.substring(0, 10)}...` : `${item.printer.brand} ${item.printer.model}`,
    "Páginas P&B": item.mono,
    "Páginas Coloridas": item.color,
    "S/N": item.printer.serialNumber
  }));

  // Period label for report formatting
  const getPeriodLabel = () => {
    if (reportPeriodType === "month") {
      const [year, month] = selectedMonth.split("-");
      const monthObj = MONTHS_LIST.find(m => m.value === month);
      return `${monthObj?.label || month} de ${year}`;
    } else if (reportPeriodType === "year") {
      return `Ano de ${selectedYear}`;
    } else {
      const selectedLabels = MONTHS_LIST
        .filter(m => checkedMonths.includes(m.value))
        .map(m => m.label);
      return `Meses: ${selectedLabels.join(", ")} (${selectedYear})`;
    }
  };

// Helper to convert OKLab coordinates to RGB/RGBA
const oklabToRgb = (L: number, a: number, b: number, alpha: number): string => {
  // OKLab to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // LMS to LMS cubed
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS to Linear RGB mapping
  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b_val = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Linear RGB to standard RGB (gamma correction)
  const fn = (c: number) => {
    const abs = Math.abs(c);
    const converted = abs > 0.0031308 ? 1.055 * Math.pow(abs, 1 / 2.4) - 0.055 : 12.92 * abs;
    return Math.max(0, Math.min(255, Math.round((c < 0 ? -converted : converted) * 255)));
  };

  const R = fn(r);
  const G = fn(g);
  const B = fn(b_val);

  return alpha === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${alpha})`;
};

// Replaces oklch(...) and oklab(...) CSS functions inside styles with RGB/RGBA string
const replaceOklchOklab = (value: string | null): string => {
  if (!value) return "";
  if (typeof value !== 'string') return String(value);
  const lowerValue = value.toLowerCase();
  if (!lowerValue.includes('oklch') && !lowerValue.includes('oklab')) return value;

  let result = value;

  // Replace OKLCH
  const oklchPattern = /oklch\(([^)]+)\)/gi;
  result = result.replace(oklchPattern, (match, inner) => {
    try {
      if (inner.includes('var(')) {
        return "rgb(15, 23, 42)"; // Safe default dark slate fallback for variable cases
      }
      const parts = inner.trim().split(/[\s,]+/);
      if (parts.length < 3) return "rgb(15, 23, 42)";

      const L_str = parts[0];
      const C_str = parts[1];
      const H_str = parts[2];
      
      let A_str = parts[3];
      if (A_str === "/" && parts[4]) {
        A_str = parts[4];
      } else if (inner.includes("/")) {
        const afterSlash = inner.split("/")[1];
        if (afterSlash) {
          A_str = afterSlash.trim();
        }
      }

      const L = L_str.endsWith('%') ? parseFloat(L_str) / 100 : parseFloat(L_str);
      const C = parseFloat(C_str.replace(/[^\d.-]/g, ''));
      const H = parseFloat(H_str.replace(/[^\d.-]/g, ''));
      
      if (isNaN(L) || isNaN(C) || isNaN(H)) {
        return "rgb(15, 23, 42)";
      }

      let alpha = 1;
      if (A_str) {
        alpha = A_str.endsWith('%') ? parseFloat(A_str) / 100 : parseFloat(A_str.replace(/[^\d.-]/g, ''));
        if (isNaN(alpha)) alpha = 1;
      }

      const hRad = (H * Math.PI) / 180;
      const a = C * Math.cos(hRad);
      const b = C * Math.sin(hRad);

      return oklabToRgb(L, a, b, alpha);
    } catch (e) {
      return "rgb(15, 23, 42)";
    }
  });

  // Replace OKLAB
  const oklabPattern = /oklab\(([^)]+)\)/gi;
  result = result.replace(oklabPattern, (match, inner) => {
    try {
      if (inner.includes('var(')) {
        return "rgb(15, 23, 42)";
      }
      const parts = inner.trim().split(/[\s,]+/);
      if (parts.length < 3) return "rgb(15, 23, 42)";

      const L_str = parts[0];
      const a_str = parts[1];
      const b_str = parts[2];
      
      let A_str = parts[3];
      if (A_str === "/" && parts[4]) {
        A_str = parts[4];
      } else if (inner.includes("/")) {
        const afterSlash = inner.split("/")[1];
        if (afterSlash) {
          A_str = afterSlash.trim();
        }
      }

      const L = L_str.endsWith('%') ? parseFloat(L_str) / 100 : parseFloat(L_str);
      const a = parseFloat(a_str.replace(/[^\d.-]/g, ''));
      const b = parseFloat(b_str.replace(/[^\d.-]/g, ''));
      
      if (isNaN(L) || isNaN(a) || isNaN(b)) {
        return "rgb(15, 23, 42)";
      }

      let alpha = 1;
      if (A_str) {
        alpha = A_str.endsWith('%') ? parseFloat(A_str) / 100 : parseFloat(A_str.replace(/[^\d.-]/g, ''));
        if (isNaN(alpha)) alpha = 1;
      }

      return oklabToRgb(L, a, b, alpha);
    } catch (e) {
      return "rgb(15, 23, 42)";
    }
  });

  return result;
};

  const handlePrint = async () => {
    const element = document.getElementById("printable-report");
    if (!element) return;
    
    setIsGenerating(true);
    
    // Arrays/variables to hold original descriptors/methods for restoration
    let originalCSSRuleDesc: PropertyDescriptor | null = null;
    let originalCSSStyleDeclDesc: PropertyDescriptor | null = null;
    let originalGetPropertyValue: any = null;
    let originalGetComputedStyle: any = null;
    
    try {
      // 1. Intercept CSSRule.prototype.cssText globally
      if (typeof CSSRule !== "undefined" && CSSRule.prototype) {
        const desc = Object.getOwnPropertyDescriptor(CSSRule.prototype, "cssText");
        if (desc) {
          originalCSSRuleDesc = desc;
          Object.defineProperty(CSSRule.prototype, "cssText", {
            get() {
              const val = desc.get ? desc.get.call(this) : "";
              return replaceOklchOklab(val);
            },
            configurable: true
          });
        }
      }

      // 2. Intercept CSSStyleDeclaration.prototype.cssText globally
      if (typeof CSSStyleDeclaration !== "undefined" && CSSStyleDeclaration.prototype) {
        const desc = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, "cssText");
        if (desc) {
          originalCSSStyleDeclDesc = desc;
          Object.defineProperty(CSSStyleDeclaration.prototype, "cssText", {
            get() {
              const val = desc.get ? desc.get.call(this) : "";
              return replaceOklchOklab(val);
            },
            configurable: true
          });
        }
      }

      // 3. Intercept CSSStyleDeclaration.prototype.getPropertyValue globally
      if (typeof CSSStyleDeclaration !== "undefined" && CSSStyleDeclaration.prototype) {
        originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
        CSSStyleDeclaration.prototype.getPropertyValue = function (propertyName: string) {
          const val = originalGetPropertyValue.call(this, propertyName);
          return replaceOklchOklab(val);
        };
      }

      // 4. Intercept window.getComputedStyle globally
      originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function (el: Element, pseudo?: string) {
        const style = originalGetComputedStyle(el, pseudo);
        return new Proxy(style, {
          get(target, prop) {
            if (prop === 'getPropertyValue') {
              return function(propertyName: string) {
                const val = target.getPropertyValue(propertyName);
                return replaceOklchOklab(val);
              };
            }
            const value = Reflect.get(target, prop);
            if (typeof value === 'string' && (value.includes('oklch') || value.includes('oklab') || value.includes('OKLCH') || value.includes('OKLAB'))) {
              return replaceOklchOklab(value) || "";
            }
            if (typeof value === 'function') {
              return value.bind(target);
            }
            return value;
          }
        });
      };

      // Gather all active window css style sheets and style blocks, then sanitize them once
      let rawCssText = "";
      
      const activeStyleSheets = Array.from(document.styleSheets);
      for (const sheet of activeStyleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) continue;
          for (let k = 0; k < rules.length; k++) {
            rawCssText += rules[k].cssText + "\n";
          }
        } catch (e) {
          // Safe catch for cross-origin style sheets
        }
      }

      const activeStyleTags = Array.from(document.querySelectorAll("style"));
      for (const styleTag of activeStyleTags) {
        if (styleTag.textContent) {
          rawCssText += styleTag.textContent + "\n";
        }
      }

      // Convert all oklch / oklab colors to RGB in the CSS rules text content
      const sanitizedCssText = replaceOklchOklab(rawCssText);

      const { jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      // Give lightweight layout states a moment to update if needed
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2, // sharp rendering scale
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          // Remove all default style tags and style link tags to prevent html2canvas's own parser from encountering oklch/oklab
          const clonedStyles = Array.from(clonedDoc.getElementsByTagName("style"));
          for (const style of clonedStyles) {
            style.remove();
          }
          const clonedLinks = Array.from(clonedDoc.getElementsByTagName("link"));
          for (const link of clonedLinks) {
            if (link.rel === "stylesheet" || link.href.includes(".css")) {
              link.remove();
            }
          }

          // Inject the single fully sanitized CSS blocks
          const cleanStyleElement = clonedDoc.createElement("style");
          cleanStyleElement.id = "cloned-sanitized-styles";
          cleanStyleElement.textContent = sanitizedCssText;
          clonedDoc.head.appendChild(cleanStyleElement);

          // Clean all html elements' inline style attributes inside clonedDoc just in case
          const allElements = clonedDoc.getElementsByTagName("*");
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            if (el.style) {
              const styleAttr = el.getAttribute("style");
              if (styleAttr && (styleAttr.includes("oklch") || styleAttr.includes("oklab"))) {
                el.setAttribute("style", replaceOklchOklab(styleAttr));
              }
            }
          }

          // Proxy computed style in the cloned iframe window to return fallback RGB / RGBA
          const clonedWindow = clonedDoc.defaultView;
          if (clonedWindow) {
            const originalGetComputedStyle = clonedWindow.getComputedStyle;
            clonedWindow.getComputedStyle = function (el: Element, pseudo?: string) {
              const style = originalGetComputedStyle(el, pseudo);
              
              return new Proxy(style, {
                get(target, prop) {
                  if (prop === 'getPropertyValue') {
                    return function(propertyName: string) {
                      const val = target.getPropertyValue(propertyName);
                      return replaceOklchOklab(val);
                    };
                  }
                  
                  const value = Reflect.get(target, prop);
                  if (typeof value === 'string' && (value.includes('oklch') || value.includes('oklab'))) {
                    return replaceOklchOklab(value) || "";
                  }
                  if (typeof value === 'function') {
                    return value.bind(target);
                  }
                  return value;
                }
              });
            };

            // Also try to intercept CSSRule / CSSStyleDeclaration proto inside cloned iframe context
            if (clonedWindow.CSSRule && clonedWindow.CSSRule.prototype) {
              const ruleDesc = Object.getOwnPropertyDescriptor(clonedWindow.CSSRule.prototype, "cssText");
              if (ruleDesc) {
                Object.defineProperty(clonedWindow.CSSRule.prototype, "cssText", {
                  get() {
                    const val = ruleDesc.get ? ruleDesc.get.call(this) : "";
                    return replaceOklchOklab(val);
                  },
                  configurable: true
                });
              }
            }

            if (clonedWindow.CSSStyleDeclaration && clonedWindow.CSSStyleDeclaration.prototype) {
              const declDesc = Object.getOwnPropertyDescriptor(clonedWindow.CSSStyleDeclaration.prototype, "cssText");
              if (declDesc) {
                Object.defineProperty(clonedWindow.CSSStyleDeclaration.prototype, "cssText", {
                  get() {
                    const val = declDesc.get ? declDesc.get.call(this) : "";
                    return replaceOklchOklab(val);
                  },
                  configurable: true
                });
              }

              const origClonedGetPropertyValue = clonedWindow.CSSStyleDeclaration.prototype.getPropertyValue;
              clonedWindow.CSSStyleDeclaration.prototype.getPropertyValue = function (propertyName: string) {
                const val = origClonedGetPropertyValue.call(this, propertyName);
                return replaceOklchOklab(val);
              };
            }
          }
        }
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const renderWidth = pdfWidth - (margin * 2);
      const renderHeight = (canvas.height * renderWidth) / canvas.width;
      
      let heightLeft = renderHeight;
      let position = margin;

      pdf.addImage(imgData, "JPEG", margin, position, renderWidth, renderHeight);
      heightLeft -= (pdfHeight - (margin * 2));

      while (heightLeft > 0) {
        position = heightLeft - renderHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, position, renderWidth, renderHeight);
        heightLeft -= (pdfHeight - (margin * 2));
      }

      const clientClean = activeClientName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const periodClean = getPeriodLabel().toLowerCase().replace(/[^a-z0-9]/g, "_");
      const filename = `relatorio_outsourcing_${clientClean}_${periodClean}.pdf`;
      
      pdf.save(filename);
    } catch (err) {
      console.error("Erro na geração do PDF, fallback para window.print():", err);
      window.print();
    } finally {
      // Restore all intercepted properties/methods
      if (originalCSSRuleDesc && typeof CSSRule !== "undefined" && CSSRule.prototype) {
        Object.defineProperty(CSSRule.prototype, "cssText", originalCSSRuleDesc);
      }
      if (originalCSSStyleDeclDesc && typeof CSSStyleDeclaration !== "undefined" && CSSStyleDeclaration.prototype) {
        Object.defineProperty(CSSStyleDeclaration.prototype, "cssText", originalCSSStyleDeclDesc);
      }
      if (originalGetPropertyValue && typeof CSSStyleDeclaration !== "undefined" && CSSStyleDeclaration.prototype) {
        CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
      }
      if (originalGetComputedStyle) {
        window.getComputedStyle = originalGetComputedStyle;
      }
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* CONTROLS BAR (Hidden during printing) */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-900 space-y-4 print:hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-[#1e293b]">
          <span className="p-1.5 bg-slate-900 border border-slate-800 rounded-md text-cyan-400">
            <FileText size={16} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Configurador de Relatórios Digitais & Impressos
            </h3>
            <p className="text-xs text-slate-500">Selecione o cliente, defina o intervalo de meses e salve como PDF no botão abaixo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* CLIENT SELECTOR */}
          <div className="space-y-1 md:col-span-4">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Users size={12} className="text-slate-500" /> Filtrar por Cliente
            </label>
            <select
              className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="all">🏢 Todos os Clientes de Outsourcing</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* PERIOD FILTER MODE */}
          <div className="space-y-1 md:col-span-3">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Calendar size={12} className="text-slate-500" /> Tipo de Intervalo
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                className={`py-1.5 text-[10px] font-bold rounded text-center transition-colors cursor-pointer ${
                  reportPeriodType === "month" 
                    ? "bg-cyan-500 text-slate-950" 
                    : "text-slate-400 hover:text-white"
                }`}
                onClick={() => setReportPeriodType("month")}
              >
                Mensal
              </button>
              <button
                type="button"
                className={`py-1.5 text-[10px] font-bold rounded text-center transition-colors cursor-pointer ${
                  reportPeriodType === "year" 
                    ? "bg-cyan-500 text-slate-950" 
                    : "text-slate-400 hover:text-white"
                }`}
                onClick={() => setReportPeriodType("year")}
              >
                Anual
              </button>
              <button
                type="button"
                className={`py-1.5 text-[10px] font-bold rounded text-center transition-colors cursor-pointer ${
                  reportPeriodType === "custom" 
                    ? "bg-cyan-500 text-slate-950" 
                    : "text-slate-400 hover:text-white"
                }`}
                onClick={() => setReportPeriodType("custom")}
              >
                Marcar
              </button>
            </div>
          </div>

          {/* PERIOD OUTPUT SELECTOR */}
          <div className="space-y-1 md:col-span-3">
            {reportPeriodType === "month" && (
              <>
                <label className="text-xs font-semibold text-slate-300 block">Escolha o Mês de Referência</label>
                <input
                  type="month"
                  className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-cyan-500 font-mono"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </>
            )}

            {(reportPeriodType === "year" || reportPeriodType === "custom") && (
              <>
                <label className="text-xs font-semibold text-slate-300 block">Definir Ano Fiscal</label>
                <select
                  className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-cyan-500 font-mono"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </>
            )}
          </div>

          {/* PRINT BUTTON */}
          <div className="md:col-span-2">
            <button
              onClick={handlePrint}
              disabled={filteredReadings.length === 0 || isGenerating}
              className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-md"
            >
              <PrintIcon size={14} className={isGenerating ? "animate-spin" : ""} />
              {isGenerating ? "Gerando PDF..." : "Imprimir PDF"}
            </button>
          </div>
        </div>

        {/* CUSTOM CHECKBOXES DROPDOWN DRAWER FOR SELECTING CUSTOM MONTHS */}
        {reportPeriodType === "custom" && (
          <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl mt-3 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1.5">
                <CheckSquare size={12} className="text-cyan-400" /> Marque os meses para compilar no relatório
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={handleSelectAllMonths} 
                  type="button" 
                  className="text-[9px] bg-slate-950 px-2 py-0.5 rounded text-slate-400 hover:text-white border border-slate-800 cursor-pointer font-semibold"
                >
                  Marcar Todos
                </button>
                <button 
                  onClick={handleClearMonths} 
                  type="button" 
                  className="text-[9px] bg-slate-950 px-2 py-0.5 rounded text-slate-400 hover:text-white border border-slate-800 cursor-pointer font-semibold"
                >
                  Limpar Seleção
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {MONTHS_LIST.map((m) => {
                const isSelected = checkedMonths.includes(m.value);
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => handleToggleMonth(m.value)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-cyan-950/20 border-cyan-500/30 text-cyan-400 font-bold" 
                        : "bg-slate-950/60 border-slate-850 text-slate-400 hover:text-white hover:border-slate-800"
                    }`}
                  >
                    <span className="shrink-0 text-cyan-500">
                      {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                    </span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RENDER BODY FOR RELATORIO (Optmized for UI viewing and Printing/PDF extraction) */}
      {filteredReadings.length === 0 ? (
        <div className="bg-slate-950 border border-slate-900 p-16 text-center text-slate-500 rounded-xl max-w-4xl mx-auto space-y-3 print:border-none print:text-black print:bg-white print:py-16">
          <BookOpen size={48} className="mx-auto mb-2 opacity-20 text-slate-500" />
          <h4 className="font-bold text-xs uppercase font-mono text-slate-400 tracking-wider">Métricas Vazias</h4>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-normal">
            Não existem lançamentos medidos no período selecionado ({getPeriodLabel()}) para {activeClientName}. Projete novos contadores na aba de Leituras.
          </p>
        </div>
      ) : (
        <div 
          id="printable-report" 
          className={`bg-slate-950 border border-slate-900 rounded-xl p-6 sm:p-10 shadow-2xl relative overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:m-0 ${
            isGenerating ? "pdf-generation bg-white border-transparent shadow-none" : ""
          }`}
        >
          {isGenerating && (
            <style>{`
              .pdf-generation {
                background-color: #ffffff !important;
                color: #000000 !important;
              }
              .pdf-generation .print\\:hidden {
                display: none !important;
              }
              .pdf-generation .print\\:block {
                display: block !important;
              }
              .pdf-generation .bg-slate-900\\/60,
              .pdf-generation .bg-slate-900\\/40,
              .pdf-generation .bg-slate-900 {
                background-color: #f8fafc !important;
                border-color: #cbd5e1 !important;
                color: #020617 !important;
              }
              .pdf-generation th {
                background-color: #f1f5f9 !important;
                color: #0d1527 !important;
                border-color: #0d1527 !important;
              }
              .pdf-generation td,
              .pdf-generation p,
              .pdf-generation span,
              .pdf-generation h2,
              .pdf-generation h4,
              .pdf-generation div,
              .pdf-generation b,
              .pdf-generation table,
              .pdf-generation tr {
                color: #0f172a !important;
                border-color: #e2e8f0 !important;
              }
              .pdf-generation .text-cyan-400 {
                color: #0369a1 !important;
              }
              .pdf-generation .text-emerald-400 {
                color: #047857 !important;
              }
              .pdf-generation .text-pink-400 {
                color: #3730a3 !important;
              }
              .pdf-generation text {
                fill: #0f172a !important;
              }
            `}</style>
          )}
          
          {/* Decorative watermarked print banner */}
          <div className="absolute top-0 right-0 p-1.5 bg-cyan-900/10 text-cyan-400/80 uppercase font-bold tracking-widest text-[8px] font-mono border-l border-b border-cyan-900/20 rounded-bl print:hidden">
            Visualização de Relatório Regulamentado
          </div>

          {/* REPORT HEADER PORTION */}
          <div className="pb-6 border-b border-slate-800 print:border-black flex flex-col md:flex-row md:items-center md:justify-between justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block print:text-sky-700">
                RELATÓRIO DE DESEMPENHO E UTILIZAÇÃO DE OUTSOURCING
              </span>
              <h2 className="text-2xl font-black text-white leading-tight font-sans tracking-tight print:text-black">
                {activeClientName}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 print:text-slate-600">
                <span className="font-bold">Período de Referência:</span>
                <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-850 print:bg-slate-200 print:border-transparent">
                  {getPeriodLabel()}
                </span>
              </div>
            </div>

            <div className="text-right space-y-1 text-slate-400 text-xs md:border-l md:border-slate-850 md:pl-6 print:text-slate-800 print:border-slate-300">
              <p className="font-bold text-white print:text-black text-sm">InfotechPE Outsourcing</p>
              <p className="text-[10px] font-mono text-slate-500 print:text-slate-600">Cnpj: 00.000.000/0001-00</p>
              <p className="text-[10px] pt-1">Emitido em: <b className="font-mono text-slate-300 print:text-black">{new Date().toLocaleDateString("pt-BR")}</b></p>
            </div>
          </div>

          {/* METRIC SUMMARIES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-8">
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-850/60 flex flex-col justify-between print:bg-slate-100 print:border-slate-300">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 print:text-slate-600 block">Total de Páginas Impressas</span>
              <span className="text-3xl font-black text-white font-mono mt-2 print:text-black block leading-none">
                {formatNumber(totalPrinted)}
              </span>
              <span className="text-[9.5px] text-slate-500 font-mono mt-1 print:text-slate-600">
                Soma de impressoras ativas + retiradas
              </span>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-850/60 flex flex-col justify-between print:bg-slate-100 print:border-slate-300">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 print:text-slate-600 block">Distribuição de Páginas</span>
              <div className="flex justify-between items-baseline mt-2">
                <div>
                  <span className="text-xs text-slate-500 block">P&B (Mono):</span>
                  <span className="text-xl font-bold font-mono text-slate-100 print:text-black leading-none">{formatNumber(totalMonoPrinted)}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Coloridas:</span>
                  <span className="text-xl font-bold font-mono text-pink-400 print:text-indigo-800 leading-none">{formatNumber(totalColorPrinted)}</span>
                </div>
              </div>
              <span className="text-[9.5px] text-slate-500 font-mono mt-2 print:text-slate-600">
                Métricas agregadas do período
              </span>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-850/60 flex flex-col justify-between print:bg-slate-100 print:border-slate-300">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 print:text-slate-600 block">Outsourcing Faturamento</span>
              <span className="text-3xl font-black text-emerald-400 font-mono mt-2 print:text-emerald-700 block leading-none">
                {selectedClientId === "all" ? "R$ --" : formatCurrency(totalRevenue)}
              </span>
              <span className="text-[9.5px] text-slate-500 font-mono mt-1 print:text-slate-600">
                {selectedClientId === "all" ? "Selecione cliente para faturamento real" : "Baseado no faturamento medido no mês"}
              </span>
            </div>
          </div>

          {/* VISUAL CHART AREA (Hidden on print if preferred, but styled beautifully to show up clearly inside PDFs) */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 mb-8 print:hidden">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
              <BarChart2 size={14} className="text-cyan-400" /> Ranking de Consumo das Impressoras (Top 10)
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff", fontWeight: "bold", fontSize: "11px" }}
                    itemStyle={{ color: "#38bdf8", fontSize: "11px" }}
                  />
                  <Bar dataKey="Páginas P&B" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Páginas Coloridas" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABLE OF CONSUMED METERS BY PRINTER MODEL */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono print:text-black flex items-center gap-2 border-b border-slate-850 pb-2">
              <Layers size={14} className="text-cyan-400 print:hidden" /> Detalhamento do Consumo por Equipamento
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 print:text-black font-sans">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-850 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono print:bg-slate-200 print:text-black print:border-black">
                    <th className="py-3 px-4">Equipamento (Marca / Modelo)</th>
                    <th className="py-3 px-4">Número de Série (S/N)</th>
                    {selectedClientId === "all" && <th className="py-3 px-4">Cliente Cedido</th>}
                    <th className="py-3 px-4 text-right">Páginas P&B</th>
                    <th className="py-3 px-4 text-right">Páginas Coloridas</th>
                    <th className="py-3 px-4 text-right">Métrica Total</th>
                    {selectedClientId !== "all" && <th className="py-3 px-4 text-right">Faturado</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 print:divide-slate-200">
                  {parsedPrinterSummaries.map((item, idx) => (
                    <tr 
                      key={item.printer.id} 
                      className="hover:bg-slate-900/35 transition-colors print:hover:bg-transparent"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-100 print:text-black flex items-center gap-2">
                        <span className="text-slate-500 print:text-slate-400 font-mono">#{idx+1}</span>
                        <div>
                          <span>{item.printer.brand} {item.printer.model}</span>
                          <span className="text-[10px] text-slate-400 block font-normal font-sans print:text-slate-600">
                            Setor: {item.printer.location || "Principal"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 print:text-black">
                        {item.printer.serialNumber}
                      </td>
                      {selectedClientId === "all" && (
                        <td className="py-3.5 px-4 font-medium text-slate-300 print:text-black truncate max-w-[150px]">
                          {clients.find(c => c.id === item.printer.clientId)?.name.split("-")[0] || "Em estoque"}
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300 print:text-black">
                        {formatNumber(item.mono)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300 print:text-black">
                        {item.printer.type === "color" ? formatNumber(item.color) : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white print:text-black">
                        {formatNumber(item.total)}
                      </td>
                      {selectedClientId !== "all" && (
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 print:text-black">
                          {formatCurrency(item.cost)}
                        </td>
                      )}
                    </tr>
                  ))}
                  
                  {/* Totals Row */}
                  <tr className="bg-slate-900/60 font-bold border-t border-slate-850 border-b print:bg-slate-100 print:text-black print:border-black font-sans">
                    <td className="py-3.5 px-4 uppercase text-slate-400 print:text-black" colSpan={selectedClientId === "all" ? 3 : 2}>
                      TOTAIS CONSOLIDADOS DO PERÍODO
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-100 print:text-black">
                      {formatNumber(totalMonoPrinted)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-100 print:text-black">
                      {formatNumber(totalColorPrinted)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-cyan-400 print:text-black">
                      {formatNumber(totalPrinted)}
                    </td>
                    {selectedClientId !== "all" && (
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400 print:text-black font-black">
                        {formatCurrency(totalRevenue)}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p className="text-[10px] text-slate-500 font-mono pt-4 text-center block print:text-black">
              Este é um documento de amostragem gerado para auditoria de consumo e conciliação de franquias de outsourcing de impressão de ativos.
            </p>
          </div>

          {/* SIGNATURE SECTION FOR COMPLIANCE (Only displays in printable PDF/Page) */}
          <div className="hidden print:block mt-20">
            <div className="grid grid-cols-2 gap-12 text-center text-[10px] pt-12 border-t border-slate-200">
              <div className="space-y-1">
                <div className="w-48 mx-auto border-b border-black"></div>
                <p className="font-bold">InfotechPE Outsourcing</p>
                <p className="text-slate-500">Representante Responsável</p>
              </div>
              <div className="space-y-1">
                <div className="w-48 mx-auto border-b border-black"></div>
                <p className="font-bold">{activeClientName}</p>
                <p className="text-slate-500">Gestor de Outsourcing / TI Contratante</p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
