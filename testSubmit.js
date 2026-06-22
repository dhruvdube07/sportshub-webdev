import { createClient } from '@supabase/supabase-js'

// This script inserts a test survey row using the SERVICE ROLE key.
// WARNING: Keep SERVICE_ROLE secret. Do NOT commit it to source control.

(async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || ''
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
    console.error('Run with: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node testSubmit.js')
    process.exitCode = 1
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  try {
    const payload = {
      name: 'Local Test User',
      email: 'localtest@example.com',
      survey_title: 'Test Insert',
      feedback: 'Inserted from local testSubmit.js',
      rating: 5,
      is_finalized: true
    }

    const { data, error } = await supabase.from('surveys').insert(payload).select().single()

    if (error) {
      console.error('Insert error:', error)
      process.exitCode = 1
      return
    }

    console.log('Insert succeeded:', data)

    const { data: rows, error: rowsError } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (rowsError) {
      console.error('Select after insert error:', rowsError)
      process.exitCode = 1
      return
    }

    console.log('Latest rows in surveys:', rows)
    return
  } catch (e) {
    console.error('Unexpected error:', e)
    process.exitCode = 1
    return
  }
})()
