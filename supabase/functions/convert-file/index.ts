
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface ConversionRequest {
  fileContent: string;
  fileName: string;
  sourceFormat: string;
  targetFormat: string;
  fileSize: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileContent, fileName, sourceFormat, targetFormat, fileSize }: ConversionRequest = await req.json()

    console.log('Conversion request:', { fileName, sourceFormat, targetFormat, fileSize })

    // Validazione input
    if (!fileContent || !fileName || !targetFormat) {
      console.error('Missing parameters:', { fileContent: !!fileContent, fileName, targetFormat })
      return new Response(
        JSON.stringify({ error: 'Parametri mancanti' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Limite dimensione file 30MB
    if (fileSize > 30 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File troppo grande. Limite: 30MB' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Attempting simple conversion')
    
    // Conversione semplificata per test
    if (isSimpleConversion(sourceFormat, targetFormat)) {
      try {
        const convertedContent = await simpleConversion(fileContent, sourceFormat, targetFormat, fileName)
        
        return new Response(
          JSON.stringify({
            success: true,
            downloadUrl: convertedContent.downloadUrl,
            filename: convertedContent.filename
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } catch (error) {
        console.error('Simple conversion failed:', error)
        return new Response(
          JSON.stringify({ error: `Errore durante la conversione semplice: ${error.message}` }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Per conversioni più complesse, restituisci un messaggio informativo
    return new Response(
      JSON.stringify({ 
        error: 'Conversione non ancora supportata per questo formato. Al momento sono supportate solo conversioni semplici tra formati di testo (txt, html, csv, json, xml).' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Conversion error:', error)
    return new Response(
      JSON.stringify({ error: `Errore interno del server: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function isSimpleConversion(sourceFormat: string, targetFormat: string): boolean {
  const textFormats = ['txt', 'html', 'csv', 'json', 'xml']
  const sourceExt = getExtensionFromFormat(sourceFormat)
  const targetExt = targetFormat
  
  console.log('Checking conversion:', { sourceExt, targetExt, isSupported: textFormats.includes(sourceExt) && textFormats.includes(targetExt) })
  
  return textFormats.includes(sourceExt) && textFormats.includes(targetExt)
}

function getExtensionFromFormat(format: string): string {
  if (format.includes('/')) {
    const mapping: { [key: string]: string } = {
      'text/plain': 'txt',
      'text/html': 'html',
      'text/csv': 'csv',
      'application/json': 'json',
      'application/xml': 'xml',
      'text/xml': 'xml',
      'application/pdf': 'pdf'
    }
    return mapping[format] || 'txt'
  }
  return format
}

async function simpleConversion(content: string, sourceFormat: string, targetFormat: string, fileName: string) {
  try {
    console.log('Starting simple conversion:', { sourceFormat, targetFormat })
    
    // Decodifica il contenuto base64
    let decodedContent: string
    try {
      decodedContent = atob(content)
      console.log('Successfully decoded base64 content, length:', decodedContent.length)
    } catch (error) {
      console.error('Failed to decode base64:', error)
      throw new Error('Contenuto del file non valido')
    }
    
    // Conversioni semplici tra formati di testo
    let convertedContent = decodedContent
    
    const sourceExt = getExtensionFromFormat(sourceFormat)
    
    if (sourceExt === 'txt' && targetFormat === 'html') {
      convertedContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Documento Convertito</title>
</head>
<body>
    <pre>${decodedContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`
    } else if (sourceExt === 'html' && targetFormat === 'txt') {
      // Rimuovi tag HTML (conversione molto semplice)
      convertedContent = decodedContent.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    } else if (targetFormat === 'csv') {
      // Conversione semplice a CSV
      const lines = decodedContent.split('\n')
      convertedContent = lines.map(line => `"${line.replace(/"/g, '""')}"`).join('\n')
    } else if (sourceExt === 'csv' && targetFormat === 'txt') {
      // Conversione da CSV a TXT
      convertedContent = decodedContent.replace(/,/g, '\t')
    } else if (targetFormat === 'json') {
      // Conversione semplice a JSON
      const lines = decodedContent.split('\n').filter(line => line.trim())
      convertedContent = JSON.stringify({ lines }, null, 2)
    } else if (sourceExt === 'json' && targetFormat === 'txt') {
      try {
        const parsed = JSON.parse(decodedContent)
        convertedContent = JSON.stringify(parsed, null, 2)
      } catch {
        convertedContent = decodedContent
      }
    }
    
    console.log('Conversion completed, output length:', convertedContent.length)
    
    // Ricodifica in base64
    const base64Content = btoa(convertedContent)
    const originalName = fileName.split('.')[0]
    const newFileName = `${originalName}.${targetFormat}`
    
    return {
      downloadUrl: `data:${getContentType(targetFormat)};base64,${base64Content}`,
      filename: newFileName
    }
  } catch (error) {
    console.error('Error in simple conversion:', error)
    throw error
  }
}

function getContentType(format: string): string {
  const contentTypes: { [key: string]: string } = {
    'txt': 'text/plain',
    'html': 'text/html',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  return contentTypes[format] || 'application/octet-stream'
}
