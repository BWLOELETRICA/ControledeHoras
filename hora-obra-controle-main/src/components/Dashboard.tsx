import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';
import { 
  CalendarIcon, 
  Users, 
  Building2, 
  Clock, 
  Download,
  Filter,
  FileDown,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  TrendingUp,
  Upload,
  Plus
} from 'lucide-react';
import { format, parseISO, differenceInDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TimeRecord } from '@/data/mockData';
import { DataImport } from './DataImport';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

export function Dashboard() {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedObra, setSelectedObra] = useState<string>('all');
  const [selectedCargo, setSelectedCargo] = useState<string>('all');
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedObraChart, setSelectedObraChart] = useState<string>('all');
  const [showAllDetails, setShowAllDetails] = useState(false);
  const { toast } = useToast();

  const obras = useMemo(() => {
    return Array.from(new Set(timeRecords.map(record => record.obra)));
  }, [timeRecords]);

  const cargos = useMemo(() => {
    return Array.from(new Set(timeRecords.map(record => record.cargo)));
  }, [timeRecords]);

  // Filtrar dados com base nos filtros aplicados
  const filteredData = useMemo(() => {
    return timeRecords.filter(record => {
      const recordDate = parseDate(record.data);
      
      // Filtro de data
      if (dateFrom && recordDate < dateFrom) return false;
      if (dateTo && recordDate > dateTo) return false;
      
      // Filtro de obra
      if (selectedObra !== 'all' && record.obra !== selectedObra) return false;
      
      // Filtro de cargo
      if (selectedCargo !== 'all' && record.cargo !== selectedCargo) return false;
      
      return true;
    });
  }, [timeRecords, dateFrom, dateTo, selectedObra, selectedCargo]);

  // Função para converter data do formato DD/MM/AAAA para Date
  function parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Filtrar dados por obra selecionada no gráfico
  const chartFilteredData = useMemo(() => {
    if (selectedObraChart === 'all') return filteredData;
    return filteredData.filter(record => record.obra === selectedObraChart);
  }, [filteredData, selectedObraChart]);

  // Dados para gráfico de barras (horas por funcionário)
  const hoursPerEmployee = useMemo(() => {
    const employeeHours = chartFilteredData.reduce((acc, record) => {
      const key = `${record.codigo} - ${record.nome}`;
      if (!acc[key]) {
        acc[key] = { nome: key, horas: 0 };
      }
      acc[key].horas += record.totalHorasDecimal;
      return acc;
    }, {} as Record<string, { nome: string; horas: number }>);

    return Object.values(employeeHours)
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10); // Top 10
  }, [chartFilteredData]);

  // Dados para gráfico de pizza (percentual por obra) - apenas obras importadas
  const hoursPerObra = useMemo(() => {
    const obraHours = filteredData.reduce((acc, record) => {
      if (!acc[record.obra]) {
        acc[record.obra] = 0;
      }
      acc[record.obra] += record.totalHorasDecimal;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(obraHours).reduce((sum, hours) => sum + hours, 0);
    
    return Object.entries(obraHours).map(([obra, horas], index) => ({
      name: obra,
      value: horas,
      percentage: total > 0 ? ((horas / total) * 100).toFixed(1) : '0'
    }));
  }, [filteredData]);

  // Indicadores
  const totalHours = filteredData.reduce((sum, record) => sum + record.totalHorasDecimal, 0);
  const totalEmployees = new Set(filteredData.map(record => record.codigo)).size;
  const totalObras = new Set(filteredData.map(record => record.obra)).size;

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedObra('all');
    setSelectedCargo('all');
    setSelectedObraChart('all');
  };

  // Calcular dados detalhados por funcionário
  const employeeStats = useMemo(() => {
    const stats = filteredData.reduce((acc, record) => {
      const key = record.codigo;
      if (!acc[key]) {
        acc[key] = {
          codigo: record.codigo,
          nome: record.nome,
          cargo: record.cargo,
          obras: new Set(),
          totalHoras: 0,
          diasTrabalhados: new Set(),
          horasExtras: 0,
          registros: []
        };
      }
      
      acc[key].obras.add(record.obra);
      acc[key].totalHoras += record.totalHorasDecimal;
      acc[key].diasTrabalhados.add(record.data);
      acc[key].registros.push(record);
      
      // Considerar horas extras acima de 8h por dia
      if (record.totalHorasDecimal > 8) {
        acc[key].horasExtras += (record.totalHorasDecimal - 8);
      }
      
      return acc;
    }, {} as Record<string, {
      codigo: string;
      nome: string;
      cargo: string;
      obras: Set<string>;
      totalHoras: number;
      diasTrabalhados: Set<string>;
      horasExtras: number;
      registros: TimeRecord[];
    }>);

    return Object.values(stats).map(stat => ({
      ...stat,
      obras: Array.from(stat.obras),
      diasTrabalhados: stat.diasTrabalhados.size,
      mediaDiaria: stat.totalHoras / stat.diasTrabalhados.size,
      diasSemRegistro: dateFrom && dateTo ? 
        differenceInDays(dateTo, dateFrom) + 1 - stat.diasTrabalhados.size : 0
    }));
  }, [filteredData, dateFrom, dateTo]);

  // Ranking de produtividade
  const produtividade = useMemo(() => {
    return employeeStats
      .sort((a, b) => b.totalHoras - a.totalHoras)
      .map((emp, index) => ({ ...emp, ranking: index + 1 }));
  }, [employeeStats]);

  // Funcionários com baixa carga (menos de 40h no período) - filtrados por obra se selecionada
  const baixaCarga = useMemo(() => {
    const baseStats = selectedObraChart === 'all' ? employeeStats : 
      employeeStats.filter(emp => emp.obras.includes(selectedObraChart));
    return baseStats.filter(emp => emp.totalHoras < 40);
  }, [employeeStats, selectedObraChart]);

  const exportToCsv = () => {
    const headers = ['Nome', 'Cargo', 'Obra', 'Data', 'Total Horas'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(record => 
        [record.nome, record.cargo, record.obra, record.data, record.totalHorasDecimal].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-horas.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateEmployeePDF = (employeeData: typeof employeeStats[0]) => {
    const doc = new jsPDF();
    
    // Configuração de cores
    const primaryColor = [59, 130, 246]; // Azul
    const secondaryColor = [16, 185, 129]; // Verde
    const grayColor = [107, 114, 128]; // Cinza
    
    // Cabeçalho com design melhorado
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE HORAS TRABALHADAS', 105, 18, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const periodo = dateFrom && dateTo ? 
      `Período: ${format(dateFrom, 'dd/MM/yyyy')} a ${format(dateTo, 'dd/MM/yyyy')}` : 
      'Período: Completo';
    doc.text(periodo, 105, 28, { align: 'center' });
    
    // Reset da cor do texto
    doc.setTextColor(0, 0, 0);
    
    // Informações do funcionário - Layout em caixas
    doc.setFillColor(245, 247, 250);
    doc.rect(15, 50, 180, 35, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO FUNCIONÁRIO', 20, 62);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID: ${employeeData.codigo} - ${employeeData.nome}`, 20, 72);
    doc.text(`Cargo: ${employeeData.cargo}`, 20, 80);
    doc.text(`Obra(s): ${employeeData.obras.join(', ')}`, 20, 88);
    
    // Resumo estatístico em grid
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(15, 95, 180, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO ESTATÍSTICO', 20, 101);
    
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(250, 252, 255);
    doc.rect(15, 103, 180, 25, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de horas: ${employeeData.totalHoras.toFixed(1)}h`, 20, 112);
    doc.text(`Dias trabalhados: ${employeeData.diasTrabalhados}`, 105, 112);
    doc.text(`Média diária: ${employeeData.mediaDiaria.toFixed(1)}h/dia`, 20, 120);
    doc.text(`Horas extras: ${employeeData.horasExtras.toFixed(1)}h`, 105, 120);
    doc.text(`Dias sem registro: ${employeeData.diasSemRegistro}`, 20, 126);
    
    // Tabela de registros com design melhorado
    const tableData = employeeData.registros.map(record => [
      record.data,
      record.entrada,
      record.saida,
      `${record.totalHorasDecimal.toFixed(1)}h`,
      record.obra
    ]);
    
    (doc as any).autoTable({
      startY: 135,
      head: [['Data', 'Entrada', 'Saída', 'Total Horas', 'Obra']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: primaryColor,
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 15, right: 15 }
    });
    
    // Rodapé com design melhorado
    const finalY = (doc as any).lastAutoTable.finalY || 200;
    
    doc.setFillColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.rect(0, finalY + 15, 210, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Relatório gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, finalY + 25);
    doc.text(`Código: REL-${employeeData.codigo}-${Date.now()}`, 20, finalY + 30);
    
    // Download
    doc.save(`relatorio-${employeeData.codigo}-${employeeData.nome.replace(/\s+/g, '-')}.pdf`);
  };

  const generateAllReports = () => {
    if (employeeStats.length === 0) {
      toast({
        title: "Nenhum funcionário encontrado",
        description: "Importe dados primeiro para gerar relatórios.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Gerando relatórios...",
      description: `Preparando ${employeeStats.length} relatórios para download.`,
    });

    employeeStats.forEach((employee, index) => {
      setTimeout(() => {
        generateEmployeePDF(employee);
        if (index === employeeStats.length - 1) {
          setTimeout(() => {
            toast({
              title: "Relatórios concluídos!",
              description: `${employeeStats.length} relatórios foram gerados.`,
            });
          }, 500);
        }
      }, index * 1000); // Delay de 1 segundo entre cada PDF
    });
  };

  const handleDataImport = (newRecords: TimeRecord[]) => {
    setTimeRecords(newRecords); // Substitui todos os dados pelos novos
    toast({
      title: "Dados importados!",
      description: `${newRecords.length} registros foram carregados.`,
    });
  };

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <div className="bg-primary p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-primary-foreground">
            Dashboard de Controle de Horas
          </h1>
          <p className="text-primary-foreground/80 mt-2">
            Acompanhe as horas trabalhadas por funcionários e obras
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Filtro de data inicial */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro de data final */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro de obra */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Obra</label>
                <Select value={selectedObra} onValueChange={setSelectedObra}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as obras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as obras</SelectItem>
                    {obras.map(obra => (
                      <SelectItem key={obra} value={obra}>{obra}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de cargo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cargo</label>
                <Select value={selectedCargo} onValueChange={setSelectedCargo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os cargos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os cargos</SelectItem>
                    {cargos.map(cargo => (
                      <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão limpar filtros */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-transparent">Ações</label>
                <Button 
                  onClick={clearFilters} 
                  variant="outline" 
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Horas</p>
                  <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Funcionários Ativos</p>
                  <p className="text-2xl font-bold">{totalEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Obras Ativas</p>
                  <p className="text-2xl font-bold">{totalObras}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Funcionários com baixa carga e Ranking de produtividade */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                Funcionários com Baixa Carga
              </CardTitle>
              <CardDescription>
                {baixaCarga.length > 0 ? `${baixaCarga.length} funcionário(s) com menos de 40h no período` : 'Nenhum funcionário com baixa carga encontrado'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {baixaCarga.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Todos os funcionários estão com carga adequada
                </p>
              ) : (
                <div className="space-y-2">
                  {baixaCarga.map((emp) => (
                    <div key={emp.codigo} className="flex justify-between items-center">
                      <span className="text-sm">{emp.codigo} - {emp.nome}</span>
                      <Badge variant="outline" className="text-warning border-warning">
                        {emp.totalHoras.toFixed(1)}h
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Ranking de Produtividade
                </CardTitle>
                <CardDescription>
                  Top funcionários por horas trabalhadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {produtividade.slice(0, 5).map((emp) => (
                    <div key={emp.codigo} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant={emp.ranking <= 3 ? 'default' : 'secondary'}>
                          #{emp.ranking}
                        </Badge>
                        <span className="text-sm">{emp.codigo} - {emp.nome}</span>
                      </div>
                      <span className="text-sm font-mono">{emp.totalHoras.toFixed(1)}h</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>



        {/* Gráficos - Movidos para cima */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de barras */}
          <Card>
            <CardHeader>
              <CardTitle>Horas por Funcionário</CardTitle>
              <CardDescription>
                Total de horas trabalhadas {selectedObraChart !== 'all' ? `na obra: ${selectedObraChart}` : 'no período'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={hoursPerEmployee}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="nome" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}h`, 'Horas']}
                  />
                  <Bar dataKey="horas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de pizza com filtro clicável */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Obra</CardTitle>
              <CardDescription>
                Clique em uma obra para filtrar funcionários
              </CardDescription>
              <div className="flex gap-2 mt-2">
                <Select value={selectedObraChart} onValueChange={setSelectedObraChart}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Obras</SelectItem>
                    {obras.map((obra) => (
                      <SelectItem key={obra} value={obra}>{obra}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={hoursPerObra}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    onClick={(data) => {
                      setSelectedObraChart(selectedObraChart === data.name ? 'all' : data.name);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {hoursPerObra.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={selectedObraChart === entry.name ? CHART_COLORS[0] : CHART_COLORS[index % CHART_COLORS.length]}
                        stroke={selectedObraChart === entry.name ? '#000' : 'none'}
                        strokeWidth={selectedObraChart === entry.name ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}h`, 'Horas']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Relatórios PDF */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios PDF por Funcionário
            </CardTitle>
            <CardDescription>
              Selecione funcionários e gere relatórios individuais ou todos de uma vez
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-4">
              <Button 
                onClick={generateAllReports} 
                className="w-full"
                disabled={employeeStats.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Gerar Todos os Relatórios ({employeeStats.length} PDFs)
              </Button>
              
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar funcionários específicos" />
                </SelectTrigger>
                <SelectContent>
                  {employeeStats.map((employee) => (
                    <SelectItem 
                      key={employee.codigo} 
                      value={employee.codigo}
                      onClick={() => generateEmployeePDF(employee)}
                    >
                      {employee.codigo} - {employee.nome} ({employee.totalHoras.toFixed(1)}h)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela detalhada com show more/less */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Detalhamento de Horas</CardTitle>
              <CardDescription>
                Registros detalhados do período ({filteredData.length} registros)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowImportModal(true)} 
                variant="default" 
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Dados
              </Button>
              <Button onClick={exportToCsv} variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllDetails(!showAllDetails)}
              >
                {showAllDetails ? 'Mostrar Menos' : 'Mostrar Tudo'}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID - Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showAllDetails ? filteredData : filteredData.slice(0, 10)).map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{record.codigo} - {record.nome}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{record.cargo}</Badge>
                      </TableCell>
                      <TableCell>{record.obra}</TableCell>
                      <TableCell>{record.data}</TableCell>
                      <TableCell className="text-right font-mono">
                        {record.totalHorasDecimal.toFixed(1)}h
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!showAllDetails && filteredData.length > 10 && (
                <div className="text-center text-muted-foreground text-sm mt-4">
                  Mostrando 10 de {filteredData.length} registros
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de importação */}
      {showImportModal && (
        <DataImport 
          onDataImported={handleDataImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}