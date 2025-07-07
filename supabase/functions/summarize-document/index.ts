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

    // Estrai testo dal file con gestione migliorata
    let textToSummarize = ''
    
    try {
      console.log('Attempting to decode file content...')
      
      // Gestione migliorata della decodifica
      if (fileContent.startsWith('data:')) {
        // Rimuovi il prefisso data: se presente
        const base64Content = fileContent.split(',')[1]
        textToSummarize = new TextDecoder('utf-8').decode(
          Uint8Array.from(atob(base64Content), c => c.charCodeAt(0))
        )
      } else {
        // Prova a decodificare direttamente come base64
        try {
          const decodedBytes = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0))
          textToSummarize = new TextDecoder('utf-8').decode(decodedBytes)
        } catch (base64Error) {
          console.log('Not base64, trying as plain text')
          textToSummarize = fileContent
        }
      }
      
      console.log('File decoded successfully, length:', textToSummarize.length)
      console.log('First 100 chars:', textToSummarize.substring(0, 100))
      
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

    // Verifica che il contenuto sia testo e non binario
    const isBinary = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(textToSummarize.substring(0, 200))
    if (isBinary) {
      console.error('Content appears to be binary')
      return new Response(
        JSON.stringify({ error: 'Il file contiene dati binari. Usa solo file di testo (.txt) per il riassunto.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Pulisci il testo da caratteri di controllo
    textToSummarize = textToSummarize
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Rimuovi caratteri di controllo
      .replace(/\r\n/g, '\n') // Normalizza line endings
      .trim()

    console.log('Cleaned text length:', textToSummarize.length)

    // Limita la lunghezza del testo
    if (textToSummarize.length > 5000) {
      textToSummarize = textToSummarize.substring(0, 5000)
      console.log('Text truncated to 5000 characters')
    }

    // Usa un algoritmo di riassunto migliorato
    const summary = generateAdvancedSummary(textToSummarize)

    console.log('Summary generated successfully')
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

function generateAdvancedSummary(text: string): string {
  try {
    console.log('Generating advanced summary for text of length:', text.length)
    
    // Se il testo è molto corto, restituiscilo così com'è
    if (text.length < 100) {
      return text.trim()
    }
    
    // Pulisci e normalizza il testo
    const cleanText = text
      .replace(/\s+/g, ' ') // Normalizza spazi
      .replace(/[^\w\s\p{L}.,!?;:()\-'"]/gu, ' ') // Mantieni solo caratteri leggibili
      .trim()
    
    // Dividi in frasi usando delimitatori multipli
    const sentences = cleanText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 300) // Filtra frasi troppo corte o lunghe
      .slice(0, 20) // Limita a 20 frasi max
    
    console.log('Found sentences:', sentences.length)
    
    if (sentences.length === 0) {
      return 'Impossibile generare un riassunto: il testo non contiene frasi complete.'
    }
    
    if (sentences.length <= 3) {
      return sentences.join('. ') + '.'
    }

    // Algoritmo di scoring migliorato
    const scoredSentences = sentences.map((sentence, index) => {
      const words = sentence.toLowerCase().split(/\s+/)
      const wordCount = words.length
      
      // Calcola score basato su vari fattori
      let score = 0
      
      // Lunghezza ottimale (15-30 parole)
      if (wordCount >= 15 && wordCount <= 30) score += 3
      else if (wordCount >= 10 && wordCount <= 40) score += 1
      
      // Posizione nel testo (inizio e fine più importanti)
      if (index < 3) score += 2 // Prime frasi
      if (index >= sentences.length - 3) score += 1 // Ultime frasi
      
      // Parole chiave italiane comuni
      const keyWords = ['importante', 'principale', 'fondamentale', 'essenziale', 'significativo', 'rilevante', 'cruciale']
      const keyWordCount = words.filter(w => keyWords.includes(w)).length
      score += keyWordCount * 2
      
      // Presenza di numeri o date (spesso importanti)
      if (/\d/.test(sentence)) score += 1
      
      // Complessità sintattica (virgole, congiunzioni)
      if (sentence.includes(',')) score += 1
      if (/\b(che|quando|dove|come|perché|quindi|inoltre|tuttavia|infatti)\b/.test(sentence.toLowerCase())) score += 1
      
      return { sentence, score, index }
    })

    // Seleziona le migliori 3-4 frasi
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(4, Math.ceil(sentences.length / 3)))
      .sort((a, b) => a.index - b.index) // Riordina per posizione originale
      .map(item => item.sentence)

    const summary = topSentences.join('. ')
    console.log('Advanced summary created successfully, length:', summary.length)
    
    return summary + (summary.endsWith('.') ? '' : '.')
    
  } catch (error) {
    console.error('Error in generateAdvancedSummary:', error)
    return 'Errore nella generazione del riassunto. Verifica che il file contenga testo leggibile.'
  }
}