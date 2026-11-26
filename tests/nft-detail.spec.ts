import { expect, test } from '@playwright/test'

test('abre o detalhe do NFT pelo endereço direto e respeita o limite da edição', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-042')

  await expect(page.getByRole('heading', {
    name: 'Emerald Ape #042',
    exact: true,
  })).toBeVisible()

  const buy = page.getByRole('button', { name: 'Comprar', exact: true })
  const increase = page.getByRole('button', { name: 'Aumentar quantidade' })
  const decrease = page.getByRole('button', { name: 'Diminuir quantidade' })
  const quantity = page.getByLabel('Quantidade selecionada', { exact: true })

  await expect(buy).toBeEnabled()
  await expect(quantity).toHaveText('1')
  await expect(decrease).toBeDisabled()
  await expect(page.getByRole('radio', { name: /1\/10.*Esgotada/ })).toBeDisabled()

  await increase.click()
  await increase.click()
  await expect(quantity).toHaveText('3')
  await expect(increase).toBeDisabled()

  await decrease.click()
  await expect(quantity).toHaveText('2')
  await expect(increase).toBeEnabled()
})

test('mostra um erro ao abrir o endereço de um NFT inexistente', async ({ page }) => {
  const nftId = 'nft-inexistente-teste'

  const missingNft = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/nfts/${nftId}` &&
    response.request().method() === 'GET',
  )

  await page.goto(`/nfts/${nftId}`)

  expect((await missingNft).status()).toBe(404)
  await expect(page.getByText(/NFT não encontrado/i).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Comprar', exact: true })).toHaveCount(0)
})
