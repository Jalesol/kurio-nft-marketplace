import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const nftPath = '/nfts/emerald-ape-042'
const nftName = 'Emerald Ape #042'

test.use({ reducedMotion: 'reduce' })

async function openDetail(page: Page) {
  await page.goto(nftPath)
  await expect(page.getByRole('heading', { name: nftName, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Comprar', exact: true })).toBeEnabled()
}

async function openCartWithItem(page: Page) {
  await openDetail(page)
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  await expect(page).toHaveURL(/\/cart(?:[?#].*)?$/)
  const items = page.getByRole('region', { name: 'Itens do carrinho' })
  await expect(items.getByText(nftName, { exact: true })).toBeVisible()
}

async function openCheckout(page: Page) {
  await openCartWithItem(page)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Acesso à Kurio' })
  await dialog.getByLabel('E-mail', { exact: true }).fill('colecionador@kurio.test')
  await dialog.getByLabel('Senha', { exact: true }).fill('KurioDemo123')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('link', { name: 'Minha conta', exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeVisible()
}

async function capture(page: Page, filename: string) {
  await page.evaluate(async () => {
    const images = Array.from(document.images).filter((image) => image.getClientRects().length > 0)
    for (const image of images) image.loading = 'eager'

    await Promise.all(images.map((image) => image.decode()))
    await document.fonts.ready
  })

  await page.evaluate(() => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) {
      activeElement.blur()
    }
    window.scrollTo(0, 0)
  })
  await page.mouse.move(0, 0)

  await expect(page).toHaveScreenshot(filename, {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  })
}

test('regressão visual do início', async ({ page }) => {
  await page.goto('/')
  const catalog = page.getByRole('region', { name: 'Catálogo de NFTs' })
  await expect(catalog.getByRole('list').getByRole('link')).toHaveCount(9)
  await capture(page, 'inicio.png')
})

test('regressão visual do detalhe do NFT', async ({ page }) => {
  await openDetail(page)
  await capture(page, 'nft-detalhe.png')
})

test('regressão visual do carrinho', async ({ page }) => {
  await openCartWithItem(page)
  await capture(page, 'carrinho.png')
})

test('regressão visual do pagamento', async ({ page }) => {
  await openCheckout(page)
  await capture(page, 'pagamento.png')
})
