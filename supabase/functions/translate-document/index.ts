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

Deno.serve(async (req) => {
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

    // Estrai testo dal file con gestione corretta
    let textToTranslate = ''
    
    try {
      console.log('Attempting to decode file content...')
      
      // Gestione corretta della decodifica base64
      let base64Content = fileContent
      
      // Rimuovi il prefisso data: se presente
      if (fileContent.startsWith('data:')) {
        base64Content = fileContent.split(',')[1]
      }
      
      // Decodifica base64 direttamente come stringa
      textToTranslate = atob(base64Content)
      
      console.log('File decoded successfully, length:', textToTranslate.length)
      console.log('First 100 chars:', textToTranslate.substring(0, 100))
      
    } catch (decodeError) {
      console.error('Decode error:', decodeError)
      // Fallback: usa il contenuto come testo plain
      textToTranslate = fileContent
      console.log('Using content as plain text')
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

    // Verifica che il contenuto sia testo leggibile (controllo più permissivo)
    const hasReadableText = /[a-zA-Z\u00C0-\u017F\u0400-\u04FF\s]/.test(textToTranslate.substring(0, 200))
    if (!hasReadableText) {
      console.error('Content does not appear to be readable text')
      return new Response(
        JSON.stringify({ error: 'Il file non contiene testo leggibile. Usa file di testo (.txt) per la traduzione.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Pulisci il testo mantenendo caratteri leggibili
    textToTranslate = textToTranslate
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Rimuovi solo caratteri di controllo problematici
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim()

    console.log('Cleaned text length:', textToTranslate.length)

    // Limita la lunghezza del testo per evitare errori URI Too Long
    if (textToTranslate.length > 800) {
      textToTranslate = textToTranslate.substring(0, 800) + '...'
      console.log('Text truncated to 800 characters')
    }

    console.log('Attempting translation with MyMemory API...')

    // Usa italiano come lingua sorgente di default invece di "auto"
    const sourceLang = 'it'
    
    // Codifica il testo per URL
    const encodedText = encodeURIComponent(textToTranslate)
    
    // Usa MyMemory API con email valida generica
    const translationResponse = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${sourceLang}|${targetLanguage}&de=translator@example.com`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DocumentTranslator/1.0)',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }
    )

    console.log('MyMemory API response status:', translationResponse.status)

    if (!translationResponse.ok) {
      console.error('Translation API error:', translationResponse.status, translationResponse.statusText)
      
      // Leggi il corpo della risposta per maggiori dettagli sull'errore
      let errorDetails = ''
      try {
        const errorBody = await translationResponse.text()
        console.error('API error body:', errorBody)
        errorDetails = errorBody
      } catch (e) {
        console.error('Could not read error body:', e)
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Errore servizio traduzione: ${translationResponse.status} - ${translationResponse.statusText}. ${errorDetails ? 'Dettagli: ' + errorDetails : ''}`
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const translationData = await translationResponse.json()
    console.log('Translation response status:', translationData.responseStatus)
    console.log('Translation response data:', translationData)
    
    if (translationData.responseStatus !== 200) {
      console.error('Translation service error:', translationData)
      
      return new Response(
        JSON.stringify({ 
          error: `Errore traduzione: ${translationData.responseDetails || 'Servizio non disponibile'}`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!translationData.responseData || !translationData.responseData.translatedText) {
      console.error('No translation received:', translationData)
      
      return new Response(
        JSON.stringify({ 
          error: 'Nessuna traduzione ricevuta dal servizio. Verifica che il testo sia valido.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const translatedText = translationData.responseData.translatedText

    console.log('Translation successful:', translatedText.substring(0, 100))
    return new Response(
      JSON.stringify({
        success: true,
        translatedText: translatedText
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