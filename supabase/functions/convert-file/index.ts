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

    // Limite dimensione file (50MB per supportare PowerPoint)
    if (fileSize > 50 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File troppo grande. Limite: 50MB' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Conversione usando CloudConvert API con la tua chiave
    const cloudConvertResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNjVhNGM2YWE5YmIwYjEyM2I0N2NlMGE2NGVmZjM3Mjk5NmVhODE0NWE3NmMzNGM4YmNmY2U1YzhlMjE2ZDg0MDM5YmExZDkxYTI3YjY5MDkiLCJpYXQiOjE3NTE2MTkxOTYuMTQ4NzYyLCJuYmYiOjE3NTE2MTkxOTYuMTQ4NzYzLCJleHAiOjQ5MDcyOTI3OTYuMTQ1MDUsInN1YiI6IjcyMzU5MTU3Iiwic2NvcGVzIjpbInVzZXIucmVhZCIsInVzZXIud3JpdGUiLCJ0YXNrLnJlYWQiLCJ0YXNrLndyaXRlIiwid2ViaG9vay5yZWFkIiwid2ViaG9vay53cml0ZSIsInByZXNldC5yZWFkIiwicHJlc2V0LndyaXRlIl19.Pd2a-uu3GtejiaUh9UwIXQFrLUPhtY9OoIpklfbMxH_LF-HnSSej6DNrv9aqbnt6i2EODxWF5cBM_9PcH8DgtGE1E6O2AJU_UEK9j5g2DJ8cnYxSQOIgPDYgrTt18OoF-9-KX3qh6lF8BAhMgLzXYgNJL5nxWosBm79w1QpPHnPyQBJIw53QbcKr7KeE-GP-KY189L4tnoE5GUrOM59oNmh8wucC2JoVcewGQcI68tkL_nm6ahWL2wt4fifzKrK6JUceb9ysuvG6qPT3JA5-nZpqAw8j_nS5PCogTOLkra0GsCH6_ErsurRJknbiEWpOjIrwZz9k0HGsq8ZJP07_FpOsvHVIo7wjkR4fMxJJo3v_Q-QhY3QwAVHoOb_WjY5b2VI6GQi2XkGzF9tsnFoiInVxOq_cMLyp4IZyEpoHBRhwyP1KOXInSddSVaBH4jrZc-t2ogv09LVdIpRg-CIzL8bsI5Rxq5UeWEwIQIRDWPkVtX7AKP1skoboHLn9D9DNJdI_VgU8_xs20XFcmSzzuZRUz7ZmD-AUbJ8cGq7yRWjLwytD6LiybjkU92fiyeM9DS38jOG3AlayEWPf6rhF49grphjSt6QWhvZq8ny-srT-AFEw6WjO06iczODNyZ9wsYME1KyUqXrq7qESCLnaRftSvQU-83mJvYjOJq5G78E',
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
            depends_on: ['import-file'],
            // Opzioni specifiche per PowerPoint
            ...(targetFormat === 'pptx' && {
              engine: 'office',
              optimize_print: false
            }),
            // Opzioni specifiche per Excel
            ...(targetFormat === 'xlsx' && {
              engine: 'office'
            }),
            // Opzioni specifiche per PDF
            ...(targetFormat === 'pdf' && {
              engine: 'office'
            })
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
      const errorData = await cloudConvertResponse.json().catch(() => ({}))
      console.error('CloudConvert API Error:', errorData)
      
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
        JSON.stringify({ 
          error: `Errore CloudConvert: ${errorData.message || 'Servizio temporaneamente non disponibile'}` 
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const jobData = await cloudConvertResponse.json()
    console.log('CloudConvert Job Created:', jobData.data.id)
    
    // Attendi completamento job
    let jobStatus = 'waiting'
    let attempts = 0
    const maxAttempts = 60 // Aumentato per file più grandi come PowerPoint
    
    while (jobStatus !== 'finished' && jobStatus !== 'error' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)) // Aumentato intervallo
      
      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
        headers: {
          'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNjVhNGM2YWE5YmIwYjEyM2I0N2NlMGE2NGVmZjM3Mjk5NmVhODE0NWE3NmMzNGM4YmNmY2U1YzhlMjE2ZDg0MDM5YmExZDkxYTI3YjY5MDkiLCJpYXQiOjE3NTE2MTkxOTYuMTQ4NzYyLCJuYmYiOjE3NTE2MTkxOTYuMTQ4NzYzLCJleHAiOjQ5MDcyOTI3OTYuMTQ1MDUsInN1YiI6IjcyMzU5MTU3Iiwic2NvcGVzIjpbInVzZXIucmVhZCIsInVzZXIud3JpdGUiLCJ0YXNrLnJlYWQiLCJ0YXNrLndyaXRlIiwid2ViaG9vay5yZWFkIiwid2ViaG9vay53cml0ZSIsInByZXNldC5yZWFkIiwicHJlc2V0LndyaXRlIl19.Pd2a-uu3GtejiaUh9UwIXQFrLUPhtY9OoIpklfbMxH_LF-HnSSej6DNrv9aqbnt6i2EODxWF5cBM_9PcH8DgtGE1E6O2AJU_UEK9j5g2DJ8cnYxSQOIgPDYgrTt18OoF-9-KX3qh6lF8BAhMgLzXYgNJL5nxWosBm79w1QpPHnPyQBJIw53QbcKr7KeE-GP-KY189L4tnoE5GUrOM59oNmh8wucC2JoVcewGQcI68tkL_nm6ahWL2wt4fifzKrK6JUceb9ysuvG6qPT3JA5-nZpqAw8j_nS5PCogTOLkra0GsCH6_ErsurRJknbiEWpOjIrwZz9k0HGsq8ZJP07_FpOsvHVIo7wjkR4fMxJJo3v_Q-QhY3QwAVHoOb_WjY5b2VI6GQi2XkGzF9tsnFoiInVxOq_cMLyp4IZyEpoHBRhwyP1KOXInSddSVaBH4jrZc-t2ogv09LVdIpRg-CIzL8bsI5Rxq5UeWEwIQIRDWPkVtX7AKP1skoboHLn9D9DNJdI_VgU8_xs20XFcmSzzuZRUz7ZmD-AUbJ8cGq7yRWjLwytD6LiybjkU92fiyeM9DS38jOG3AlayEWPf6rhF49grphjSt6QWhvZq8ny-srT-AFEw6WjO06iczODNyZ9wsYME1KyUqXrq7qESCLnaRftSvQU-83mJvYjOJq5G78E'
        }
      })
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        jobStatus = statusData.data.status
        console.log(`Job ${jobData.data.id} status: ${jobStatus} (attempt ${attempts + 1})`)
      }
      
      attempts++
    }

    // Se il job fallisce
    if (jobStatus === 'error') {
      return new Response(
        JSON.stringify({ error: 'Errore durante la conversione del file. Verifica che il formato sia supportato.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (jobStatus !== 'finished') {
      return new Response(
        JSON.stringify({ error: 'Timeout durante la conversione. Il file potrebbe essere troppo grande o complesso.' }),
        { 
          status: 408, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Ottieni i task completati
    const finalJobResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
      headers: {
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNjVhNGM2YWE5YmIwYjEyM2I0N2NlMGE2NGVmZjM3Mjk5NmVhODE0NWE3NmMzNGM4YmNmY2U1YzhlMjE2ZDg0MDM5YmExZDkxYTI3YjY5MDkiLCJpYXQiOjE3NTE2MTkxOTYuMTQ4NzYyLCJuYmYiOjE3NTE2MTkxOTYuMTQ4NzYzLCJleHAiOjQ5MDcyOTI3OTYuMTQ1MDUsInN1YiI6IjcyMzU5MTU3Iiwic2NvcGVzIjpbInVzZXIucmVhZCIsInVzZXIud3JpdGUiLCJ0YXNrLnJlYWQiLCJ0YXNrLndyaXRlIiwid2ViaG9vay5yZWFkIiwid2ViaG9vay53cml0ZSIsInByZXNldC5yZWFkIiwicHJlc2V0LndyaXRlIl19.Pd2a-uu3GtejiaUh9UwIXQFrLUPhtY9OoIpklfbMxH_LF-HnSSej6DNrv9aqbnt6i2EODxWF5cBM_9PcH8DgtGE1E6O2AJU_UEK9j5g2DJ8cnYxSQOIgPDYgrTt18OoF-9-KX3qh6lF8BAhMgLzXYgNJL5nxWosBm79w1QpPHnPyQBJIw53QbcKr7KeE-GP-KY189L4tnoE5GUrOM59oNmh8wucC2JoVcewGQcI68tkL_nm6ahWL2wt4fifzKrK6JUceb9ysuvG6qPT3JA5-nZpqAw8j_nS5PCogTOLkra0GsCH6_ErsurRJknbiEWpOjIrwZz9k0HGsq8ZJP07_FpOsvHVIo7wjkR4fMxJJo3v_Q-QhY3QwAVHoOb_WjY5b2VI6GQi2XkGzF9tsnFoiInVxOq_cMLyp4IZyEpoHBRhwyP1KOXInSddSVaBH4jrZc-t2ogv09LVdIpRg-CIzL8bsI5Rxq5UeWEwIQIRDWPkVtX7AKP1skoboHLn9D9DNJdI_VgU8_xs20XFcmSzzuZRUz7ZmD-AUbJ8cGq7yRWjLwytD6LiybjkU92fiyeM9DS38jOG3AlayEWPf6rhF49grphjSt6QWhvZq8ny-srT-AFEw6WjO06iczODNyZ9wsYME1KyUqXrq7qESCLnaRftSvQU-83mJvYjOJq5G78E'
      }
    })

    const finalJobData = await finalJobResponse.json()
    
    // Trova il task di export
    const exportTask = finalJobData.data.tasks.find((task: any) => task.name === 'export-file')
    
    if (!exportTask || !exportTask.result || !exportTask.result.files || exportTask.result.files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Errore nel recupero del file convertito' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const downloadUrl = exportTask.result.files[0].url
    const originalName = fileName.split('.')[0]
    const newFileName = `${originalName}.${targetFormat}`

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: downloadUrl,
        filename: newFileName
      }),
      { 
        status: 200, 
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
    'xml': 'application/xml',
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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
  } else if (targetFormat === 'csv') {
    // Conversione semplice a CSV
    const lines = decodedContent.split('\n')
    convertedContent = lines.map(line => `"${line.replace(/"/g, '""')}"`).join('\n')
  }
  
  // Ricodifica in base64
  return btoa(convertedContent)
}