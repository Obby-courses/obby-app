import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-get-random-values'

const supabaseUrl = 'https://zetlqkjmqehucvgcehcb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldGxxa2ptcWVodWN2Z2NlaGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzc4NzIsImV4cCI6MjA4Mjg1Mzg3Mn0.HeqWpxDZbk9crdEE7Awac781erGZdwpax36Lz0agaOs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

