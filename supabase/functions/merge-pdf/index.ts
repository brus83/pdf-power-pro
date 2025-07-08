const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface MergePdfRequest {
  files: Array<{
    content: string;
    filename: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { files }: MergePdfRequest = await req.json()
    
    console.log('PDF merge request:', { fileCount: files.length })

    // Validazione input
    if (!files || !Array.isArray(files) || files.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Sono necessari almeno 2 file PDF per unire' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (files.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Massimo 10 file PDF possono essere uniti' }),
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

    console.log('Starting PDF merge with CloudConvert')
    
    try {
      // Crea task di upload per ogni file
      const uploadTasks: any = {}
      const mergeTasks: any = {}
      
      files.forEach((file, index) => {
        const taskName = `upload-file-${index}`
        uploadTasks[taskName] = {
          operation: 'import/upload'
        }
      })

      // Task di merge
      mergeTasks['merge-pdf'] = {
        operation: 'merge',
        input: Object.keys(uploadTasks),
        output_format: 'pdf'
      }

      // Task di export
      mergeTasks['export-file'] = {
        operation: 'export/url',
        input: 'merge-pdf'
      }

      const jobPayload = {
        tasks: {
          ...uploadTasks,
          ...mergeTasks
        }
      }

      console.log('Creating merge job with payload:', JSON.stringify(jobPayload, null, 2))

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

      // Upload di tutti i file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const taskName = `upload-file-${i}`
        const uploadTask = jobData.data.tasks.find((task: any) => task.name === taskName)
        
        if (!uploadTask || !uploadTask.result?.form) {
          throw new Error(`Task di upload ${taskName} non trovato`)
        }

        console.log(`Uploading file ${i + 1}/${files.length}: ${file.filename}`)

        const binaryData = Uint8Array.from(atob(file.content), c => c.charCodeAt(0))
        const formData = new FormData()
        
        Object.entries(uploadTask.result.form.parameters).forEach(([key, value]) => {
          formData.append(key, value as string)
        })
        
        const blob = new Blob([binaryData], { type: 'application/pdf' })
        formData.append('file', blob, file.filename)

        const uploadResponse = await fetch(uploadTask.result.form.url, {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.text()
          console.error(`Upload failed for file ${i + 1}:`, uploadError)
          throw new Error(`Errore durante l'upload del file ${file.filename}`)
        }

        console.log(`File ${i + 1} uploaded successfully`)
      }

      // Attendi il completamento del merge
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
              throw new Error(`Errore nel merge: ${errorTask.message || 'Errore sconosciuto'}`)
            }
          }
        }
        
        attempts++
      }

      if (jobStatus === 'error') {
        throw new Error('Errore durante il merge dei PDF')
      }

      if (jobStatus !== 'finished') {
        throw new Error('Timeout durante il merge dei PDF')
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
        throw new Error('File unito non trovato')
      }

      const downloadUrl = exportTask.result.files[0].url
      const mergedFileName = `merged_${Date.now()}.pdf`

      console.log('PDF merge completed successfully')

      return new Response(
        JSON.stringify({
          success: true,
          downloadUrl: downloadUrl,
          filename: mergedFileName
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (error) {
      console.error('PDF merge failed:', error)
      return new Response(
        JSON.stringify({ error: `Errore durante l'unione dei PDF: ${error.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Merge error:', error)
    return new Response(
      JSON.stringify({ error: `Errore interno del server: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})