import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('speech adapter: dictate, correct, validate; role switch blocks late transcripts; permission error', async ({ browser, app, screen }) => {
  // Browser recognition vendor is replaced; parser, hook, store and UI are real.
  await browser.addInitScript(() => {
    delete (window as any).speechSynthesis
    class Recognition {
      onresult: any; onerror: any; onend: any
      start() { (window as any).__recognition = this }
      stop() { this.onend?.() }
      abort() {}
    }
    ;(window as any).SpeechRecognition = Recognition
  })
  await app.open()
  await screen.getByRole('button', 'SMUR / VSAV Équipe pré-hospitalière').tap()
  await screen.getByRole('button', 'Pupitre', { exact: true }).tap()
  await screen.getByRole('button', 'Ouvrir le panneau de dictée').tap()
  await screen.getByRole('button', 'Activer le micro').tap()
  const utter = (text: string) => browser.evaluate(t => (window as any).__recognition.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: t, confidence: 1 } }] }), text)
  await utter('dictée')
  await utter('tension 86, fréquence cardiaque 110')
  await expect.poll(() => browser.evaluate(() => String(JSON.parse(localStorage.getItem('balaz.case.v1')!).values['prehosp.c.pas']?.value).split('|').at(-1)?.split(':').at(-1))).toBe('86')
  await utter('correction tension 95')
  await expect.poll(() => browser.evaluate(() => String(JSON.parse(localStorage.getItem('balaz.case.v1')!).values['prehosp.c.pas']?.value).split('|').at(-1)?.split(':').at(-1))).toBe('95')
  await utter('synthèse')
  await expect(screen.getByText('Relecture — dites « validé »')).toBeVisible()
  await utter('validé')
  await screen.getByRole('button', 'Observateur', { exact: true }).tap()
  await utter('tension 70')
  await expect.poll(() => browser.evaluate(() => String(JSON.parse(localStorage.getItem('balaz.case.v1')!).values['prehosp.c.pas']?.value).split('|').at(-1)?.split(':').at(-1))).toBe('95')
  await browser.evaluate(() => (window as any).__recognition.onerror({ error: 'not-allowed' }))
  await expect(screen.getByText('Micro refusé. Autorisez le micro (et utilisez https ou localhost).')).toBeVisible()
})
