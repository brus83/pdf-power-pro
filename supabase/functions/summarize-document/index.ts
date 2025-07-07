
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SummaryRequest {
  fileContent: string;
  fileName: string;
  fileType: string;
}

serve(async (req) => {
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

    // Estrai testo dal file
    let textToSummarize = ''
    
    try {
      console.log('Attempting to decode file content...')
      
      // Verifica se il contenuto è già in base64 valido
      if (fileContent.includes('data:')) {
        // Rimuovi il prefisso data: se presente
        const base64Content = fileContent.split(',')[1] || fileContent
        textToSummarize = atob(base64Content)
      } else {
        // Prova a decodificare direttamente
        textToSummarize = atob(fileContent)
      }
      
      console.log('File decoded successfully, length:', textToSummarize.length)
      
    } catch (decodeError) {
      console.error('Decode error:', decodeError)
      
      // Se la decodifica fallisce, prova a usare il contenuto come testo plain
      try {
        textToSummarize = fileContent
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

    // Verifica che il contenuto sia effettivamente testo
    const hasValidText = /[\w\s\p{L}]/u.test(textToSummarize.substring(0, 100))
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

    console.log('Text to summarize length:', textToSummarize.length)

    // Limita la lunghezza del testo
    if (textToSummarize.length > 5000) {
      textToSummarize = textToSummarize.substring(0, 5000)
      console.log('Text truncated to 5000 characters')
    }

    // Usa un algoritmo di riassunto semplice basato su frasi chiave
    const summary = generateSimpleSummary(textToSummarize)

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

function generateSimpleSummary(text: string): string {
  try {
    console.log('Generating summary for text of length:', text.length)
    
    // Pulisci il testo da caratteri speciali e normalizzalo
    const cleanText = text
      .replace(/[^\w\s\p{L}.,!?;:()\-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    if (cleanText.length < 50) {
      return cleanText
    }
    
    // Dividi in frasi
    const sentences = cleanText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.length < 200)
    
    console.log('Found sentences:', sentences.length)
    
    if (sentences.length <= 3) {
      return sentences.join('. ') + '.'
    }

    // Prendi le prime 3 frasi più significative (che contengono più parole comuni)
    const scoredSentences = sentences.map(sentence => {
      const words = sentence.toLowerCase().split(/\s+/)
      const score = words.length + 
        (words.filter(w => w.length > 4).length * 2) + // parole lunghe
        (sentence.includes(',') ? 1 : 0) + // complessità
        (sentence.includes('è') || sentence.includes('sono') || sentence.includes('ha') ? 1 : 0) // verbi comuni italiani
      
      return { sentence, score }
    })

    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.sentence)

    const summary = topSentences.join('. ')
    console.log('Summary created successfully')
    
    return summary + (summary.endsWith('.') ? '' : '.')
    
  } catch (error) {
    console.error('Error in generateSimpleSummary:', error)
    return 'Errore nella generazione del riassunto: il testo potrebbe contenere caratteri non supportati.'
  }
}
