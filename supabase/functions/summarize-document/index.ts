
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

    console.log('Summary request:', { fileName, fileType })

    // Validazione input
    if (!fileContent || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Parametri mancanti' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Estrai testo dal file
    let textToSummarize = ''
    
    try {
      if (fileType === 'text/plain') {
        textToSummarize = atob(fileContent)
      } else if (fileType === 'application/pdf') {
        // Per i PDF, per ora restituiamo un messaggio di errore informativo
        return new Response(
          JSON.stringify({ error: 'I file PDF non sono ancora supportati per il riassunto. Usa file di testo (.txt)' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        // Per altri formati, prova a decodificare come testo
        textToSummarize = atob(fileContent)
      }
    } catch (decodeError) {
      console.error('Decode error:', decodeError)
      return new Response(
        JSON.stringify({ error: 'Impossibile leggere il contenuto del file. Assicurati che sia un file di testo valido.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verifica che il testo non sia vuoto
    if (!textToSummarize || textToSummarize.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Il file sembra essere vuoto o non leggibile' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verifica che il contenuto sia effettivamente testo e non binario
    if (containsBinaryData(textToSummarize)) {
      return new Response(
        JSON.stringify({ error: 'Il file contiene dati binari. Usa file di testo (.txt) per il riassunto.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Text to summarize length:', textToSummarize.length)

    // Limita la lunghezza del testo
    if (textToSummarize.length > 3000) {
      textToSummarize = textToSummarize.substring(0, 3000)
    }

    // Usa un algoritmo di riassunto semplice basato su frasi chiave
    const summary = generateSimpleSummary(textToSummarize)

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
      JSON.stringify({ error: 'Errore interno del server: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function containsBinaryData(text: string): boolean {
  // Controlla se il testo contiene caratteri di controllo tipici dei dati binari
  const binaryPattern = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/g
  const binaryMatches = text.match(binaryPattern)
  
  // Se più del 10% del contenuto sono caratteri binari, consideralo binario
  if (binaryMatches && binaryMatches.length > text.length * 0.1) {
    return true
  }
  
  // Controlla pattern tipici dei PDF
  if (text.includes('endobj') || text.includes('startxref') || text.includes('%%EOF')) {
    return true
  }
  
  return false
}

function generateSimpleSummary(text: string): string {
  // Algoritmo di riassunto semplificato
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  
  if (sentences.length <= 3) {
    return text
  }

  // Prendi le prime 3 frasi più significative (più lunghe)
  const sortedSentences = sentences
    .map(s => s.trim())
    .filter(s => s.length > 20)
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)

  const summary = sortedSentences.join('. ')
  return summary + (summary.endsWith('.') ? '' : '.')
}
