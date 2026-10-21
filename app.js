// Godkännandesida för Fred-API (Supabase OAuth 2.1). Ingen data från Fred passerar här.
// Nyckeln nedan är projektets publika nyckel; datan skyddas av RLS och avstängd registrering.
const SUPABASE_URL = 'https://jrdsoydjcwjbmtasileq.supabase.co'
const SUPABASE_KEY = 'sb_publishable_rW9Lw36ZXL9_BbRvh4EIMw_dtfwhuA5'

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: window.sessionStorage, persistSession: true, detectSessionInUrl: false },
})

const $ = (s) => document.querySelector(s)
const show = (step) => document.querySelectorAll('[data-step]').forEach((el) => { el.hidden = el.dataset.step !== step })
const msg = (t) => { $('#msg').textContent = t || '' }
const fail = (t) => { $('#feltext').textContent = t; show('fel') }

const authId = new URLSearchParams(location.search).get('authorization_id')

async function details() {
  const { data, error } = await sb.auth.oauth.getAuthorizationDetails(authId)
  if (error) return fail('Kunde inte hämta förfrågan: ' + error.message)
  if (data.redirect_url && !data.client) return location.assign(data.redirect_url)   // redan godkänd

  const client = data.client || {}
  const redirect = data.redirect_uri || client.redirect_uri || ''
  let host = ''
  try { host = new URL(redirect).host } catch { /* okänd */ }
  const scope = Array.isArray(data.scope) ? data.scope.join(' ') : (data.scope || data.scopes || '–')

  $('#client').textContent = client.client_name || client.name || 'Okänd klient'
  $('#user').textContent = (data.user && data.user.email) || 'dig'
  $('#redirect').textContent = host || '(okänd)'
  $('#scope').textContent = scope
  $('#warn').hidden = /(^|\.)claude\.(ai|com)$/.test(host)
  show('consent')
}

async function decide(approve) {
  $('#approve').disabled = $('#deny').disabled = true
  msg(approve ? 'Godkänner …' : 'Nekar …')
  const { data, error } = approve
    ? await sb.auth.oauth.approveAuthorization(authId)
    : await sb.auth.oauth.denyAuthorization(authId)
  if (error) { $('#approve').disabled = $('#deny').disabled = false; return msg('Fel: ' + error.message) }
  if (data && data.redirect_url) location.assign(data.redirect_url)
}

$('#login').addEventListener('submit', async (e) => {
  e.preventDefault()
  msg('Loggar in …')
  const { error } = await sb.auth.signInWithPassword({ email: $('#email').value, password: $('#password').value })
  $('#password').value = ''
  if (error) return msg('Inloggningen misslyckades.')
  msg('')
  details()
})
$('#approve').addEventListener('click', () => decide(true))
$('#deny').addEventListener('click', () => decide(false))

;(async () => {
  if (!authId || !/^[A-Za-z0-9_-]{8,200}$/.test(authId)) {
    return fail('Länken saknar giltigt authorization_id. Starta anslutningen från Claude igen.')
  }
  const { data: { session } } = await sb.auth.getSession()
  if (session) details()
  else show('login')
})()
