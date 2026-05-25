import { Client, Printer, MeterReading, ReplacementLog, SupplyInventoryItem } from "../types";

export const INITIAL_CLIENTS: Client[] = [
  {
    id: "cli_1",
    name: "Clínica Saúde & Vida - Recife",
    cnpj: "12.345.678/0001-90",
    contactName: "Mariana Alencar",
    email: "financeiro@saudevidarecife.com",
    phone: "(81) 98765-4321",
    monoPricePerPage: 0.12, // R$ 0,12 por página mono
    colorPricePerPage: 0.55, // R$ 0,55 por página colorida
    reserveToners: 3,
    reserveDrums: 1,
    createdAt: "2026-01-10T10:00:00Z",
    pageAllowance: 3000,
    fixedRentalFee: 350.00
  },
  {
    id: "cli_2",
    name: "Colégio Anglo Nordeste - Caruaru",
    cnpj: "98.765.432/0001-21",
    contactName: "Roberto Barbosa",
    email: "suprimentos@anglocaruaru.edu.br",
    phone: "(81) 3721-9988",
    monoPricePerPage: 0.08, // R$ 0,08 por página mono (alto volume)
    colorPricePerPage: 0.45, // R$ 0,45 por página colorida
    reserveToners: 5,
    reserveDrums: 2,
    createdAt: "2026-01-15T14:30:00Z"
  },
  {
    id: "cli_3",
    name: "TechHub Softwares - Jaboatão",
    cnpj: "45.890.112/0001-50",
    contactName: "Arthur Mendonça",
    email: "infra@techhubpe.com.br",
    phone: "(81) 99122-3344",
    monoPricePerPage: 0.15,
    colorPricePerPage: 0.60,
    reserveToners: 2,
    reserveDrums: 0,
    createdAt: "2026-02-01T09:12:00Z"
  }
];

export const INITIAL_PRINTERS: Printer[] = [
  {
    id: "pri_1",
    serialNumber: "HP-M404-98A72B",
    brand: "HP",
    model: "LaserJet Pro M404dw",
    clientId: "cli_1",
    location: "Recepção Principal",
    type: "mono",
    initialCounterMono: 15400,
    initialCounterColor: 0,
    currentCounterMono: 17850,
    currentCounterColor: 0,
    tonerAutonomy: 10000,
    tonerPrinted: 2450, // 24.5% consumed -> safety margin details in UI
    lastTonerReplacementDate: "2026-04-12",
    drumAutonomy: 30000,
    drumPrinted: 2450,
    lastDrumReplacementDate: "2026-04-12",
    status: "active",
    createdAt: "2026-01-11T11:00:00Z"
  },
  {
    id: "pri_2",
    serialNumber: "BRO-L5652-33D4F",
    brand: "Brother",
    model: "MFC-L5652DN",
    clientId: "cli_1",
    location: "Faturamento / Adm",
    type: "mono",
    initialCounterMono: 32200,
    initialCounterColor: 0,
    currentCounterMono: 41800,
    currentCounterColor: 0,
    tonerAutonomy: 8000,
    tonerPrinted: 7100, // 88.75% consumed! In 10% safety area (>=90% usage matches margin warning)
    lastTonerReplacementDate: "2026-03-05",
    drumAutonomy: 50000,
    drumPrinted: 9600,
    lastDrumReplacementDate: "2026-01-11",
    status: "active",
    createdAt: "2026-01-11T12:00:00Z"
  },
  {
    id: "pri_3",
    serialNumber: "KY-M2040-10C29",
    brand: "Kyocera",
    model: "ECOSYS M2040dn",
    clientId: "cli_2",
    location: "Secretaria Acadêmica",
    type: "mono",
    initialCounterMono: 8500,
    initialCounterColor: 0,
    currentCounterMono: 18900,
    currentCounterColor: 0,
    tonerAutonomy: 7200,
    tonerPrinted: 3200,
    lastTonerReplacementDate: "2026-04-20",
    drumAutonomy: 100000,
    drumPrinted: 10400,
    lastDrumReplacementDate: "2026-01-15",
    status: "active",
    createdAt: "2026-01-16T15:00:00Z"
  },
  {
    id: "pri_4",
    serialNumber: "EPS-C5790-X92F1",
    brand: "Epson",
    model: "WorkForce Pro WF-C5790",
    clientId: "cli_2",
    location: "Diretoria",
    type: "color",
    initialCounterMono: 4300,
    initialCounterColor: 2100,
    currentCounterMono: 8400,
    currentCounterColor: 4900,
    tonerAutonomy: 10000, // For simple color we use averaged single autonomy value in pages
    tonerPrinted: 2800,
    lastTonerReplacementDate: "2026-05-01",
    drumAutonomy: 50000,
    drumPrinted: 6900,
    lastDrumReplacementDate: "2026-01-16",
    status: "active",
    createdAt: "2026-01-16T16:00:00Z"
  },
  {
    id: "pri_5",
    serialNumber: "HP-C250-7718A",
    brand: "HP",
    model: "Color LaserJet Pro MFP M283fdw",
    clientId: "cli_3",
    location: "Sala de Reuniões / Design",
    type: "color",
    initialCounterMono: 1000,
    initialCounterColor: 800,
    currentCounterMono: 2200,
    currentCounterColor: 1950,
    tonerAutonomy: 3000,
    tonerPrinted: 1150,
    lastTonerReplacementDate: "2026-04-05",
    drumAutonomy: 15000,
    drumPrinted: 2350,
    lastDrumReplacementDate: "2026-02-01",
    status: "active",
    createdAt: "2026-02-01T10:00:00Z"
  },
  {
    id: "pri_6",
    serialNumber: "BRO-L5652-PENDING",
    brand: "Brother",
    model: "MFC-L5652DN",
    clientId: "", // In Stock / Available
    location: "Manutenção / Laboratório",
    type: "mono",
    initialCounterMono: 145000,
    initialCounterColor: 0,
    currentCounterMono: 145000,
    currentCounterColor: 0,
    tonerAutonomy: 8000,
    tonerPrinted: 0,
    lastTonerReplacementDate: "2026-05-15",
    drumAutonomy: 50000,
    drumPrinted: 0,
    lastDrumReplacementDate: "2026-05-15",
    status: "maintenance",
    createdAt: "2026-05-15T09:00:00Z"
  }
];

export const INITIAL_READINGS: MeterReading[] = [
  // Jan/Feb Readings for pri_1
  {
    id: "read_1",
    printerId: "pri_1",
    date: "2026-02",
    monoCounter: 16000,
    colorCounter: 0,
    monoConsumed: 600, // 16000 - 15400
    colorConsumed: 0,
    amountCharged: 72.00, // 600 * R$ 0.12
    recordedAt: "2026-02-28T18:00:00Z"
  },
  {
    id: "read_2",
    printerId: "pri_2",
    date: "2026-02",
    monoCounter: 35000,
    colorCounter: 0,
    monoConsumed: 2800, // 35000 - 32200
    colorConsumed: 0,
    amountCharged: 336.00, // 2800 * R$ 0.12
    recordedAt: "2026-02-28T18:10:00Z"
  },
  {
    id: "read_3",
    printerId: "pri_3",
    date: "2026-02",
    monoCounter: 11000,
    colorCounter: 0,
    monoConsumed: 2500, // 11000 - 8500
    colorConsumed: 0,
    amountCharged: 200.00, // 2500 * R$ 0.08
    recordedAt: "2026-02-28T18:15:00Z"
  },
  {
    id: "read_4",
    printerId: "pri_4",
    date: "2026-02",
    monoCounter: 5500,
    colorCounter: 2900,
    monoConsumed: 1200, // 5500 - 4300
    colorConsumed: 800, // 2900 - 2100
    amountCharged: 456.00, // (1200 * 0.08) + (800 * 0.45) = 96 + 360 = 456
    recordedAt: "2026-02-28T18:20:00Z"
  },

  // March readings
  {
    id: "read_5",
    printerId: "pri_1",
    date: "2026-03",
    monoCounter: 16800,
    colorCounter: 0,
    monoConsumed: 800,
    colorConsumed: 0,
    amountCharged: 96.00,
    recordedAt: "2026-03-31T18:00:00Z"
  },
  {
    id: "read_6",
    printerId: "pri_2",
    date: "2026-03",
    monoCounter: 38200,
    colorCounter: 0,
    monoConsumed: 3200,
    colorConsumed: 0,
    amountCharged: 384.00,
    recordedAt: "2026-03-31T18:05:00Z"
  },
  {
    id: "read_7",
    printerId: "pri_3",
    date: "2026-03",
    monoCounter: 13500,
    colorCounter: 0,
    monoConsumed: 2500,
    colorConsumed: 0,
    amountCharged: 200.00,
    recordedAt: "2026-03-31T18:10:00Z"
  },
  {
    id: "read_8",
    printerId: "pri_4",
    date: "2026-03",
    monoCounter: 6800,
    colorCounter: 3600,
    monoConsumed: 1300,
    colorConsumed: 700,
    amountCharged: 419.00, // (1300 * 0.08) + (700 * 0.45) = 104 + 315
    recordedAt: "2026-03-31T18:15:00Z"
  },

  // April readings
  {
    id: "read_9",
    printerId: "pri_1",
    date: "2026-04",
    monoCounter: 17400,
    colorCounter: 0,
    monoConsumed: 600,
    colorConsumed: 0,
    amountCharged: 72.00,
    recordedAt: "2026-04-30T18:00:00Z"
  },
  {
    id: "read_10",
    printerId: "pri_2",
    date: "2026-04",
    monoCounter: 40500,
    colorCounter: 0,
    monoConsumed: 2300,
    colorConsumed: 0,
    amountCharged: 276.00,
    recordedAt: "2026-04-30T18:05:00Z"
  },
  {
    id: "read_11",
    printerId: "pri_3",
    date: "2026-04",
    monoCounter: 16500,
    colorCounter: 0,
    monoConsumed: 3000,
    colorConsumed: 0,
    amountCharged: 240.00,
    recordedAt: "2026-04-30T18:10:00Z"
  },
  {
    id: "read_12",
    printerId: "pri_4",
    date: "2026-04",
    monoCounter: 7700,
    colorCounter: 4300,
    monoConsumed: 900,
    colorConsumed: 700,
    amountCharged: 387.00, // (900 * 0.08) + (700 * 0.45) = 72 + 315
    recordedAt: "2026-04-30T18:15:00Z"
  },
  {
    id: "read_13",
    printerId: "pri_5",
    date: "2026-04",
    monoCounter: 1800,
    colorCounter: 1550,
    monoConsumed: 800, // 1800 - 1000
    colorConsumed: 750, // 1550 - 800
    amountCharged: 570.00, // 800 * 0.15 + 750 * 0.60 = 120 + 450 = 570
    recordedAt: "2026-04-30T18:20:00Z"
  },

  // May readings (Current Month partial)
  {
    id: "read_14",
    printerId: "pri_1",
    date: "2026-05",
    monoCounter: 17850,
    colorCounter: 0,
    monoConsumed: 450,
    colorConsumed: 0,
    amountCharged: 54.00,
    recordedAt: "2026-05-20T14:00:00Z"
  },
  {
    id: "read_15",
    printerId: "pri_2",
    date: "2026-05",
    monoCounter: 41800,
    colorCounter: 0,
    monoConsumed: 1300,
    colorConsumed: 0,
    amountCharged: 156.00,
    recordedAt: "2026-05-20T14:05:00Z"
  },
  {
    id: "read_16",
    printerId: "pri_3",
    date: "2026-05",
    monoCounter: 18900,
    colorCounter: 0,
    monoConsumed: 2400,
    colorConsumed: 0,
    amountCharged: 192.00,
    recordedAt: "2026-05-20T14:10:00Z"
  },
  {
    id: "read_17",
    printerId: "pri_4",
    date: "2026-05",
    monoCounter: 8400,
    colorCounter: 4900,
    monoConsumed: 700,
    colorConsumed: 600,
    amountCharged: 326.00, // (700 * 0.08) + (600 * 0.45) = 56 + 270 = 326
    recordedAt: "2026-05-20T14:15:00Z"
  },
  {
    id: "read_18",
    printerId: "pri_5",
    date: "2026-05",
    monoCounter: 2200,
    colorCounter: 1950,
    monoConsumed: 400,
    colorConsumed: 400,
    amountCharged: 300.00, // (400 * 0.15) + (400 * 0.60) = 60 + 240 = 300
    recordedAt: "2026-05-20T14:20:00Z"
  }
];

export const INITIAL_REPLACEMENTS: ReplacementLog[] = [
  {
    id: "rep_1",
    printerId: "pri_1",
    printerModel: "LaserJet Pro M404dw",
    printerSerial: "HP-M404-98A72B",
    clientName: "Clínica Saúde & Vida - Recife",
    supplyType: "toner",
    autonomy: 10000,
    counterAtReplacement: 15400,
    date: "2026-04-12"
  },
  {
    id: "rep_2",
    printerId: "pri_2",
    printerModel: "MFC-L5652DN",
    printerSerial: "BRO-L5652-33D4F",
    clientName: "Clínica Saúde & Vida - Recife",
    supplyType: "toner",
    autonomy: 8000,
    counterAtReplacement: 34700,
    date: "2026-03-05"
  }
];

export const INITIAL_SUPPLIES_INVENTORY: SupplyInventoryItem[] = [
  {
    id: "sup_1",
    type: "toner",
    brand: "HP",
    model: "CF226X (M404/M428)",
    autonomy: 10000,
    stock: 4,
    createdAt: "2026-01-11T12:00:00Z"
  },
  {
    id: "sup_2",
    type: "toner",
    brand: "Brother",
    model: "TN-3472 (L5652/L6902)",
    autonomy: 8000,
    stock: 7,
    createdAt: "2026-01-11T12:00:00Z"
  },
  {
    id: "sup_3",
    type: "drum",
    brand: "Brother",
    model: "DR-3440 (L5652)",
    autonomy: 50000,
    stock: 2,
    createdAt: "2026-01-11T12:00:00Z"
  },
  {
    id: "sup_4",
    type: "toner",
    brand: "Kyocera",
    model: "TK-1175 (M2040)",
    autonomy: 7200,
    stock: 5,
    createdAt: "2026-01-11T12:00:00Z"
  }
];

