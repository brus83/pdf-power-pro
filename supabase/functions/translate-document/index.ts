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

    // Estrai testo dal file con gestione migliorata
    let textToTranslate = ''
    
    try {
      console.log('Attempting to decode file content...')
      
      // Gestione migliorata della decodifica
      if (fileContent.startsWith('data:')) {
        // Rimuovi il prefisso data: se presente
        const base64Content = fileContent.split(',')[1]
        textToTranslate = new TextDecoder('utf-8').decode(
          Uint8Array.from(atob(base64Content), c => c.charCodeAt(0))
        )
      } else {
        // Prova a decodificare direttamente come base64
        try {
          const decodedBytes = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0))
          textToTranslate = new TextDecoder('utf-8').decode(decodedBytes)
        } catch (base64Error) {
          console.log('Not base64, trying as plain text')
          textToTranslate = fileContent
        }
      }
      
      console.log('File decoded successfully, length:', textToTranslate.length)
      console.log('First 100 chars:', textToTranslate.substring(0, 100))
      
    } catch (decodeError) {
      console.error('Decode error:', decodeError)
      return new Response(
        JSON.stringify({ error: 'Impossibile decodificare il file. Assicurati che sia un file di testo valido (.txt).' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verifica che il testo non sia vuoto e sia leggibile
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

    // Verifica che il contenuto sia testo e non binario
    const isBinary = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(textToTranslate.substring(0, 200))
    if (isBinary) {
      console.error('Content appears to be binary')
      return new Response(
        JSON.stringify({ error: 'Il file contiene dati binari. Usa solo file di testo (.txt) per la traduzione.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Pulisci il testo da caratteri di controllo
    textToTranslate = textToTranslate
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Rimuovi caratteri di controllo
      .replace(/\r\n/g, '\n') // Normalizza line endings
      .trim()

    console.log('Cleaned text length:', textToTranslate.length)

    // Limita la lunghezza del testo per l'API gratuita (MyMemory ha limite di 5000 caratteri)
    if (textToTranslate.length > 4000) {
      textToTranslate = textToTranslate.substring(0, 4000) + '...'
      console.log('Text truncated to 4000 characters')
    }

    console.log('Attempting translation with MyMemory API...')

    // Codifica il testo per URL
    const encodedText = encodeURIComponent(textToTranslate)
    
    // Usa MyMemory API (gratuita)
    const translationResponse = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=auto|${targetLanguage}&de=translator@example.com`,
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
      
      return new Response(
        JSON.stringify({ 
          error: `Errore servizio traduzione: ${translationResponse.status} - ${translationResponse.statusText}`
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const translationData = await translationResponse.json()
    console.log('Translation response:', translationData)
    
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

    console.log('Translation successful')
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