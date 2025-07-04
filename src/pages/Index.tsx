
import { useState } from 'react';
import { Upload, FileText, Languages, Sparkles, Download, Copy } from 'lucide-react';
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      toast({
        title: "PDF caricato con successo!",
        description: `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      });
    } else {
      toast({
        title: "Errore",
        description: "Per favore carica solo file PDF",
        variant: "destructive",
      });
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
      if (file.type === 'application/pdf') {
        setUploadedFile(file);
        toast({
          title: "PDF caricato con successo!",
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
      setSummary("Questo è un riassunto simulato del documento PDF caricato. Il documento tratta di tecnologie innovative nel settore dell'intelligenza artificiale, con particolare focus su applicazioni pratiche nel business moderno. Include analisi di mercato, case studies e proiezioni future per il prossimo quinquennio.");
    } else if (action === 'translation') {
      setTranslation("This is a simulated translation of the uploaded PDF document. The document discusses innovative technologies in the artificial intelligence sector, with particular focus on practical applications in modern business. It includes market analysis, case studies and future projections for the next five years.");
    }
    
    toast({
      title: "Operazione completata!",
      description: `${action} eseguito con successo`,
    });
  };

  const handleConvert = (format: 'word' | 'powerpoint') => {
    if (!uploadedFile) {
      toast({
        title: "Errore",
        description: "Per favore carica prima un file PDF",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: `Conversione ${format.toUpperCase()} avviata`,
      description: "Il file sarà pronto per il download a breve...",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiato!",
      description: "Testo copiato negli appunti",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                PDF Converter Pro
              </h1>
              <p className="text-sm text-gray-600">Converti, Riassumi, Traduci con AI</p>
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
              Carica il tuo PDF
            </CardTitle>
            <CardDescription>
              Supporta file PDF fino a 100+ pagine
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
                {uploadedFile ? uploadedFile.name : 'Trascina qui il tuo PDF o clicca per selezionare'}
              </p>
              <p className="text-sm text-gray-500">
                {uploadedFile 
                  ? `Dimensione: ${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB`
                  : 'Formati supportati: PDF'
                }
              </p>
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
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
              <FileText className="h-4 w-4" />
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
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-blue-600">Converti in Word</CardTitle>
                  <CardDescription>
                    Genera un documento .docx editabile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Mantiene la formattazione originale</li>
                    <li>• Testo completamente editabile</li>
                    <li>• Supporta immagini e tabelle</li>
                  </ul>
                  <Button 
                    onClick={() => handleConvert('word')}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    disabled={!uploadedFile}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Converti in Word
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-purple-600">Converti in PowerPoint</CardTitle>
                  <CardDescription>
                    Genera una presentazione .pptx strutturata
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Suddivisione automatica in slide</li>
                    <li>• Titoli e contenuti ottimizzati</li>
                    <li>• Layout professionale</li>
                  </ul>
                  <Button 
                    onClick={() => handleConvert('powerpoint')}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    disabled={!uploadedFile}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Converti in PowerPoint
                  </Button>
                </CardContent>
              </Card>
            </div>
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
                      <SelectContent>
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
