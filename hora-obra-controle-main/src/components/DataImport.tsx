import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TimeRecord } from '@/data/mockData';
import * as XLSX from 'xlsx';

interface DataImportProps {
  onDataImported: (newRecords: TimeRecord[]) => void;
  onClose: () => void;
}

export function DataImport({ onDataImported, onClose }: DataImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<TimeRecord[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const isCSV = selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv');
      const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
      
      if (isCSV || isExcel) {
        setFile(selectedFile);
        setErrors([]);
        setPreviewData([]);
      } else {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo CSV ou Excel válido.",
          variant: "destructive",
        });
      }
    }
  };

  const timeToDecimal = (timeStr: string): number => {
    const [hours, minutes, seconds = 0] = timeStr.split(':').map(Number);
    return hours + minutes / 60 + seconds / 3600;
  };

  const parseExcel = (arrayBuffer: ArrayBuffer): TimeRecord[] => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    const newErrors: string[] = [];
    const records: TimeRecord[] = [];

    // Verificar se há dados suficientes
    if (data.length < 2) {
      newErrors.push('O arquivo deve ter pelo menos uma linha de cabeçalho e uma linha de dados');
      setErrors(newErrors);
      return [];
    }

    // Verificar se há colunas suficientes
    if (data[0].length < 8) {
      newErrors.push('O arquivo deve ter pelo menos 8 colunas na ordem: ID, Nome, Cargo, Obra, Data, Entrada, Saída, Total de Horas');
      setErrors(newErrors);
      return [];
    }

    for (let i = 1; i < data.length; i++) {
      try {
        const row = data[i];
        
        if (row.length < 8) {
          newErrors.push(`Linha ${i + 1}: Número insuficiente de colunas`);
          continue;
        }

        // Converter data do Excel se necessário
        let dataFormatada = row[4];
        if (typeof dataFormatada === 'number') {
          const excelDate = XLSX.SSF.parse_date_code(dataFormatada);
          dataFormatada = `${excelDate.d.toString().padStart(2, '0')}/${excelDate.m.toString().padStart(2, '0')}/${excelDate.y}`;
        }

        // Converter horários do Excel se necessário
        let entrada = row[5]?.toString() || '';
        let saida = row[6]?.toString() || '';
        let totalHoras = row[7]?.toString() || '';

        // Se horários estão em formato decimal do Excel, converter
        if (typeof row[5] === 'number' && row[5] < 1) {
          const hours = Math.floor(row[5] * 24);
          const minutes = Math.floor((row[5] * 24 - hours) * 60);
          entrada = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }

        if (typeof row[6] === 'number' && row[6] < 1) {
          const hours = Math.floor(row[6] * 24);
          const minutes = Math.floor((row[6] * 24 - hours) * 60);
          saida = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }

        // Se total de horas não foi fornecido ou está em formato decimal, calcular
        if (!totalHoras || typeof row[7] === 'number') {
          totalHoras = calculateHoursDifference(entrada, saida);
        }

        const record: TimeRecord = {
          codigo: row[0]?.toString() || '',
          nome: row[1]?.toString() || '',
          cargo: row[2]?.toString() || '',
          obra: row[3]?.toString() || '',
          data: dataFormatada?.toString() || '',
          entrada: entrada,
          saida: saida,
          totalHoras: totalHoras,
          totalHorasDecimal: timeToDecimal(totalHoras)
        };

        // Validações básicas
        if (!isValidDate(record.data)) {
          newErrors.push(`Linha ${i + 1}: Data inválida (${record.data})`);
          continue;
        }

        if (!isValidTime(record.entrada) || !isValidTime(record.saida)) {
          newErrors.push(`Linha ${i + 1}: Horário inválido`);
          continue;
        }

        records.push(record);
      } catch (error) {
        newErrors.push(`Linha ${i + 1}: Erro ao processar dados`);
      }
    }

    setErrors(newErrors);
    return records;
  };

  const parseCSV = (csvText: string): TimeRecord[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Mapear colunas esperadas na ordem: ID, Nome, Cargo, Obra, Data, Entrada, Saída, Total de Horas
    const columnMap = {
      codigo: 0,  // ID
      nome: 1,    // Nome
      cargo: 2,   // Cargo
      obra: 3,    // Obra
      data: 4,    // Data
      entrada: 5, // Entrada
      saida: 6,   // Saída
      totalHoras: 7 // Total de Horas
    };

    const newErrors: string[] = [];
    const records: TimeRecord[] = [];

    // Como agora usamos posições fixas, só verificamos se há colunas suficientes
    if (headers.length < 8) {
      newErrors.push('O arquivo deve ter pelo menos 8 colunas na ordem: ID, Nome, Cargo, Obra, Data, Entrada, Saída, Total de Horas');
      setErrors(newErrors);
      return [];
    }

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values.length < headers.length) {
          newErrors.push(`Linha ${i + 1}: Número insuficiente de colunas`);
          continue;
        }

        const totalHorasStr = columnMap.totalHoras !== -1 ? 
          values[columnMap.totalHoras] : 
          calculateHoursDifference(values[columnMap.entrada], values[columnMap.saida]);

        const record: TimeRecord = {
          data: values[columnMap.data],
          codigo: values[columnMap.codigo],
          nome: values[columnMap.nome],
          obra: values[columnMap.obra],
          cargo: values[columnMap.cargo],
          entrada: values[columnMap.entrada],
          saida: values[columnMap.saida],
          totalHoras: totalHorasStr,
          totalHorasDecimal: timeToDecimal(totalHorasStr)
        };

        // Validações básicas
        if (!isValidDate(record.data)) {
          newErrors.push(`Linha ${i + 1}: Data inválida (${record.data})`);
          continue;
        }

        if (!isValidTime(record.entrada) || !isValidTime(record.saida)) {
          newErrors.push(`Linha ${i + 1}: Horário inválido`);
          continue;
        }

        records.push(record);
      } catch (error) {
        newErrors.push(`Linha ${i + 1}: Erro ao processar dados`);
      }
    }

    setErrors(newErrors);
    return records;
  };

  const calculateHoursDifference = (entrada: string, saida: string): string => {
    const [entradaH, entradaM] = entrada.split(':').map(Number);
    const [saidaH, saidaM] = saida.split(':').map(Number);
    
    const entradaMinutes = entradaH * 60 + entradaM;
    const saidaMinutes = saidaH * 60 + saidaM;
    
    let diffMinutes = saidaMinutes - entradaMinutes;
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Caso passe da meia-noite
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };

  const isValidDate = (dateStr: string): boolean => {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(dateStr)) return false;
    
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  const isValidTime = (timeStr: string): boolean => {
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    return timeRegex.test(timeStr);
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      let parsedData: TimeRecord[] = [];
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Processar arquivo Excel
        const arrayBuffer = await file.arrayBuffer();
        setProgress(50);
        parsedData = parseExcel(arrayBuffer);
      } else {
        // Processar arquivo CSV
        const text = await file.text();
        setProgress(50);
        parsedData = parseCSV(text);
      }
      
      setProgress(80);

      if (parsedData.length > 0) {
        setPreviewData(parsedData);
        setProgress(100);
        
        toast({
          title: "Arquivo processado!",
          description: `${parsedData.length} registros encontrados. ${errors.length > 0 ? `${errors.length} erros encontrados.` : ''}`,
        });
      } else {
        toast({
          title: "Erro",
          description: "Nenhum registro válido encontrado no arquivo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao processar o arquivo. Verifique o formato.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const importData = () => {
    if (previewData.length > 0) {
      onDataImported(previewData);
      toast({
        title: "Sucesso!",
        description: `${previewData.length} registros importados com sucesso.`,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar Dados
              </CardTitle>
              <CardDescription>
                Importe dados de uma planilha CSV do Google Sheets
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload de arquivo */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Selecionar arquivo Excel ou CSV</Label>
              <div className="mt-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                />
              </div>
            </div>

            {file && (
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  Arquivo selecionado: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}

            {file && !previewData.length && (
              <Button onClick={processFile} disabled={isProcessing} className="w-full">
                {isProcessing ? "Processando..." : "Processar Arquivo"}
              </Button>
            )}

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  Processando arquivo... {progress}%
                </p>
              </div>
            )}
          </div>

          {/* Erros */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Erros encontrados:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                    {errors.slice(0, 10).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {errors.length > 10 && (
                      <li>... e mais {errors.length - 10} erros</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview dos dados */}
          {previewData.length > 0 && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {previewData.length} registros prontos para importação. 
                  {errors.length > 0 && ` ${errors.length} registros com erro foram ignorados.`}
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-3 border-b">
                  <h4 className="font-medium">Preview dos dados (primeiros 5 registros)</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Data</th>
                        <th className="p-2 text-left">Nome</th>
                        <th className="p-2 text-left">Obra</th>
                        <th className="p-2 text-left">Cargo</th>
                        <th className="p-2 text-left">Entrada</th>
                        <th className="p-2 text-left">Saída</th>
                        <th className="p-2 text-left">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((record, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{record.data}</td>
                          <td className="p-2">{record.nome}</td>
                          <td className="p-2">{record.obra}</td>
                          <td className="p-2">{record.cargo}</td>
                          <td className="p-2">{record.entrada}</td>
                          <td className="p-2">{record.saida}</td>
                          <td className="p-2">{record.totalHoras}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={importData} className="flex-1">
                  Importar {previewData.length} Registros
                </Button>
                <Button variant="outline" onClick={() => {
                  setPreviewData([]);
                  setFile(null);
                  setErrors([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Instruções */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Formato esperado do CSV:</h4>
            <p className="text-sm text-muted-foreground mb-2">
              O arquivo deve conter as seguintes colunas (na primeira linha):
            </p>
            <code className="text-xs bg-background p-2 rounded block">
              ID,Nome,Cargo,Obra,Data,Entrada,Saída,Total de Horas
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              • Data: formato DD/MM/AAAA<br/>
              • Entrada/Saída: formato HH:MM ou HH:MM:SS<br/>
              • Total de Horas: será calculado automaticamente se não fornecido
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}