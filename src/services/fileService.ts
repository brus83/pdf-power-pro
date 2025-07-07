import { supabase } from '@/integrations/supabase/client';
import { convertFileToBase64 } from '@/lib/fileUtils';

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

export const convertFile = async (
  file: File, 
  targetFormat: string
): Promise<ConversionResult> => {
  try {
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
      console.error('Conversion error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      downloadUrl: data.downloadUrl,
      filename: data.filename
    };
  } catch (error) {
    console.error('File conversion failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Conversione fallita' 
    };
  }
};

export const translateDocument = async (
  file: File, 
  targetLanguage: string
): Promise<TranslationResult> => {
  try {
    const base64Content = await convertFileToBase64(file);
    
    const { data, error } = await supabase.functions.invoke('translate-document', {
      body: {
        fileContent: base64Content,
        fileName: file.name,
        fileType: file.type,
        targetLanguage: targetLanguage
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
    const base64Content = await convertFileToBase64(file);
    
    const { data, error } = await supabase.functions.invoke('summarize-document', {
      body: {
        fileContent: base64Content,
        fileName: file.name,
        fileType: file.type
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