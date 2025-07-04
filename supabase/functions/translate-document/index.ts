import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Estrai testo dal file
    let textToTranslate = ''
    
    if (fileType === 'text/plain') {
      textToTranslate = atob(fileContent)
    } else {
      // Per altri formati, estrai il testo (implementazione semplificata)
      textToTranslate = atob(fileContent)
    }

    // Limita la lunghezza del testo per l'API gratuita
    if (textToTranslate.length > 5000) {
      textToTranslate = textToTranslate.substring(0, 5000) + '...'
    }

    // Usa Google Translate API gratuita (tramite MyMemory)
    const translationResponse = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${targetLanguage}`
    )

    if (!translationResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Servizio di traduzione non disponibile' }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const translationData = await translationResponse.json()
    
    if (translationData.responseStatus !== 200) {
      return new Response(
        JSON.stringify({ error: 'Errore durante la traduzione' }),
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
      JSON.stringify({ error: 'Errore interno del server' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})