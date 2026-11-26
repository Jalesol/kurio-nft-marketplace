import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const nftId = 'emerald-ape-042'
const detailPath = `/api/nfts/${nftId}`
const scenarioKey = 'kurio:replay-nft-update'

async function updatePrice(page: Page, priceEth: string) {
  const status = await page.evaluate(async ({ nftId, priceEth }) => {
    const response = await fetch(`/api/mock/nfts/${nftId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceEth }),
    })

    return response.status
  }, { nftId, priceEth })

  expect(status).toBe(200)
}

test('ignora nft.updated duplicado e antigo sem consultar o detalhe de novo', async ({ page }) => {
  await page.goto(`/nfts/${nftId}`)
  const detail = page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })
  await expect(detail).toBeVisible()

  // Cria uma versão anterior válida e confirma que a conexão recebe eventos.
  await updatePrice(page, '1.49')
  await expect(page.getByText('1.49 ETH', { exact: true }).first()).toBeVisible()

  let detailRequests = 0
  page.on('request', (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === detailPath) {
      detailRequests += 1
    }
  })

  await page.evaluate((key) => sessionStorage.setItem(key, 'armed'), scenarioKey)
  await updatePrice(page, '1.79')
  await expect(page.getByText('1.79 ETH', { exact: true }).first()).toBeVisible()

  await page.waitForFunction((key) => sessionStorage.getItem(key) === 'done', scenarioKey)

  await expect(page.getByText('1.79 ETH', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('1.49 ETH', { exact: true })).toHaveCount(0)
  expect(detailRequests).toBe(1)
})
