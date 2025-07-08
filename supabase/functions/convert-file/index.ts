
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

    // Limite dimensione file aumentato a 100MB
    if (fileSize > 100 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File troppo grande. Limite: 100MB' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY')
    if (!cloudConvertApiKey) {
      console.error('CloudConvert API key not found')
      return new Response(
        JSON.stringify({ error: 'Configurazione API mancante' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Starting CloudConvert conversion')
    console.log('Using API key (first 10 chars):', cloudConvertApiKey.substring(0, 10))
    
    try {
      // Converti il contenuto base64 in Uint8Array per l'upload
      const binaryData = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0))
      const sourceExt = getExtensionFromFormat(sourceFormat)
      
      // Crea un job di conversione con la struttura corretta
      const jobPayload = {
        tasks: {
          'upload-file': {
            operation: 'import/upload'
          },
          'convert-file': {
            operation: 'convert',
            input: 'upload-file',
            output_format: targetFormat
          },
          'export-file': {
            operation: 'export/url',
            input: 'convert-file'
          }
        }
      }

      console.log('Creating job with payload:', JSON.stringify(jobPayload, null, 2))

      const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobPayload)
      })

      const jobResponseText = await jobResponse.text()
      console.log('Job response status:', jobResponse.status)
      console.log('Job response:', jobResponseText)

      if (!jobResponse.ok) {
        console.error('CloudConvert job creation failed:', jobResponseText)
        return new Response(
          JSON.stringify({ error: `Errore CloudConvert: ${jobResponse.status} - ${jobResponseText}` }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const jobData = JSON.parse(jobResponseText)
      console.log('Job created successfully:', jobData.data.id)

      // Upload del file
      const uploadTask = jobData.data.tasks.find((task: any) => task.name === 'upload-file')
      if (!uploadTask || !uploadTask.result?.form) {
        console.error('Upload task not found or invalid:', uploadTask)
        throw new Error('Task di upload non trovato o non valido')
      }

      console.log('Uploading file to:', uploadTask.result.form.url)

      const formData = new FormData()
      Object.entries(uploadTask.result.form.parameters).forEach(([key, value]) => {
        formData.append(key, value as string)
      })
      const blob = new Blob([binaryData], { type: getContentType(sourceExt) })
      formData.append('file', blob, fileName)

      const uploadResponse = await fetch(uploadTask.result.form.url, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.text()
        console.error('Upload failed:', uploadError)
        throw new Error(`Errore durante l'upload: ${uploadResponse.status}`)
      }

      console.log('File uploaded successfully')

      // Attendi il completamento della conversione
      let jobStatus = 'waiting'
      let attempts = 0
      const maxAttempts = 30 // 5 minuti di attesa massima
      
      while (jobStatus !== 'finished' && jobStatus !== 'error' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)) // Attendi 10 secondi
        
        const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
          headers: {
            'Authorization': `Bearer ${cloudConvertApiKey}`,
          }
        })

        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          jobStatus = statusData.data.status
          console.log(`Job status: ${jobStatus} (attempt ${attempts + 1})`)
          
          if (statusData.data.tasks) {
            const errorTask = statusData.data.tasks.find((task: any) => task.status === 'error')
            if (errorTask) {
              console.error('Task error:', errorTask)
              throw new Error(`Errore nella conversione: ${errorTask.message || 'Errore sconosciuto'}`)
            }
          }
        }
        
        attempts++
      }

      if (jobStatus === 'error') {
        throw new Error('Errore durante la conversione del file')
      }

      if (jobStatus !== 'finished') {
        throw new Error('Timeout durante la conversione del file')
      }

      // Ottieni il link di download
      const finalJobResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`,
        }
      })

      const finalJobData = await finalJobResponse.json()
      const exportTask = finalJobData.data.tasks.find((task: any) => task.name === 'export-file')
      
      if (!exportTask?.result?.files?.[0]?.url) {
        console.error('Export task result:', exportTask)
        throw new Error('File convertito non trovato')
      }

      const downloadUrl = exportTask.result.files[0].url
      const originalName = fileName.split('.')[0]
      const newFileName = `${originalName}.${targetFormat}`

      console.log('Conversion completed successfully')

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
      console.error('CloudConvert conversion failed:', error)
      return new Response(
        JSON.stringify({ error: `Errore durante la conversione: ${error.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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

function getExtensionFromFormat(format: string): string {
  if (format.includes('/')) {
    const mapping: { [key: string]: string } = {
      'text/plain': 'txt',
      'text/html': 'html',
      'text/csv': 'csv',
      'application/json': 'json',
      'application/xml': 'xml',
      'text/xml': 'xml',
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/msword': 'doc',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.ms-excel': 'xls'
    }
    return mapping[format] || format.split('/')[1]
  }
  return format
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
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'doc': 'application/msword',
    'ppt': 'application/vnd.ms-powerpoint',
    'xls': 'application/vnd.ms-excel',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'webp': 'image/webp'
  }
  return contentTypes[format] || 'application/octet-stream'
}
