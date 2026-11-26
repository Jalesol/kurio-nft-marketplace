import { expect, test } from '@playwright/test'

test('persiste favoritos e restaura o estado quando remover falha', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  const login = page.getByRole('dialog', { name: 'Acesso à Kurio' })
  await login.getByLabel('E-mail').fill('colecionador@kurio.test')
  await login.getByLabel('Senha', { exact: true }).fill('KurioDemo123')
  await login.getByRole('button', { name: 'Entrar', exact: true }).click()

  const account = page.getByRole('link', { name: 'Minha conta' })
  await expect(account).toBeVisible()

  const added = page.waitForResponse((response) =>
    response.request().method() === 'PUT' &&
    new URL(response.url()).pathname === '/api/account/favorites/emerald-ape-042',
  )
  await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
  expect((await added).status()).toBe(200)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeEnabled()

  await page.evaluate(() => sessionStorage.setItem('kurio:fail-next-favorite', '1'))
  await page.getByRole('button', { name: 'Remover dos favoritos' }).click()
  await expect(page.getByRole('alert').filter({
    hasText: 'Não foi possível atualizar seus favoritos',
  })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeEnabled()

  await account.click()
  await page.getByRole('button', { name: 'Lista de interesse' }).click()
  await expect(page.getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()

  const removed = page.waitForResponse((response) =>
    response.request().method() === 'DELETE' &&
    new URL(response.url()).pathname === '/api/account/favorites/emerald-ape-042',
  )
  await page.getByRole('button', { name: 'Remover Emerald Ape #042 dos favoritos' }).click()
  expect((await removed).status()).toBe(200)
  await expect(page.getByText('Você ainda não tem NFTs favoritos.')).toBeVisible()
})
