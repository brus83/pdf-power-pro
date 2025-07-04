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

    // Estrai testo dal file
    let textToSummarize = ''
    
    if (fileType === 'text/plain') {
      textToSummarize = atob(fileContent)
    } else {
      // Per altri formati, estrai il testo (implementazione semplificata)
      textToSummarize = atob(fileContent)
    }

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
      JSON.stringify({ error: 'Errore interno del server' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateSimpleSummary(text: string): string {
  // Algoritmo di riassunto semplificato
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  
  if (sentences.length <= 3) {
    return text
  }

  // Prendi le prime 3 frasi più significative
  const summary = sentences
    .slice(0, Math.min(3, sentences.length))
    .map(s => s.trim())
    .join('. ')

  return summary + (summary.endsWith('.') ? '' : '.')
}