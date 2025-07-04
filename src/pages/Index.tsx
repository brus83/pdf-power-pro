
import { useState } from 'react';
import { Upload, FileText, Languages, Sparkles, Download, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('convert');
  const [summary, setSummary] = useState('');
  const [translation, setTranslation] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [targetFormat, setTargetFormat] = useState('');

  const supportedFormats = [
    { value: 'pdf', label: 'PDF', accept: '.pdf' },
    { value: 'docx', label: 'Word (.docx)', accept: '.docx,.doc' },
    { value: 'pptx', label: 'PowerPoint (.pptx)', accept: '.pptx,.ppt' },
    { value: 'xlsx', label: 'Excel (.xlsx)', accept: '.xlsx,.xls' },
    { value: 'txt', label: 'Testo (.txt)', accept: '.txt' },
    { value: 'rtf', label: 'Rich Text (.rtf)', accept: '.rtf' },
    { value: 'odt', label: 'OpenDocument Text (.odt)', accept: '.odt' },
    { value: 'ods', label: 'OpenDocument Spreadsheet (.ods)', accept: '.ods' },
    { value: 'odp', label: 'OpenDocument Presentation (.odp)', accept: '.odp' },
    { value: 'html', label: 'HTML (.html)', accept: '.html,.htm' },
    { value: 'epub', label: 'eBook (.epub)', accept: '.epub' },
    { value: 'csv', label: 'CSV (.csv)', accept: '.csv' },
    { value: 'json', label: 'JSON (.json)', accept: '.json' },
    { value: 'xml', label: 'XML (.xml)', accept: '.xml' }
  ];

  const allAcceptedFormats = supportedFormats.map(f => f.accept).join(',');

  const getFileType = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    return supportedFormats.find(format => 
      format.accept.includes(`.${extension}`)
    )?.value || 'unknown';
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = getFileType(file.name);
      if (fileType !== 'unknown') {
        setUploadedFile(file);
        toast({
          title: "File caricato con successo!",
          description: `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        });
      } else {
        toast({
          title: "Formato non supportato",
          description: "Per favore carica un file in uno dei formati supportati",
          variant: "destructive",
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const fileType = getFileType(file.name);
      if (fileType !== 'unknown') {
        setUploadedFile(file);
        toast({
          title: "File caricato con successo!",
          description: `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        });
      }
    }
  };

  const simulateProcessing = async (action: string) => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    
    if (action === 'summary') {
      setSummary("Questo è un riassunto simulato del documento caricato. Il documento tratta di tecnologie innovative nel settore dell'intelligenza artificiale, con particolare focus su applicazioni pratiche nel business moderno. Include analisi di mercato, case studies e proiezioni future per il prossimo quinquennio.");
    } else if (action === 'translation') {
      setTranslation("This is a simulated translation of the uploaded document. The document discusses innovative technologies in the artificial intelligence sector, with particular focus on practical applications in modern business. It includes market analysis, case studies and future projections for the next five years.");
    }
    
    toast({
      title: "Operazione completata!",
      description: `${action} eseguito con successo`,
    });
  };

  const handleConvert = () => {
    if (!uploadedFile || !targetFormat) {
      toast({
        title: "Errore",
        description: "Per favore carica un file e seleziona il formato di destinazione",
        variant: "destructive",
      });
      return;
    }

    const sourceFormat = getFileType(uploadedFile.name);
    const targetFormatLabel = supportedFormats.find(f => f.value === targetFormat)?.label;
    
    toast({
      title: `Conversione avviata`,
      description: `Convertendo da ${sourceFormat.toUpperCase()} a ${targetFormatLabel}...`,
    });

    // Simula il processo di conversione
    setTimeout(() => {
      toast({
        title: "Conversione completata!",
        description: `File convertito in ${targetFormatLabel} con successo`,
      });
    }, 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiato!",
      description: "Testo copiato negli appunti",
    });
  };

  const currentFileType = uploadedFile ? getFileType(uploadedFile.name) : null;
  const availableFormats = supportedFormats.filter(format => format.value !== currentFileType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Universal File Converter Pro
              </h1>
              <p className="text-sm text-gray-600">Converti, Riassumi, Traduci qualsiasi formato</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Upload Section */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Carica il tuo file
            </CardTitle>
            <CardDescription>
              Supporta PDF, Word, PowerPoint, Excel, Testo, HTML, eBook e molti altri formati
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50/50"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">
                {uploadedFile ? uploadedFile.name : 'Trascina qui il tuo file o clicca per selezionare'}
              </p>
              <p className="text-sm text-gray-500 mb-2">
                {uploadedFile 
                  ? `Dimensione: ${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB - Tipo: ${getFileType(uploadedFile.name).toUpperCase()}`
                  : 'Formati supportati: PDF, DOCX, PPTX, XLSX, TXT, RTF, ODT, HTML, EPUB e altri'
                }
              </p>
              {uploadedFile && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg inline-block">
                  <p className="text-green-700 text-sm font-medium">✓ File caricato e pronto per la conversione</p>
                </div>
              )}
              <input
                id="file-upload"
                type="file"
                accept={allAcceptedFormats}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="convert" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Converti
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Riassunto
            </TabsTrigger>
            <TabsTrigger value="translation" className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              Traduzione
            </TabsTrigger>
          </TabsList>

          {/* Convert Tab */}
          <TabsContent value="convert">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <RefreshCw className="h-5 w-5" />
                  Conversione Universale
                </CardTitle>
                <CardDescription>
                  Converti il tuo file in qualsiasi formato supportato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">File caricato:</label>
                    <div className="p-3 bg-gray-50 border rounded-lg">
                      {uploadedFile ? (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{uploadedFile.name}</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {getFileType(uploadedFile.name).toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Nessun file caricato</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Converti in:</label>
                    <Select value={targetFormat} onValueChange={setTargetFormat}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona formato di destinazione" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {availableFormats.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Formati supportati:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {supportedFormats.map((format) => (
                      <div key={format.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <FileText className="h-3 w-3 text-gray-600" />
                        <span>{format.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleConvert}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={!uploadedFile || !targetFormat || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Conversione in corso...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Converti File
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Sparkles className="h-5 w-5" />
                  Riassunto Automatico
                </CardTitle>
                <CardDescription>
                  Genera un riassunto intelligente del tuo documento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => simulateProcessing('summary')}
                  disabled={!uploadedFile || isProcessing}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {isProcessing ? 'Analisi in corso...' : 'Genera Riassunto'}
                </Button>
                
                {summary && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">Riassunto:</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(summary)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copia
                      </Button>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Translation Tab */}
          <TabsContent value="translation">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Languages className="h-5 w-5" />
                  Traduzione Automatica
                </CardTitle>
                <CardDescription>
                  Traduci il documento in un'altra lingua
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">Traduci in:</label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona lingua" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="en">Inglese</SelectItem>
                        <SelectItem value="es">Spagnolo</SelectItem>
                        <SelectItem value="fr">Francese</SelectItem>
                        <SelectItem value="de">Tedesco</SelectItem>
                        <SelectItem value="pt">Portoghese</SelectItem>
                        <SelectItem value="ru">Russo</SelectItem>
                        <SelectItem value="zh">Cinese</SelectItem>
                        <SelectItem value="ja">Giapponese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={() => simulateProcessing('translation')}
                      disabled={!uploadedFile || !selectedLanguage || isProcessing}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      {isProcessing ? 'Traduzione...' : 'Traduci'}
                    </Button>
                  </div>
                </div>
                
                {translation && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">Traduzione:</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(translation)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copia
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Esporta
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{translation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
