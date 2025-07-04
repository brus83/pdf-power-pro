# Universal File Converter Pro

Un'applicazione web avanzata per la conversione di file, traduzione automatica e riassunto di documenti.

## Funzionalità

- **Conversione File**: Converti tra diversi formati (PDF, Word, Testo, HTML, CSV, JSON, XML)
- **Traduzione Automatica**: Traduci documenti in multiple lingue
- **Riassunto Intelligente**: Genera riassunti automatici dei documenti

## Setup per Funzionalità Reali

### 1. Configurazione Supabase

1. Crea un account su [Supabase](https://supabase.com)
2. Crea un nuovo progetto
3. Copia le credenziali del progetto
4. Crea un file `.env` nella root del progetto:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Deploy delle Edge Functions

Installa Supabase CLI e fai il deploy delle funzioni:

```bash
# Installa Supabase CLI
npm install -g supabase

# Login a Supabase
supabase login

# Collega il progetto
supabase link --project-ref your-project-ref

# Deploy delle funzioni
supabase functions deploy convert-file
supabase functions deploy translate-document
supabase functions deploy summarize-document
```

### 3. API Keys per Servizi Esterni

#### CloudConvert (Conversione File)
1. Registrati su [CloudConvert](https://cloudconvert.com)
2. Ottieni la tua API key gratuita
3. Sostituisci `YOUR_CLOUDCONVERT_API_KEY` nelle edge functions

#### MyMemory (Traduzione)
- MyMemory offre traduzione gratuita senza API key
- Limite: 5000 caratteri per richiesta

### 4. Formati Supportati

**Conversione Completa (con CloudConvert):**
- PDF, Word, PowerPoint, Excel
- Immagini (JPG, PNG, GIF)
- Video e Audio
- Archivi (ZIP, RAR)

**Conversione Semplificata (implementata):**
- Testo (.txt)
- HTML (.html)
- CSV (.csv)
- JSON (.json)
- XML (.xml)

## Sviluppo Locale

```bash
# Installa dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Avvia Supabase localmente (opzionale)
supabase start
```

## Limitazioni Attuali

- **Conversione**: Funziona solo per formati di testo senza CloudConvert API
- **Traduzione**: Limitata a 5000 caratteri per documento
- **Riassunto**: Algoritmo semplificato, non AI-powered

## Miglioramenti Futuri

1. **Integrazione AI**: OpenAI GPT per riassunti più intelligenti
2. **OCR**: Estrazione testo da immagini e PDF scansionati
3. **Batch Processing**: Elaborazione di più file contemporaneamente
4. **Cloud Storage**: Salvataggio permanente dei file convertiti
5. **Autenticazione**: Sistema di login per salvare la cronologia

## Tecnologie Utilizzate

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase Edge Functions
- **APIs**: CloudConvert, MyMemory Translation
- **Build Tool**: Vite

## Contribuire

1. Fork del repository
2. Crea un branch per la tua feature
3. Commit delle modifiche
4. Push al branch
5. Apri una Pull Request

## Licenza

MIT License - vedi il file LICENSE per i dettagli.