
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

    console.log('Translation request received:', { fileName, fileType, targetLanguage })

    // Validazione input
    if (!fileContent || !fileName || !targetLanguage) {
      console.error('Missing parameters:', { fileContent: !!fileContent, fileName: !!fileName, targetLanguage: !!targetLanguage })
      return new Response(
        JSON.stringify({ error: 'Parametri mancanti: fileContent, fileName e targetLanguage sono richiesti' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Estrai testo dal file
    let textToTranslate = ''
    
    try {
      console.log('Attempting to decode file content...')
      
      // Verifica se il contenuto è già in base64 valido
      if (fileContent.includes('data:')) {
        // Rimuovi il prefisso data: se presente
        const base64Content = fileContent.split(',')[1] || fileContent
        textToTranslate = atob(base64Content)
      } else {
        // Prova a decodificare direttamente
        textToTranslate = atob(fileContent)
      }
      
      console.log('File decoded successfully, length:', textToTranslate.length)
      
    } catch (decodeError) {
      console.error('Decode error:', decodeError)
      
      // Se la decodifica fallisce, prova a usare il contenuto come testo plain
      try {
        textToTranslate = fileContent
        console.log('Using content as plain text')
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError)
        return new Response(
          JSON.stringify({ error: 'Impossibile leggere il contenuto del file. Assicurati che sia un file di testo valido.' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Verifica che il testo non sia vuoto
    if (!textToTranslate || textToTranslate.trim().length === 0) {
      console.error('Empty text after decoding')
      return new Response(
        JSON.stringify({ error: 'Il file sembra essere vuoto o non contiene testo leggibile' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verifica che il contenuto sia effettivamente testo
    const hasValidText = /[\w\s\p{L}]/u.test(textToTranslate.substring(0, 100))
    if (!hasValidText) {
      console.error('Content does not appear to be valid text')
      return new Response(
        JSON.stringify({ error: 'Il contenuto del file non sembra essere testo valido. Usa file di testo (.txt).' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Limita la lunghezza del testo per l'API gratuita
    if (textToTranslate.length > 3000) {
      textToTranslate = textToTranslate.substring(0, 3000) + '...'
      console.log('Text truncated to 3000 characters')
    }

    console.log('Attempting translation with MyMemory API...')

    // Usa Google Translate API gratuita (tramite MyMemory)
    const translationResponse = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${targetLanguage}&de=supabase@translator.app`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'DocumentTranslator/1.0',
          'Accept': 'application/json'
        }
      }
    )

    console.log('MyMemory API response status:', translationResponse.status)

    if (!translationResponse.ok) {
      console.error('Translation API error:', translationResponse.status, translationResponse.statusText)
      
      // Fallback: restituisci il testo originale con un messaggio
      return new Response(
        JSON.stringify({ 
          success: true,
          translatedText: `[TRADUZIONE NON DISPONIBILE - TESTO ORIGINALE]\n\n${textToTranslate}`,
          warning: 'Servizio di traduzione temporaneamente non disponibile'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const translationData = await translationResponse.json()
    console.log('Translation data received:', translationData)
    
    if (translationData.responseStatus !== 200) {
      console.error('Translation service error:', translationData)
      
      // Fallback: restituisci il testo originale
      return new Response(
        JSON.stringify({ 
          success: true,
          translatedText: `[ERRORE TRADUZIONE - TESTO ORIGINALE]\n\n${textToTranslate}`,
          warning: 'Errore nel servizio di traduzione: ' + (translationData.responseDetails || 'Servizio non disponibile')
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!translationData.responseData || !translationData.responseData.translatedText) {
      console.error('No translation received')
      return new Response(
        JSON.stringify({ 
          success: true,
          translatedText: `[NESSUNA TRADUZIONE - TESTO ORIGINALE]\n\n${textToTranslate}`,
          warning: 'Nessuna traduzione ricevuta dal servizio'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Translation successful')
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
      JSON.stringify({ error: 'Errore interno del server durante la traduzione: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
