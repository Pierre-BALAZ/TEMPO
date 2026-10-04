import { test, beforeAll, afterAll } from '@e2e-dev/web'
import { expect } from 'e2e'
import { randomUUID } from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { encodeCase } from '../../src/share/urlState.ts'
import { createEmptyCase } from '../../src/lib/case.ts'

let worker: ChildProcess
let workerLog = ''
const stateDir = resolve('.e2e/worker', `run-${Date.now()}`)
const base = 'http://127.0.0.1:4415'
beforeAll(async () => {
  await mkdir(stateDir, { recursive: true })
  worker = spawn(resolve('server/node_modules/.bin/wrangler'), ['dev', '--local', '--ip', '127.0.0.1', '--port', '4415', '--persist-to', stateDir], {
    cwd: resolve('server'), stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH!, HOME: process.env.HOME!, TMPDIR: process.env.TMPDIR ?? '/tmp', WRANGLER_SEND_METRICS: 'false' },
  })
  for (const stream of [worker.stdout, worker.stderr]) stream?.on('data', chunk => { workerLog = (workerLog + String(chunk)).slice(-200000) })
  await expect.poll(async () => { try { return (await fetch(`${base}/room/readiness`)).status } catch { return 0 } }, { timeout: 30000 }).toBe(200)
})
afterAll(async () => {
  if (worker && worker.exitCode === null) {
    worker.kill('SIGTERM')
    await new Promise<void>(r => worker.once('exit', () => r()))
  }
  await mkdir(resolve('.e2e/logs'), { recursive: true })
  await writeFile(resolve('.e2e/logs/worker.log'), workerLog)
  await rm(stateDir, { recursive: true, force: true })
})

test('real local Durable Object: empty room, write/read, version, malformed payload, origin and method rejection', async () => {
  const room = `${base}/wp-json/tempo/v1/room/fictif-e2e-${randomUUID()}`
  await expect(await (await fetch(room)).json()).toEqual({ v: 0, case: null })
  const state = createEmptyCase('polytrauma', Date.now())
  state.values['regul.moyens.vsav'] = { value: true, completedAt: Date.now(), updatedAt: Date.now() }
  const post = (body: string, headers: Record<string, string> = {}) => fetch(room, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body, signal: AbortSignal.timeout(10000) })
  await expect(await (await post(JSON.stringify({ case: state }))).json()).toEqual({ v: 1, case: state })
  await expect(await (await fetch(room)).json()).toEqual({ v: 1, case: state })
  state.values['regul.moyens.vsav'] = { value: null, updatedAt: Date.now() + 1 }
  await expect(await (await post(JSON.stringify({ case: state }))).json()).toEqual({ v: 2, case: state })
  await expect((await post('{broken')).status).toBe(400)
  await expect((await post(JSON.stringify({ case: null }))).status).toBe(400)
  await expect((await post(JSON.stringify({ case: state }), { Origin: 'https://untrusted.invalid' })).status).toBe(403)
  await expect((await fetch(room, { method: 'DELETE' })).status).toBe(405)
  await expect((await fetch(`${base}/room/invalid_room`)).status).toBe(404)
  // Exact lifecycle regression: ASCII413 → UTF-8413 → intactGET → validPOST → GET.
  for (const body of [JSON.stringify({ case: { ...state, extra: 'x'.repeat(300000) } }), JSON.stringify({ case: { ...state, header: { ...state.header, patientCodename: '界'.repeat(110000) } } })]) {
    const rejected = await post(body)
    await expect(rejected.status).toBe(413)
    await expect(await rejected.json()).toEqual({ error: 'payload trop volumineux' })
  }
  await expect(await (await fetch(room, { signal: AbortSignal.timeout(10000) })).json()).toEqual({ v: 2, case: state })
  const unicodeValid = { ...state, header: { ...state.header, patientCodename: '界'.repeat(1000) } }
  await expect(await (await post(JSON.stringify({ case: unicodeValid }))).json()).toEqual({ v: 3, case: unicodeValid })
  await expect(await (await fetch(room, { signal: AbortSignal.timeout(10000) })).json()).toEqual({ v: 3, case: unicodeValid })
  await expect(workerLog).not.toContain("Can't read from request stream after response has been sent")
})

test('browser team synchronization with real local Worker through test-only CORS adapter', async ({ app, screen, browser }) => {
  let activeRoom = ''
  // Node forwards to the real local Worker; production CORS allowlist stays intact.
  // Only the browser Origin/CORS transport is adapted for test port 4315.
  await browser.route(`${base}/**`, async r => {
    activeRoom = r.request.url
    const res = await fetch(r.request.url, { method: r.request.method, headers: { 'Content-Type': 'application/json' }, ...(r.request.method === 'POST' ? { body: r.request.postData } : {}) })
    await r.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() })
  })
  await app.open()
  await screen.getByRole('button', 'Régulateur SAMU / Centre 15').tap()
  await screen.getByRole('button', 'Pupitre', { exact: true }).tap()
  await browser.locator('[data-action-id="regul.moyens.vsav"]').getByRole('button', 'Cocher').tap()
  await screen.getByRole('button', 'Rejoindre', { exact: true }).tap()
  await expect(screen.getByText('En direct', { exact: true })).toBeVisible()
  const remote = await (await fetch(activeRoom)).json() as any
  await expect(remote.case.values['regul.moyens.vsav'].value).toBe(true)
  remote.case.values['regul.moyens.vsav'] = { value: null, updatedAt: Date.now() + 1000 }
  await fetch(activeRoom, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ case: remote.case }) })
  await expect(browser.locator('[data-action-id="regul.moyens.vsav"]').getByRole('button', 'Cocher')).toBeVisible()
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!).values['regul.moyens.vsav']?.value)).toBe(null)
  await screen.getByRole('button', 'Arrêter', { exact: true }).tap()
})

test('observer shared room: cannot mutate headers/reset/scenarios or publish, still receives editor updates', async ({ app, screen, browser }) => {
  const seed = createEmptyCase('polytrauma', Date.now())
  seed.header.patientCodename = 'FICTIF OBSERVATEUR'
  seed.header.regulateurName = 'FICTIF REGULATEUR'
  seed.values['regul.moyens.vsav'] = { value: true, completedAt: Date.now(), updatedAt: Date.now() }
  const url = `${base}/wp-json/tempo/v1/room/fictif-observateur-${seed.header.sessionId}`
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ case: seed }) })
  let posts = 0
  let reads = 0
  let observerBeforeResponse = false
  let releaseResponse: (() => void) | undefined
  await browser.route(`${base}/**`, async r => {
    if (r.request.method === 'POST') posts++
    else reads++
    const res = await fetch(r.request.url, { method: r.request.method, headers: { 'Content-Type': 'application/json' }, ...(r.request.method === 'POST' ? { body: r.request.postData } : {}) })
    const body = await res.text()
    if (observerBeforeResponse && r.request.method === 'GET') {
      observerBeforeResponse = false
      await new Promise<void>(resolve => { releaseResponse = resolve })
    }
    await r.fulfill({ status: res.status, contentType: 'application/json', body })
  })
  // Link capabilities still admit observers, without modifying a case to join.
  await app.open(`/#s=${encodeCase(seed)}`)
  await screen.getByRole('button', 'Observateur Démo / lecture seule').tap()
  await screen.getByRole('button', 'Rejoindre', { exact: true }).tap()
  await expect(screen.getByText('En direct', { exact: true })).toBeVisible()
  for (const placeholder of ['Nom de code (ex. Chopin, 314…)', 'Dr / SAMU…', 'Équipe préhosp…', 'Déchocage / SAUV…']) await expect(screen.getByPlaceholder(placeholder)).toBeDisabled()
  for (const name of ['Autre', 'Réinitialiser', 'Scénario démo', 'Démo guidée']) await expect(screen.getByRole('button', name, { exact: true })).toBeDisabled()
  // Force DOM affordances open to prove live write guards, not only attributes.
  await browser.evaluate(() => { for (const input of document.querySelectorAll<HTMLInputElement>('input[placeholder]')) input.disabled = false })
  await screen.getByPlaceholder('Dr / SAMU…').fill('FICTIF REFUSE')
  await browser.evaluate(() => { for (const b of document.querySelectorAll<HTMLButtonElement>('button')) { if (['Autre', 'Réinitialiser', 'Scénario démo', 'Démo guidée'].includes(b.textContent!.trim())) { b.disabled = false; b.click() } } })
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!))).toEqual(seed)
  await expect(await (await fetch(url)).json()).toEqual({ v: 1, case: seed })
  const remote = { ...seed, header: { ...seed.header, regulateurName: 'FICTIF EDITION LEGITIME' } }
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ case: remote }) })
  await expect(screen.getByPlaceholder('Dr / SAMU…')).toHaveValue('FICTIF EDITION LEGITIME')
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!))).toEqual(remote)
  await expect(posts).toBe(0)
  await expect(reads).toBeGreaterThan(1)
  await expect(await (await fetch(url)).json()).toEqual({ v: 2, case: remote })
  // Changing to an editor restores owned field writes and real room publication.
  await screen.getByRole('button', 'Régulateur', { exact: true }).tap()
  await screen.getByPlaceholder('Dr / SAMU…').fill('FICTIF NOUVELLE EDITION')
  await expect.poll(async () => (await (await fetch(url)).json() as any).case.header.regulateurName).toBe('FICTIF NOUVELLE EDITION')
  await expect(posts).toBeGreaterThan(0)
  const beforeTransition = posts
  observerBeforeResponse = true
  await screen.getByPlaceholder('Dr / SAMU…').fill('FICTIF TRANSITION NON PUBLIEE')
  await expect.poll(() => Boolean(releaseResponse)).toBe(true)
  await browser.evaluate(async () => { const ui = await import('/src/store/uiStore.ts'); ui.useUiStore.getState().setActiveRole('observer') })
  releaseResponse!()
  await expect(screen.getByPlaceholder('Dr / SAMU…')).toBeDisabled()
  await expect(screen.getByPlaceholder('Dr / SAMU…')).toHaveValue('FICTIF NOUVELLE EDITION')
  await expect(posts).toBe(beforeTransition)
  await expect((await (await fetch(url)).json() as any).case.header.regulateurName).toBe('FICTIF NOUVELLE EDITION')
  await screen.getByRole('button', 'Arrêter', { exact: true }).tap()
})
