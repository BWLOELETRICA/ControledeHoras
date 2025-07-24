export interface TimeRecord {
  data: string;
  codigo: string;
  nome: string;
  obra: string;
  cargo: string;
  entrada: string;
  saida: string;
  totalHoras: string;
  totalHorasDecimal: number;
}

// Dados mock para demonstração
export const mockTimeRecords: TimeRecord[] = [
  {
    data: "15/01/2024",
    codigo: "01",
    nome: "João Silva",
    obra: "Edifício Central",
    cargo: "Eletricista",
    entrada: "08:00:00",
    saida: "17:00:00",
    totalHoras: "09:00:00",
    totalHorasDecimal: 9.0
  },
  {
    data: "15/01/2024",
    codigo: "02",
    nome: "Maria Santos",
    obra: "Residencial Jardins",
    cargo: "Administrativo",
    entrada: "08:30:00",
    saida: "17:30:00",
    totalHoras: "09:00:00",
    totalHorasDecimal: 9.0
  },
  {
    data: "15/01/2024",
    codigo: "03",
    nome: "Pedro Costa",
    obra: "Edifício Central",
    cargo: "Ajudante",
    entrada: "07:00:00",
    saida: "16:00:00",
    totalHoras: "09:00:00",
    totalHorasDecimal: 9.0
  },
  {
    data: "16/01/2024",
    codigo: "01",
    nome: "João Silva",
    obra: "Edifício Central",
    cargo: "Eletricista",
    entrada: "08:00:00",
    saida: "18:00:00",
    totalHoras: "10:00:00",
    totalHorasDecimal: 10.0
  },
  {
    data: "16/01/2024",
    codigo: "02",
    nome: "Maria Santos",
    obra: "Shopping Plaza",
    cargo: "Administrativo",
    entrada: "08:30:00",
    saida: "17:30:00",
    totalHoras: "09:00:00",
    totalHorasDecimal: 9.0
  },
  {
    data: "16/01/2024",
    codigo: "04",
    nome: "Ana Oliveira",
    obra: "Residencial Jardins",
    cargo: "Engenheira",
    entrada: "09:00:00",
    saida: "18:00:00",
    totalHoras: "09:00:00",
    totalHorasDecimal: 9.0
  },
  {
    data: "17/01/2024",
    codigo: "05",
    nome: "Carlos Ferreira",
    obra: "Shopping Plaza",
    cargo: "Pedreiro",
    entrada: "07:30:00",
    saida: "16:30:00",
    totalHoras: "09:00:00",
    totalHorasDecimal: 9.0
  },
  {
    data: "17/01/2024",
    codigo: "03",
    nome: "Pedro Costa",
    obra: "Edifício Central",
    cargo: "Ajudante",
    entrada: "07:00:00",
    saida: "17:00:00",
    totalHoras: "10:00:00",
    totalHorasDecimal: 10.0
  },
  {
    data: "18/01/2024",
    codigo: "06",
    nome: "Lucia Martins",
    obra: "Residencial Jardins",
    cargo: "Arquiteta",
    entrada: "08:00:00",
    saida: "17:00:00",
    totalHoras: "09:00:00",
    totalHorasDecimal: 9.0
  },
  {
    data: "18/01/2024",
    codigo: "01",
    nome: "João Silva",
    obra: "Shopping Plaza",
    cargo: "Eletricista",
    entrada: "08:00:00",
    saida: "17:30:00",
    totalHoras: "09:30:00",
    totalHorasDecimal: 9.5
  },
  {
    data: "19/01/2024",
    codigo: "07",
    nome: "Roberto Alves",
    obra: "Edifício Central",
    cargo: "Soldador",
    entrada: "07:00:00",
    saida: "16:00:00",
    totalHoras: "09:00:00",
    totalHorasDecimal: 9.0
  },
  {
    data: "19/01/2024",
    codigo: "02",
    nome: "Maria Santos",
    obra: "Residencial Jardins",
    cargo: "Administrativo",
    entrada: "08:30:00",
    saida: "18:30:00",
    totalHoras: "10:00:00",
    totalHorasDecimal: 10.0
  },
  {
    data: "20/01/2024",
    codigo: "08",
    nome: "Fernanda Lima",
    obra: "Shopping Plaza",
    cargo: "Pintora",
    entrada: "08:00:00",
    saida: "17:00:00",
    totalHoras: "09:00:00",
    totalHorasDecimal: 9.0
  },
  {
    data: "20/01/2024",
    codigo: "05",
    nome: "Carlos Ferreira",
    obra: "Edifício Central",
    cargo: "Pedreiro",
    entrada: "07:30:00",
    saida: "17:30:00",
    totalHoras: "10:00:00",
    totalHorasDecimal: 10.0
  }
];

export const getUniqueObras = () => {
  return Array.from(new Set(mockTimeRecords.map(record => record.obra)));
};

export const getUniqueCargos = () => {
  return Array.from(new Set(mockTimeRecords.map(record => record.cargo)));
};