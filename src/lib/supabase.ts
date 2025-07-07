
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://wlogisuhbdqlcnjoeiyy.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsb2dpc3VoYmRxbGNuam9laXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTIyMTYsImV4cCI6MjA2NzE4ODIxNn0.bGLYTj-AqYnyDk8wpoVlGQowKQY3M15THSshMWcKxqA"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
