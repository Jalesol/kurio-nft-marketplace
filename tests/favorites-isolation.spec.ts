import { expect, test } from '@playwright/test'

test('isola favoritos entre contas e recupera a lista ao voltar', async ({ page }) => {
  const nftPath = '/nfts/emerald-ape-042'
  const signIn = page.getByRole('button', { name: 'Entrar', exact: true })
  const account = page.getByRole('link', { name: 'Minha conta' })

  async function login(email: string) {
    await signIn.click()
    const dialog = page.getByRole('dialog', { name: 'Acesso à Kurio' })
    await dialog.getByLabel('E-mail').fill(email)
    await dialog.getByLabel('Senha', { exact: true }).fill('KurioDemo123')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(account).toBeVisible()
  }

  async function openFavorites() {
    await account.click()
    await page.getByRole('button', { name: 'Lista de interesse', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Lista de interesse' })).toBeVisible()
  }

  async function logout() {
    await page.getByRole('button', { name: 'Sair', exact: true }).click()
    await expect(signIn).toBeVisible()
  }

  const favorite = page.getByRole('link', { name: 'Emerald Ape #042', exact: true })

  await page.goto(nftPath)
  await login('colecionador@kurio.test')

  const saved = page.waitForResponse((response) =>
    response.request().method() === 'PUT' &&
    new URL(response.url()).pathname === '/api/account/favorites/emerald-ape-042',
  )
  await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
  expect((await saved).status()).toBe(200)
  await openFavorites()
  await expect(favorite).toBeVisible()

  await logout()
  await login('visitante@kurio.test')
  await openFavorites()
  await expect(page.getByText('Você ainda não tem NFTs favoritos.')).toBeVisible()
  await expect(favorite).toHaveCount(0)

  await logout()
  await login('colecionador@kurio.test')
  await openFavorites()
  await expect(favorite).toBeVisible()
})
