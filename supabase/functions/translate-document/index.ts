
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface TranslationRequest {
  fileContent: string;
  fileName: string;
  fileType: string;
  targetLanguage: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileContent, fileName, fileType, targetLanguage }: TranslationRequest = await req.json()

    console.log('Translation request:', { fileName, fileType, targetLanguage })

    // Validazione input
    if (!fileContent || !fileName || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: 'Parametri mancanti' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Estrai testo dal file
    let textToTranslate = ''
    
    try {
      if (fileType === 'text/plain') {
        textToTranslate = atob(fileContent)
      } else if (fileType === 'application/pdf') {
        // Per i PDF, per ora restituiamo un messaggio di errore informativo
        return new Response(
          JSON.stringify({ error: 'I file PDF non sono ancora supportati per la traduzione. Usa file di testo (.txt)' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        // Per altri formati, prova a decodificare come testo
        textToTranslate = atob(fileContent)
      }
    } catch (decodeError) {
      console.error('Decode error:', decodeError)
      return new Response(
        JSON.stringify({ error: 'Impossibile leggere il contenuto del file' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verifica che il testo non sia vuoto
    if (!textToTranslate || textToTranslate.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Il file sembra essere vuoto o non leggibile' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Limita la lunghezza del testo per l'API gratuita
    if (textToTranslate.length > 5000) {
      textToTranslate = textToTranslate.substring(0, 5000) + '...'
    }

    console.log('Text to translate length:', textToTranslate.length)

    // Usa Google Translate API gratuita (tramite MyMemory)
    const translationResponse = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${targetLanguage}&de=developer@example.com`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DocumentTranslator/1.0)'
        }
      }
    )

    if (!translationResponse.ok) {
      console.error('Translation API error:', translationResponse.status, translationResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Servizio di traduzione non disponibile' }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const translationData = await translationResponse.json()
    console.log('Translation response:', translationData)
    
    if (translationData.responseStatus !== 200) {
      console.error('Translation service error:', translationData)
      return new Response(
        JSON.stringify({ error: 'Errore durante la traduzione: ' + (translationData.responseDetails || 'Servizio non disponibile') }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!translationData.responseData || !translationData.responseData.translatedText) {
      return new Response(
        JSON.stringify({ error: 'Nessuna traduzione ricevuta dal servizio' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        translatedText: translationData.responseData.translatedText
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Translation error:', error)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
