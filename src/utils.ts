import { Printer } from "./types";

// Format currency in BRL (R$)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Format numbers
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

// Format ISO date to BR date (DD/MM/YYYY)
export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  // Check if it's "YYYY-MM"
  if (dateStr.length === 7) {
    const [year, month] = dateStr.split("-");
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${months[parseInt(month, 10) - 1]} / ${year}`;
  }
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Manual split parsing for "YYYY-MM-DD"
      const parts = dateStr.split("T")[0].split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    }
    return new Intl.DateTimeFormat("pt-BR").format(date);
  } catch (e) {
    return dateStr;
  }
}

// Calculate remaining percentages for supplies
// autonomy: total page yield
// printed: pages printed since last replacement
export function calculateSupplyStatus(autonomy: number, printed: number) {
  const remainingPages = Math.max(0, autonomy - printed);
  
  // Calculate raw percentage remaining
  const percentage = Math.max(0, Math.min(100, Math.round((remainingPages / autonomy) * 100)));
  
  // 10% safety margin check (safety buffer)
  // When printed exceeds 90% of autonomy (remaining is 10% or below), we are in the safety margin area
  const isWithinSafetyMargin = percentage <= 10;
  
  // Reached target recommended change page limit limit which is 90%
  const recommendedMaxPrinted = Math.round(autonomy * 0.9);
  const remainingToSafetyMargin = Math.max(0, recommendedMaxPrinted - printed);

  return {
    percentage,
    remainingPages,
    isWithinSafetyMargin,
    recommendedMaxPages: recommendedMaxPrinted,
    remainingToSafetyMargin
  };
}
