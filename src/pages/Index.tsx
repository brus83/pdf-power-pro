import { useState } from 'react';
import { Upload, FileText, Languages, Sparkles, Download, Copy, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { convertFile, translateDocument, summarizeDocument, mergePdfs, splitPdf } from '@/services/fileService';
import { downloadFile } from '@/lib/fileUtils';

const Index = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('convert');
  const [summary, setSummary] = useState('');
  const [translation, setTranslation] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [targetFormat, setTargetFormat] = useState('');
  const [convertedFileUrl, setConvertedFileUrl] = useState<string | null>(null);
  const [convertedFileName, setConvertedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [splitPages, setSplitPages] = useState('');
  const [splitType, setSplitType] = useState<'pages' | 'range'>('pages');

  const supportedFormats = [
    { value: 'pdf', label: 'PDF', accept: '.pdf' },
    { value: 'docx', label: 'Word (.docx)', accept: '.docx,.doc' },
    { value: 'pptx', label: 'PowerPoint (.pptx)', accept: '.pptx,.ppt' },
    { value: 'xlsx', label: 'Excel (.xlsx)', accept: '.xlsx,.xls' },
    { value: 'txt', label: 'Testo (.txt)', accept: '.txt' },
    { value: 'html', label: 'HTML (.html)', accept: '.html,.htm' },
    { value: 'csv', label: 'CSV (.csv)', accept: '.csv' },
    { value: 'json', label: 'JSON (.json)', accept: '.json' },
    { value: 'xml', label: 'XML (.xml)', accept: '.xml' },
    { value: 'jpg', label: 'JPEG (.jpg)', accept: '.jpg,.jpeg' },
    { value: 'png', label: 'PNG (.png)', accept: '.png' },
    { value: 'gif', label: 'GIF (.gif)', accept: '.gif' },
    { value: 'bmp', label: 'BMP (.bmp)', accept: '.bmp' },
    { value: 'tiff', label: 'TIFF (.tiff,.tif)', accept: '.tiff,.tif' },
    { value: 'webp', label: 'WebP (.webp)', accept: '.webp' },
    { value: 'rtf', label: 'RTF (.rtf)', accept: '.rtf' },
    { value: 'odt', label: 'OpenDocument Text (.odt)', accept: '.odt' },
    { value: 'ods', label: 'OpenDocument Spreadsheet (.ods)', accept: '.ods' },
    { value: 'odp', label: 'OpenDocument Presentation (.odp)', accept: '.odp' }
  ];

  const languages = [
    { value: 'it', label: 'Italiano' },
    { value: 'en', label: 'Inglese' },
    { value: 'es', label: 'Spagnolo' },
    { value: 'fr', label: 'Francese' },
    { value: 'de', label: 'Tedesco' },
    { value: 'pt', label: 'Portoghese' },
    { value: 'ru', label: 'Russo' },
    { value: 'zh', label: 'Cinese' },
    { value: 'ja', label: 'Giapponese' }
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
      // Controllo dimensione file (100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File troppo grande",
          description: "Il file non può superare i 100MB",
          variant: "destructive",
        });
        return;
      }

      const fileType = getFileType(file.name);
      if (fileType !== 'unknown') {
        setUploadedFile(file);
        setError(null);
        setConvertedFileUrl(null);
        setConvertedFileName(null);
        setSummary('');
        setTranslation('');
        setConversionProgress(0);
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
        setError(null);
        toast({
          title: "File caricato con successo!",
          description: `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        });
      }
    }
  };

  const handleConvert = async () => {
    if (!uploadedFile || !targetFormat) {
      toast({
        title: "Errore",
        description: "Per favore carica un file e seleziona il formato di destinazione",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setError(null);
    setConversionProgress(0);
    
    toast({
      title: "Conversione avviata",
      description: "Stiamo convertendo il tuo file... Questo potrebbe richiedere alcuni minuti per file grandi.",
    });

    // Simula progresso durante la conversione
    const progressInterval = setInterval(() => {
      setConversionProgress(prev => {
        if (prev < 90) return prev + 10;
        return prev;
      });
    }, 3000);

    try {
      const result = await convertFile(uploadedFile, targetFormat);
      clearInterval(progressInterval);
      setConversionProgress(100);
      
      if (result.success && result.downloadUrl && result.filename) {
        setConvertedFileUrl(result.downloadUrl);
        setConvertedFileName(result.filename);
        toast({
          title: "Conversione completata!",
          description: `File convertito con successo in ${targetFormat.toUpperCase()}`,
        });
      } else {
        setError(result.error || 'Errore durante la conversione');
        toast({
          title: "Errore conversione",
          description: result.error || 'Errore durante la conversione',
          variant: "destructive",
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (convertedFileUrl && convertedFileName) {
      try {
        if (convertedFileUrl.startsWith('data:')) {
          // File base64
          const response = await fetch(convertedFileUrl);
          const blob = await response.blob();
          downloadFile(blob, convertedFileName);
        } else {
          // URL esterno
          const response = await fetch(convertedFileUrl);
          const blob = await response.blob();
          downloadFile(blob, convertedFileName);
        }
        
        toast({
          title: "Download completato",
          description: `File ${convertedFileName} scaricato`,
        });
      } catch (error) {
        toast({
          title: "Errore download",
          description: "Impossibile scaricare il file",
          variant: "destructive",
        });
      }
    }
  };

  const handleTranslate = async () => {
    if (!uploadedFile || !selectedLanguage) {
      toast({
        title: "Errore",
        description: "Per favore carica un file e seleziona la lingua",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await translateDocument(uploadedFile, selectedLanguage);
      
      if (result.success && result.translatedText) {
        setTranslation(result.translatedText);
        toast({
          title: "Traduzione completata!",
          description: "Documento tradotto con successo",
        });
      } else {
        setError(result.error || 'Errore durante la traduzione');
        toast({
          title: "Errore traduzione",
          description: result.error || 'Errore durante la traduzione',
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSummarize = async () => {
    if (!uploadedFile) {
      toast({
        title: "Errore",
        description: "Per favore carica un file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await summarizeDocument(uploadedFile);
      
      if (result.success && result.summary) {
        setSummary(result.summary);
        toast({
          title: "Riassunto completato!",
          description: "Documento riassunto con successo",
        });
      } else {
        setError(result.error || 'Errore durante il riassunto');
        toast({
          title: "Errore riassunto",
          description: result.error || 'Errore durante il riassunto',
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
            <img 
              src="/lovable-uploads/d1822e4f-1839-4093-bba2-d979e6d6be22.png" 
              alt="NAU Logo" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Universal File Converter Pro
              </h1>
              <p className="text-sm text-gray-600">Converti, Riassumi, Traduci qualsiasi formato - Fino a 100MB</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Success Notice */}
        <Alert className="mb-6 border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>✅ CloudConvert integrato!</strong> Ora puoi convertire tutti i formati di file inclusi PDF, Word, Excel, PowerPoint, immagini e molto altro.
            <br />
            <strong>Dimensione massima:</strong> 100MB per file
            <br />
            <strong>Formati supportati:</strong> PDF, DOCX, XLSX, PPTX, JPG, PNG, GIF, HTML, TXT, CSV, JSON, XML, RTF, ODT e molti altri
          </AlertDescription>
        </Alert>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Section */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Carica il tuo file
            </CardTitle>
            <CardDescription>
              Supporta tutti i formati principali - PDF, Office, immagini, testo e molto altro (max 100MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  const file = files[0];
                  if (file.size > 100 * 1024 * 1024) {
                    toast({
                      title: "File troppo grande",
                      description: "Il file non può superare i 100MB",
                      variant: "destructive",
                    });
                    return;
                  }
                  const fileType = getFileType(file.name);
                  if (fileType !== 'unknown') {
                    setUploadedFile(file);
                    setError(null);
                    toast({
                      title: "File caricato con successo!",
                      description: `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
                    });
                  }
                }
              }}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">
                {uploadedFile ? uploadedFile.name : 'Trascina qui il tuo file o clicca per selezionare'}
              </p>
              <p className="text-sm text-gray-500 mb-2">
                {uploadedFile 
                  ? `Dimensione: ${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB - Tipo: ${getFileType(uploadedFile.name).toUpperCase()}`
                  : 'Tutti i formati supportati - Dimensione massima: 100MB'
                }
              </p>
              {uploadedFile && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg inline-block">
                  <p className="text-green-700 text-sm font-medium">✓ File caricato e pronto per l'elaborazione</p>
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
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="convert" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Converti
            </TabsTrigger>
            <TabsTrigger value="merge" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Unisci PDF
            </TabsTrigger>
            <TabsTrigger value="split" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dividi PDF
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
                  Conversione File Universale
                </CardTitle>
                <CardDescription>
                  Converti il tuo file in qualsiasi formato supportato da CloudConvert
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
                      <SelectContent className="bg-white max-h-60 overflow-y-auto">
                        {availableFormats.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Progress Bar */}
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Conversione in corso...</span>
                      <span className="text-sm text-gray-600">{conversionProgress}%</span>
                    </div>
                    <Progress value={conversionProgress} className="w-full" />
                  </div>
                )}

                <div className="flex gap-4">
                  <Button 
                    onClick={handleConvert}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    disabled={!uploadedFile || !targetFormat || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Conversione con CloudConvert...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Converti File
                      </>
                    )}
                  </Button>

                  {convertedFileUrl && convertedFileName && (
                    <Button 
                      onClick={async () => {
                        try {
                          const response = await fetch(convertedFileUrl);
                          const blob = await response.blob();
                          downloadFile(blob, convertedFileName);
                          
                          toast({
                            title: "Download completato",
                            description: `File ${convertedFileName} scaricato`,
                          });
                        } catch (error) {
                          toast({
                            title: "Errore download",
                            description: "Impossibile scaricare il file",
                            variant: "destructive",
                          });
                        }
                      }}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Scarica {convertedFileName}
                    </Button>
                  )}
                </div>

                {convertedFileUrl && convertedFileName && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-green-700 font-medium">
                        File convertito con successo: {convertedFileName}
                      </p>
                    </div>
                    <p className="text-green-600 text-sm mt-1">
                      Conversione completata tramite CloudConvert
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Merge PDF Tab */}
          <TabsContent value="merge">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <FileText className="h-5 w-5" />
                  Unisci PDF
                </CardTitle>
                <CardDescription>
                  Seleziona più file PDF per unirli in un unico documento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Seleziona file PDF (2-10 file):</label>
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length < 2) {
                        toast({
                          title: "Errore",
                          description: "Seleziona almeno 2 file PDF",
                          variant: "destructive",
                        });
                        return;
                      }
                      if (files.length > 10) {
                        toast({
                          title: "Errore",
                          description: "Massimo 10 file PDF",
                          variant: "destructive",
                        });
                        return;
                      }
                      setPdfFiles(files);
                      toast({
                        title: "File caricati",
                        description: `${files.length} file PDF selezionati`,
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {pdfFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">File selezionati:</h4>
                    {pdfFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <FileText className="h-4 w-4 text-red-600" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <Button 
                  onClick={async () => {
                    if (pdfFiles.length < 2) {
                      toast({
                        title: "Errore",
                        description: "Seleziona almeno 2 file PDF",
                        variant: "destructive",
                      });
                      return;
                    }

                    setIsProcessing(true);
                    setError(null);

                    try {
                      const result = await mergePdfs(pdfFiles);
                      
                      if (result.success && result.downloadUrl && result.filename) {
                        setConvertedFileUrl(result.downloadUrl);
                        setConvertedFileName(result.filename);
                        toast({
                          title: "Unione completata!",
                          description: "I PDF sono stati uniti con successo",
                        });
                      } else {
                        setError(result.error || 'Errore durante l\'unione');
                        toast({
                          title: "Errore unione",
                          description: result.error || 'Errore durante l\'unione',
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
                      setError(errorMessage);
                      toast({
                        title: "Errore",
                        description: errorMessage,
                        variant: "destructive",
                      });
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  disabled={pdfFiles.length < 2 || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Unione in corso...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Unisci PDF
                    </>
                  )}
                </Button>

                {convertedFileUrl && convertedFileName && (
                  <Button 
                    onClick={handleDownload}
                    variant="outline"
                    className="flex items-center gap-2 ml-4"
                  >
                    <Download className="h-4 w-4" />
                    Scarica {convertedFileName}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Split PDF Tab */}
          <TabsContent value="split">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-600">
                  <FileText className="h-5 w-5" />
                  Dividi PDF
                </CardTitle>
                <CardDescription>
                  Dividi un PDF in più file specificando le pagine
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">File PDF:</label>
                    <div className="p-3 bg-gray-50 border rounded-lg">
                      {uploadedFile && uploadedFile.type === 'application/pdf' ? (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-red-600" />
                          <span className="text-sm">{uploadedFile.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Carica un file PDF nella sezione principale</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo di divisione:</label>
                    <Select value={splitType} onValueChange={(value: 'pages' | 'range') => setSplitType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="pages">Pagine specifiche</SelectItem>
                        <SelectItem value="range">Range di pagine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {splitType === 'pages' ? 'Pagine (es: 1,3,5):' : 'Range (es: 1-3,5-7):'}
                  </label>
                  <input
                    type="text"
                    value={splitPages}
                    onChange={(e) => setSplitPages(e.target.value)}
                    placeholder={splitType === 'pages' ? '1,3,5' : '1-3,5-7'}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <Button 
                  onClick={async () => {
                    if (!uploadedFile || uploadedFile.type !== 'application/pdf') {
                      toast({
                        title: "Errore",
                        description: "Carica un file PDF",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (!splitPages.trim()) {
                      toast({
                        title: "Errore",
                        description: "Specifica le pagine da estrarre",
                        variant: "destructive",
                      });
                      return;
                    }

                    setIsProcessing(true);
                    setError(null);

                    try {
                      let options: any = {};
                      
                      if (splitType === 'pages') {
                        options.pages = splitPages;
                      } else {
                        // Converti range in formato array
                        const ranges = splitPages.split(',').map(range => {
                          const [start, end] = range.trim().split('-').map(n => parseInt(n));
                          return { start, end: end || start };
                        });
                        options.pageRanges = ranges;
                      }

                      const result = await splitPdf(uploadedFile, splitType, options);
                      
                      if (result.success && result.files) {
                        toast({
                          title: "Divisione completata!",
                          description: `PDF diviso in ${result.files.length} file`,
                        });
                        
                        // Scarica tutti i file
                        for (const file of result.files) {
                          const response = await fetch(file.url);
                          const blob = await response.blob();
                          downloadFile(blob, file.filename);
                        }
                      } else {
                        setError(result.error || 'Errore durante la divisione');
                        toast({
                          title: "Errore divisione",
                          description: result.error || 'Errore durante la divisione',
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
                      setError(errorMessage);
                      toast({
                        title: "Errore",
                        description: errorMessage,
                        variant: "destructive",
                      });
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
                  disabled={!uploadedFile || uploadedFile.type !== 'application/pdf' || !splitPages.trim() || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Divisione in corso...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Dividi PDF
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
                  onClick={handleSummarize}
                  disabled={!uploadedFile || isProcessing}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analisi in corso...
                    </>
                  ) : (
                    'Genera Riassunto'
                  )}
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
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleTranslate}
                      disabled={!uploadedFile || !selectedLanguage || isProcessing}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Traduzione...
                        </>
                      ) : (
                        'Traduci'
                      )}
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