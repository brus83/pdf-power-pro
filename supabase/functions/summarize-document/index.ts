const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface SummaryRequest {
  fileContent: string;
  fileName: string;
  fileType: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileContent, fileName, fileType }: SummaryRequest = await req.json()

    console.log('Summary request received:', { fileName, fileType })

    // Validazione input
    if (!fileContent || !fileName) {
      console.error('Missing parameters:', { fileContent: !!fileContent, fileName: !!fileName })
      return new Response(
        JSON.stringify({ error: 'Parametri mancanti: fileContent e fileName sono richiesti' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Estrai testo dal file con gestione corretta
    let textToSummarize = ''
    
    try {
      console.log('Attempting to decode file content...')
      
      // Gestione corretta della decodifica base64
      let base64Content = fileContent
      
      // Rimuovi il prefisso data: se presente
      if (fileContent.startsWith('data:')) {
        base64Content = fileContent.split(',')[1]
      }
      
      // Decodifica base64 direttamente come stringa
      textToSummarize = atob(base64Content)
      
      console.log('File decoded successfully, length:', textToSummarize.length)
      console.log('First 100 chars:', textToSummarize.substring(0, 100))
      
    } catch (decodeError) {
      console.error('Decode error:', decodeError)
      // Fallback: usa il contenuto come testo plain
      textToSummarize = fileContent
      console.log('Using content as plain text')
    }

    // Verifica che il testo non sia vuoto
    if (!textToSummarize || textToSummarize.trim().length === 0) {
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
    const hasReadableText = /[a-zA-Z\u00C0-\u017F\u0400-\u04FF\s]/.test(textToSummarize.substring(0, 200))
    if (!hasReadableText) {
      console.error('Content does not appear to be readable text')
      return new Response(
        JSON.stringify({ error: 'Il file non contiene testo leggibile. Usa file di testo (.txt) per il riassunto.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Pulisci il testo mantenendo caratteri leggibili
    textToSummarize = textToSummarize
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Rimuovi solo caratteri di controllo problematici
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim()

    console.log('Cleaned text length:', textToSummarize.length)

    // Limita la lunghezza del testo
    if (textToSummarize.length > 5000) {
      textToSummarize = textToSummarize.substring(0, 5000)
      console.log('Text truncated to 5000 characters')
    }

    // Genera riassunto
    const summary = generateSimpleSummary(textToSummarize)

    console.log('Summary generated successfully:', summary.substring(0, 100))
    return new Response(
      JSON.stringify({
        success: true,
        summary: summary
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Summary error:', error)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server durante il riassunto: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateSimpleSummary(text: string): string {
  try {
    console.log('Generating summary for text of length:', text.length)
    
    // Se il testo è molto corto, restituiscilo così com'è
    if (text.length < 100) {
      return text.trim()
    }
    
    // Pulisci e normalizza il testo
    const cleanText = text
      .replace(/\s+/g, ' ') // Normalizza spazi multipli
      .trim()
    
    // Dividi in frasi
    const sentences = cleanText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.length < 300)
      .slice(0, 15) // Limita a 15 frasi max
    
    console.log('Found sentences:', sentences.length)
    
    if (sentences.length === 0) {
      return 'Il testo è troppo breve per generare un riassunto significativo.'
    }
    
    if (sentences.length <= 3) {
      return sentences.join('. ') + '.'
    }

    // Seleziona le prime 3 frasi più significative
    const selectedSentences = sentences
      .slice(0, Math.min(10, sentences.length)) // Prendi le prime 10 frasi
      .filter((sentence, index) => {
        // Prendi la prima, una nel mezzo e una verso la fine
        return index === 0 || 
               index === Math.floor(sentences.length / 2) || 
               index === sentences.length - 1
      })
      .slice(0, 3) // Massimo 3 frasi

    const summary = selectedSentences.join('. ')
    console.log('Summary created successfully')
    
    return summary + (summary.endsWith('.') ? '' : '.')
    
  } catch (error) {
    console.error('Error in generateSimpleSummary:', error)
    return 'Errore nella generazione del riassunto. Il testo potrebbe contenere caratteri non supportati.'
  }
}