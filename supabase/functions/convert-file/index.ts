import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConversionRequest {
  fileContent: string;
  fileName: string;
  sourceFormat: string;
  targetFormat: string;
  fileSize: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileContent, fileName, sourceFormat, targetFormat, fileSize }: ConversionRequest = await req.json()

    // Validazione input
    if (!fileContent || !fileName || !targetFormat) {
      return new Response(
        JSON.stringify({ error: 'Parametri mancanti' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Limite dimensione file (10MB)
    if (fileSize > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File troppo grande. Limite: 10MB' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Conversione usando CloudConvert API (gratuita)
    const cloudConvertResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_CLOUDCONVERT_API_KEY', // Sostituisci con la tua API key
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-file': {
            operation: 'import/base64',
            file: fileContent,
            filename: fileName
          },
          'convert-file': {
            operation: 'convert',
            input: 'import-file',
            output_format: targetFormat,
            depends_on: ['import-file']
          },
          'export-file': {
            operation: 'export/url',
            input: 'convert-file',
            depends_on: ['convert-file']
          }
        }
      })
    })

    if (!cloudConvertResponse.ok) {
      // Fallback: conversione semplificata per formati di testo
      if (isTextFormat(sourceFormat) && isTextFormat(targetFormat)) {
        const convertedContent = await simpleTextConversion(fileContent, sourceFormat, targetFormat)
        
        return new Response(
          JSON.stringify({
            success: true,
            downloadUrl: `data:${getContentType(targetFormat)};base64,${convertedContent}`,
            filename: `${fileName.split('.')[0]}.${targetFormat}`
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: 'Servizio di conversione temporaneamente non disponibile' }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const jobData = await cloudConvertResponse.json()
    
    // Attendi completamento job
    let jobStatus = 'waiting'
    let attempts = 0
    const maxAttempts = 30
    
    while (jobStatus !== 'finished' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
        headers: {
          'Authorization': 'Bearer YOUR_CLOUDCONVERT_API_KEY'
        }
      })
      
      const statusData = await statusResponse.json()
      jobStatus = statusData.data.status
      attempts++
    }

    if (jobStatus !== 'finished') {
      return new Response(
        JSON.stringify({ error: 'Timeout durante la conversione' }),
        { 
          status: 408, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Ottieni URL di download
    const exportTask = jobData.data.tasks.find((task: any) => task.name === 'export-file')
    const downloadUrl = exportTask.result.files[0].url

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: downloadUrl,
        filename: `${fileName.split('.')[0]}.${targetFormat}`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Conversion error:', error)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function isTextFormat(format: string): boolean {
  const textFormats = ['text/plain', 'text/html', 'text/csv', 'application/json', 'application/xml']
  return textFormats.includes(format)
}

function getContentType(format: string): string {
  const contentTypes: { [key: string]: string } = {
    'txt': 'text/plain',
    'html': 'text/html',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml'
  }
  return contentTypes[format] || 'application/octet-stream'
}

async function simpleTextConversion(content: string, sourceFormat: string, targetFormat: string): Promise<string> {
  // Decodifica il contenuto base64
  const decodedContent = atob(content)
  
  // Conversioni semplici tra formati di testo
  let convertedContent = decodedContent
  
  if (sourceFormat === 'text/plain' && targetFormat === 'html') {
    convertedContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Documento Convertito</title>
</head>
<body>
    <pre>${decodedContent}</pre>
</body>
</html>`
  } else if (sourceFormat === 'text/html' && targetFormat === 'txt') {
    // Rimuovi tag HTML (conversione molto semplice)
    convertedContent = decodedContent.replace(/<[^>]*>/g, '')
  }
  
  // Ricodifica in base64
  return btoa(convertedContent)
}