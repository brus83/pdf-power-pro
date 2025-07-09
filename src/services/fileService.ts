import { supabase } from '@/integrations/supabase/client';
import { convertFileToBase64, convertFileToText } from '@/lib/fileUtils';

export interface ConversionResult {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

export interface TranslationResult {
  success: boolean;
  translatedText?: string;
  error?: string;
}

export interface SummaryResult {
  success: boolean;
  summary?: string;
  error?: string;
}

export interface MergePdfResult {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

export interface SplitPdfResult {
  success: boolean;
  files?: Array<{ url: string; filename: string }>;
  error?: string;
}

export const convertFile = async (
  file: File, 
  targetFormat: string
): Promise<ConversionResult> => {
  try {
    console.log('Starting file conversion:', { fileName: file.name, targetFormat, fileSize: file.size })
    
    const base64Content = await convertFileToBase64(file);
    
    const { data, error } = await supabase.functions.invoke('convert-file', {
      body: {
        fileContent: base64Content,
        fileName: file.name,
        sourceFormat: file.type,
        targetFormat: targetFormat,
        fileSize: file.size
      }
    });

    if (error) {
      console.error('Conversion error details:', error);
      
      // Gestione migliorata degli errori con più dettagli
      let errorMessage = 'Si è verificato un errore durante la conversione del file.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.context?.body) {
        try {
          let bodyContent = error.context.body;
          
          if (bodyContent instanceof Uint8Array) {
            const decoder = new TextDecoder();
            bodyContent = decoder.decode(bodyContent);
          }
          
          const errorBody = typeof bodyContent === 'string' 
            ? JSON.parse(bodyContent) 
            : bodyContent;
            
          if (errorBody.error) {
            errorMessage = errorBody.error;
          } else if (errorBody.details) {
            errorMessage = `${errorMessage} Dettagli: ${errorBody.details}`;
          }
        } catch (parseError) {
          console.error('Failed to parse error body:', parseError);
          // Mantieni il messaggio user-friendly se il parsing fallisce
        }
      }
      
      // Se abbiamo ancora un messaggio generico, aggiungi suggerimenti
      if (errorMessage === 'Si è verificato un errore durante la conversione del file.') {
        errorMessage += ' Verifica che il file sia valido e non corrotto. Per file PDF, Word, Excel usa CloudConvert API.';
      }
      
      return { success: false, error: errorMessage };
    }

    console.log('Conversion successful:', data);
    return {
      success: true,
      downloadUrl: data.downloadUrl,
      filename: data.filename
    };
  } catch (error) {
    console.error('File conversion failed:', error);
    return { 
      success: false, 
      error: error instanceof Error 
        ? `Conversione fallita: ${error.message}` 
        : 'Conversione fallita. Verifica che il file sia valido e riprova.' 
    };
  }
};

export const translateDocument = async (
  file: File, 
  targetLanguage: string
): Promise<TranslationResult> => {
  try {
    // Per file di testo, usa readAsText invece di base64
    let fileContent = '';
    
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      fileContent = await convertFileToText(file);
    } else {
      // Per altri tipi di file, usa base64
      fileContent = await convertFileToBase64(file);
    }
    
    const { data, error } = await supabase.functions.invoke('translate-document', {
      body: {
        fileContent: fileContent,
        fileName: file.name,
        fileType: file.type,
        targetLanguage: targetLanguage,
        isPlainText: file.type === 'text/plain' || file.name.endsWith('.txt')
      }
    });

    if (error) {
      console.error('Translation error:', error);
      
      // Start with a user-friendly default error message
      let specificError = 'Si è verificato un errore durante la traduzione del documento. Riprova più tardi.';
      
      // Try to extract more specific error message from the edge function response
      if (error.context?.body) {
        try {
          let bodyContent = error.context.body;
          
          // Check if body is a Uint8Array and decode it to string
          if (bodyContent instanceof Uint8Array) {
            const decoder = new TextDecoder();
            bodyContent = decoder.decode(bodyContent);
          }
          
          // Parse the body content as JSON if it's a string
          const errorBody = typeof bodyContent === 'string' 
            ? JSON.parse(bodyContent) 
            : bodyContent;
            
          if (errorBody.error) {
            specificError = errorBody.error;
          }
        } catch (parseError) {
          console.error('Failed to parse error body:', parseError);
          // Keep the user-friendly default message if parsing fails
        }
      }
      
      // If we still have the generic fallback message, use the error.message as fallback
      if (specificError === 'Si è verificato un errore durante la traduzione del documento. Riprova più tardi.' && error.message) {
        specificError = error.message;
      }
      
      return { success: false, error: specificError };
    }

    return {
      success: true,
      translatedText: data.translatedText
    };
  } catch (error) {
    console.error('Translation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Traduzione fallita' 
    };
  }
};

export const summarizeDocument = async (file: File): Promise<SummaryResult> => {
  try {
    // Per file di testo, usa readAsText invece di base64
    let fileContent = '';
    
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      fileContent = await convertFileToText(file);
    } else {
      // Per altri tipi di file, usa base64
      fileContent = await convertFileToBase64(file);
    }
    
    const { data, error } = await supabase.functions.invoke('summarize-document', {
      body: {
        fileContent: fileContent,
        fileName: file.name,
        fileType: file.type,
        isPlainText: file.type === 'text/plain' || file.name.endsWith('.txt')
      }
    });

    if (error) {
      console.error('Summary error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      summary: data.summary
    };
  } catch (error) {
    console.error('Summarization failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Riassunto fallito' 
    };
  }
};

export const mergePdfs = async (files: File[]): Promise<MergePdfResult> => {
  try {
    console.log('Starting PDF merge:', { fileCount: files.length });
    
    if (files.length < 2) {
      return { success: false, error: 'Sono necessari almeno 2 file PDF per unire' };
    }
    
    if (files.length > 10) {
      return { success: false, error: 'Massimo 10 file PDF possono essere uniti' };
    }
    
    // Converti tutti i file in base64
    const fileContents = await Promise.all(
      files.map(async (file) => ({
        content: await convertFileToBase64(file),
        filename: file.name
      }))
    );
    
    const { data, error } = await supabase.functions.invoke('merge-pdf', {
      body: {
        files: fileContents
      }
    });

    if (error) {
      console.error('PDF merge error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      downloadUrl: data.downloadUrl,
      filename: data.filename
    };
  } catch (error) {
    console.error('PDF merge failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unione PDF fallita' 
    };
  }
};

export const splitPdf = async (
  file: File, 
  splitType: 'pages' | 'range',
  options: { pages?: string; pageRanges?: Array<{ start: number; end: number }> }
): Promise<SplitPdfResult> => {
  try {
    console.log('Starting PDF split:', { fileName: file.name, splitType, options });
    
    const base64Content = await convertFileToBase64(file);
    
    const { data, error } = await supabase.functions.invoke('split-pdf', {
      body: {
        fileContent: base64Content,
        fileName: file.name,
        splitType: splitType,
        pages: options.pages,
        pageRanges: options.pageRanges
      }
    });

    if (error) {
      console.error('PDF split error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      files: data.files
    };
  } catch (error) {
    console.error('PDF split failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Divisione PDF fallita' 
    };
  }
};