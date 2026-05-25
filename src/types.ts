export interface Client {
  id: string;
  name: string;
  cnpj: string;
  contactName: string;
  email: string;
  phone: string;
  monoPricePerPage: number; // Cost per mono page for this client
  colorPricePerPage: number; // Cost per color page for this client
  reserveToners: number; // Reserve toners on-site for this client
  reserveDrums: number; // Reserve cylinders/drums on-site for this client
  createdAt: string;
  pageAllowance?: number; // Franchise page allowance limit across all printers
  fixedRentalFee?: number; // Base fixed rental contract price paying for the allowance
}

export interface Printer {
  id: string;
  serialNumber: string; // S/N
  brand: string;
  model: string;
  clientId: string | ""; // Associated Client (empty if in stock)
  location: string; // Department, floor etc.
  type: "mono" | "color";
  
  // Page counters
  initialCounterMono: number;
  initialCounterColor: number;
  currentCounterMono: number;
  currentCounterColor: number;

  // Toner Supply details
  tonerAutonomy: number; // Page life
  tonerPrinted: number; // Pages printed since last replacement
  lastTonerReplacementDate: string;

  // Drum / Cylinder details
  drumAutonomy: number; // Page life
  drumPrinted: number; // Pages printed since last replacement
  lastDrumReplacementDate: string;

  status: "active" | "maintenance" | "inactive";
  isDeleted?: boolean;
  createdAt: string;
  needsDrumReplacement?: boolean;
}

export interface MeterReading {
  id: string;
  printerId: string;
  date: string; // "YYYY-MM"
  monoCounter: number;
  colorCounter: number;
  monoConsumed: number; // Pages printed in this month/period
  colorConsumed: number; // Pages printed in this month/period
  amountCharged: number; // Calculated cost based on client price
  recordedAt: string; // Date of entry representation
}

export interface ReplacementLog {
  id: string;
  printerId: string;
  printerModel: string;
  printerSerial: string;
  clientName: string;
  supplyType: "toner" | "drum";
  autonomy: number;
  counterAtReplacement: number;
  date: string;
}

export interface SupplyInventoryItem {
  id: string;
  type: "toner" | "drum";
  brand: string;
  model: string;
  autonomy: number;
  stock: number; // Quantidade em estoque
  createdAt: string;
}

