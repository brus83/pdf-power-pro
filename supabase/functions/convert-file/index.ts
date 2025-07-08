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

    const cloudConvertApiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMGFlYTMyN2IzOWFkMjRhMjA0NmE0MDMyZDQ5YjBhYWE3ZDYzZTkwYzRmN2Y5Njk2YWI2YjA3OTBlMDFjMDcxYjRhMDU3ZThmZjA1ODJmZDAiLCJpYXQiOjE3NTE5NTk0NzAuMzIzMjU2LCJuYmYiOjE3NTE5NTk0NzAuMzIzMjU3LCJleHAiOjQ5MDc2MzMwNzAuMzE4NzQ2LCJzdWIiOiI3MjM1OTE1NyIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.bRuTPzbOMNMX-yXH9IBkHiGBr8eZkhSF4ipuAmFVg_ymE87DQ1W2BwbYi8hFp9CeztgRa2xxbsaa_AtpaxKa_IkIXULQFVOhu5rh3ujLAPwH6X3-W5FD1CQofPhe4HXrLuqrOUvr6IoiiirvBfc3h842VBACzQe6CZvysGRtdub5Re2BPO4gJUNosawI1tXKzxpVp3pEgeQ28DCM7AO9bmSzva-7pCODRS3_RMBg0jTpKP7LDA2TfEKtWWvD-BKk0M-jG5pQeVjqLfhjG1Gu_t0SZdq-c2Q3UIG-H_IegJ0FJ01UqfdQIbxFz9_F5swiMFwU7Jn6XbyeQ-bximoMMInzxP2WtcU8QiwaB3dHSEmEiSHvFdPd7htKLzsgFjBMfqHbdLs4eVwONzlrpAP8Fc4awUBiCOHtzN6jlIrYja-PWEgT7VaJmfoqjlewkIMvNjBN3bG1BzxI-jvLCcHWyub7oI-wwYuL7m1qyTOVZ6n-BdMwmARI7E9c8DCh0MybubicAHsTqKiYYMj2hbNgcfSjdoGGi_MAGRGbWVo3Tl2jOKWTmJmqpv7nkMGbQ9d_4zRKa3DbiBaCmkhpAwLTn_ZQ1AB4qJ2KnHfNVVh5NavKjmCLaEsxaxyqIpHUqhUPELpAiJaF-3A5l7v8PrFiCEGhoChUPHjxrZ_ZZhS8QOA'
    
    // Se non c'è la chiave API, usa conversioni semplici per formati di testo
    if (!cloudConvertApiKey) {
      console.log('CloudConvert API key not found, using simple conversions')
      const sourceExt = getExtensionFromFormat(sourceFormat)
      
      if (['txt', 'html', 'csv', 'json', 'xml'].includes(sourceExt) && 
          ['txt', 'html', 'csv', 'json', 'xml'].includes(targetFormat)) {
        
        try {
          const result = await performSimpleConversion(fileContent, fileName, sourceFormat, targetFormat)
          
          if (result.success) {
            return new Response(
              JSON.stringify({
                success: true,
                downloadUrl: result.downloadUrl,
                filename: result.filename
              }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          } else {
            return new Response(
              JSON.stringify({ error: result.error }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
        } catch (conversionError) {
          console.error('Simple conversion failed:', conversionError)
          return new Response(
            JSON.stringify({ error: `Errore durante la conversione: ${conversionError.message}` }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'CloudConvert API key non configurata. Per conversioni PDF, Office e immagini è necessaria la configurazione di CloudConvert.' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
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
            output_format: targetFormat,
            // Opzioni specifiche per PDF to PPT
            ...(sourceExt === 'pdf' && targetFormat === 'pptx' && {
              engine: 'office',
              engine_version: '2019'
            }),
            // Opzioni per migliorare la qualità
            ...(targetFormat === 'pptx' && {
              optimize_for: 'size'
            })
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
      const maxAttempts = 60 // 10 minuti di attesa massima per conversioni complesse
      
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

async function performSimpleConversion(
  fileContent: string, 
  fileName: string, 
  sourceFormat: string, 
  targetFormat: string
): Promise<{ success: boolean; downloadUrl?: string; filename?: string; error?: string }> {
  
  try {
    console.log('Performing simple conversion:', { fileName, sourceFormat, targetFormat })
    
    // Decodifica il contenuto base64
    let decodedContent: string
    try {
      decodedContent = atob(fileContent)
    } catch (decodeError) {
      console.error('Base64 decode error:', decodeError)
      return { success: false, error: 'Errore nella decodifica del file' }
    }

    const sourceExt = getExtensionFromFormat(sourceFormat)
    const originalName = fileName.split('.')[0]
    const newFileName = `${originalName}.${targetFormat}`

    // Conversioni supportate
    const supportedConversions = [
      // Testo
      { from: 'txt', to: 'html', converter: convertTxtToHtml },
      { from: 'txt', to: 'csv', converter: convertTxtToCsv },
      { from: 'txt', to: 'json', converter: convertTxtToJson },
      { from: 'txt', to: 'xml', converter: convertTxtToXml },
      
      // HTML
      { from: 'html', to: 'txt', converter: convertHtmlToTxt },
      
      // CSV
      { from: 'csv', to: 'json', converter: convertCsvToJson },
      { from: 'csv', to: 'xml', converter: convertCsvToXml },
      { from: 'csv', to: 'html', converter: convertCsvToHtml },
      
      // JSON
      { from: 'json', to: 'csv', converter: convertJsonToCsv },
      { from: 'json', to: 'xml', converter: convertJsonToXml },
      { from: 'json', to: 'txt', converter: convertJsonToTxt },
      
      // XML
      { from: 'xml', to: 'json', converter: convertXmlToJson },
      { from: 'xml', to: 'txt', converter: convertXmlToTxt },
    ]

    const conversion = supportedConversions.find(c => c.from === sourceExt && c.to === targetFormat)
    
    if (!conversion) {
      return { 
        success: false, 
        error: `Conversione da ${sourceExt} a ${targetFormat} non supportata senza CloudConvert API` 
      }
    }

    const convertedContent = conversion.converter(decodedContent)
    const base64Content = btoa(convertedContent)
    const mimeType = getMimeType(targetFormat)
    const dataUrl = `data:${mimeType};base64,${base64Content}`

    console.log('Conversion completed successfully')
    return {
      success: true,
      downloadUrl: dataUrl,
      filename: newFileName
    }

  } catch (error) {
    console.error('Simple conversion error:', error)
    return { success: false, error: `Errore nella conversione: ${error.message}` }
  }
}

// Funzioni di conversione semplici (mantenute per compatibilità)
function convertTxtToHtml(content: string): string {
  const lines = content.split('\n')
  const htmlContent = lines.map(line => `<p>${escapeHtml(line)}</p>`).join('\n')
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted Document</title>
</head>
<body>
    ${htmlContent}
</body>
</html>`
}

function convertTxtToCsv(content: string): string {
  const lines = content.split('\n')
  return lines.map(line => `"${line.replace(/"/g, '""')}"`).join('\n')
}

function convertTxtToJson(content: string): string {
  const lines = content.split('\n').filter(line => line.trim())
  return JSON.stringify({ lines }, null, 2)
}

function convertTxtToXml(content: string): string {
  const lines = content.split('\n')
  const xmlLines = lines.map((line, index) => `  <line id="${index + 1}">${escapeXml(line)}</line>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<document>
${xmlLines}
</document>`
}

function convertHtmlToTxt(content: string): string {
  return content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

function convertCsvToJson(content: string): string {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return '[]'
  
  const headers = parseCsvLine(lines[0])
  const data = lines.slice(1).map(line => {
    const values = parseCsvLine(line)
    const obj: any = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })
    return obj
  })
  
  return JSON.stringify(data, null, 2)
}

function convertCsvToXml(content: string): string {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return '<?xml version="1.0" encoding="UTF-8"?><data></data>'
  
  const headers = parseCsvLine(lines[0])
  const xmlRows = lines.slice(1).map(line => {
    const values = parseCsvLine(line)
    const xmlFields = headers.map((header, index) => 
      `    <${header}>${escapeXml(values[index] || '')}</${header}>`
    ).join('\n')
    return `  <row>\n${xmlFields}\n  </row>`
  }).join('\n')
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<data>
${xmlRows}
</data>`
}

function convertCsvToHtml(content: string): string {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return '<table></table>'
  
  const headers = parseCsvLine(lines[0])
  const headerRow = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`
  const dataRows = lines.slice(1).map(line => {
    const values = parseCsvLine(line)
    return `<tr>${values.map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`
  }).join('\n')
  
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CSV Data</title>
    <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <table>
        ${headerRow}
        ${dataRows}
    </table>
</body>
</html>`
}

function convertJsonToCsv(content: string): string {
  try {
    const data = JSON.parse(content)
    if (!Array.isArray(data) || data.length === 0) {
      return ''
    }
    
    const headers = Object.keys(data[0])
    const csvHeaders = headers.map(h => `"${h}"`).join(',')
    const csvRows = data.map(row => 
      headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    
    return `${csvHeaders}\n${csvRows}`
  } catch (error) {
    throw new Error('JSON non valido')
  }
}

function convertJsonToXml(content: string): string {
  try {
    const data = JSON.parse(content)
    return `<?xml version="1.0" encoding="UTF-8"?>
<root>
${jsonToXmlRecursive(data, '  ')}
</root>`
  } catch (error) {
    throw new Error('JSON non valido')
  }
}

function convertJsonToTxt(content: string): string {
  try {
    const data = JSON.parse(content)
    return JSON.stringify(data, null, 2)
  } catch (error) {
    throw new Error('JSON non valido')
  }
}

function convertXmlToJson(content: string): string {
  // Conversione XML semplificata
  const lines = content.split('\n')
  const textContent = lines
    .filter(line => !line.trim().startsWith('<?') && !line.trim().startsWith('<'))
    .map(line => line.trim())
    .filter(line => line.length > 0)
  
  return JSON.stringify({ content: textContent }, null, 2)
}

function convertXmlToTxt(content: string): string {
  return content
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Funzioni di utilità
function parseCsvLine(line: string): string[] {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

function jsonToXmlRecursive(obj: any, indent: string): string {
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map(item => `${indent}<item>\n${jsonToXmlRecursive(item, indent + '  ')}\n${indent}</item>`).join('\n')
    } else {
      return Object.entries(obj).map(([key, value]) => 
        `${indent}<${key}>\n${jsonToXmlRecursive(value, indent + '  ')}\n${indent}</${key}>`
      ).join('\n')
    }
  } else {
    return `${indent}${escapeXml(String(obj))}`
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
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
