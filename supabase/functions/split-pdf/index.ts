const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface SplitPdfRequest {
  fileContent: string;
  fileName: string;
  splitType: 'pages' | 'range';
  pages?: string; // "1,3,5" o "1-5,7-10"
  pageRanges?: Array<{ start: number; end: number }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileContent, fileName, splitType, pages, pageRanges }: SplitPdfRequest = await req.json()
    
    console.log('PDF split request:', { fileName, splitType, pages, pageRanges })

    // Validazione input
    if (!fileContent || !fileName || !splitType) {
      return new Response(
        JSON.stringify({ error: 'Parametri mancanti: fileContent, fileName e splitType sono richiesti' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (splitType === 'pages' && !pages) {
      return new Response(
        JSON.stringify({ error: 'Parametro pages richiesto per splitType "pages"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (splitType === 'range' && (!pageRanges || pageRanges.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Parametro pageRanges richiesto per splitType "range"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY')
    if (!cloudConvertApiKey) {
      return new Response(
        JSON.stringify({ error: 'CloudConvert API key non configurata' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Starting PDF split with CloudConvert')
    
    try {
      const binaryData = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0))
      
      // Prepara le opzioni di split
      let splitOptions: any = {}
      
      if (splitType === 'pages') {
        // Split per pagine specifiche
        splitOptions = {
          pages: pages
        }
      } else if (splitType === 'range') {
        // Split per range di pagine
        splitOptions = {
          page_ranges: pageRanges.map(range => `${range.start}-${range.end}`)
        }
      }

      // Crea job di split
      const jobPayload = {
        tasks: {
          'upload-file': {
            operation: 'import/upload'
          },
          'split-pdf': {
            operation: 'split',
            input: 'upload-file',
            output_format: 'pdf',
            ...splitOptions
          },
          'export-files': {
            operation: 'export/url',
            input: 'split-pdf'
          }
        }
      }

      console.log('Creating split job with payload:', JSON.stringify(jobPayload, null, 2))

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
        throw new Error('Task di upload non trovato')
      }

      console.log('Uploading PDF file')

      const formData = new FormData()
      Object.entries(uploadTask.result.form.parameters).forEach(([key, value]) => {
        formData.append(key, value as string)
      })
      const blob = new Blob([binaryData], { type: 'application/pdf' })
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

      // Attendi il completamento dello split
      let jobStatus = 'waiting'
      let attempts = 0
      const maxAttempts = 30
      
      while (jobStatus !== 'finished' && jobStatus !== 'error' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000))
        
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
              throw new Error(`Errore nello split: ${errorTask.message || 'Errore sconosciuto'}`)
            }
          }
        }
        
        attempts++
      }

      if (jobStatus === 'error') {
        throw new Error('Errore durante lo split del PDF')
      }

      if (jobStatus !== 'finished') {
        throw new Error('Timeout durante lo split del PDF')
      }

      // Ottieni i link di download
      const finalJobResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`,
        }
      })

      const finalJobData = await finalJobResponse.json()
      const exportTask = finalJobData.data.tasks.find((task: any) => task.name === 'export-files')
      
      if (!exportTask?.result?.files || exportTask.result.files.length === 0) {
        console.error('Export task result:', exportTask)
        throw new Error('File divisi non trovati')
      }

      const files = exportTask.result.files.map((file: any, index: number) => ({
        url: file.url,
        filename: `${fileName.split('.')[0]}_part_${index + 1}.pdf`
      }))

      console.log('PDF split completed successfully')

      return new Response(
        JSON.stringify({
          success: true,
          files: files
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (error) {
      console.error('PDF split failed:', error)
      return new Response(
        JSON.stringify({ error: `Errore durante la divisione del PDF: ${error.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Split error:', error)
    return new Response(
      JSON.stringify({ error: `Errore interno del server: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})