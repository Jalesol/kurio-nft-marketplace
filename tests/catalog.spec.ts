import { expect, test } from '@playwright/test'

test('combina busca, coleção e rede e mantém os filtros após atualizar', async ({ page }) => {
  await page.goto('/')

  const catalog = page.getByRole('region', { name: 'Catálogo de NFTs' })
  const search = catalog.getByRole('searchbox', { name: 'Buscar NFTs' })
  const collection = 'input[name="collection"][value="Música"]'
  const network = 'input[name="network"][value="Ethereum"]'

  await search.fill('Golden')
  await catalog.locator(`label:has(${collection})`).click()
  await catalog.locator(`label:has(${network})`).click()
  await expect(catalog.locator(collection)).toBeChecked()
  await expect(catalog.locator(network)).toBeChecked()
  await catalog.getByRole('button', { name: 'Aplicar', exact: true }).click()

  const results = catalog.getByRole('list').getByRole('link')
  await expect(results).toHaveCount(1)
  await expect(results.first()).toContainText('Golden Signal #160')

  const params = new URL(page.url()).searchParams
  expect(params.get('q')).toBe('Golden')
  expect(params.get('collection')).toBe('Música')
  expect(params.get('network')).toBe('Ethereum')

  await page.reload()
  await expect(search).toHaveValue('Golden')
  await expect(catalog.locator(collection)).toBeChecked()
  await expect(catalog.locator(network)).toBeChecked()
  await expect(results).toHaveCount(1)
  await expect(results.first()).toContainText('Golden Signal #160')
})

test('ordena por preço, reinicia a paginação e restaura o catálogo pelo histórico', async ({ page }) => {
  await page.goto('/')

  const catalog = page.getByRole('region', { name: 'Catálogo de NFTs' })
  const pagination = catalog.getByRole('navigation', { name: 'Paginação do catálogo' })
  const secondPage = pagination.getByRole('link', { name: 'Página 2', exact: true })
  const firstPage = pagination.getByRole('link', { name: 'Página 1', exact: true })
  const sort = catalog.getByRole('combobox', { name: /Ordenar por/ })
  const cards = catalog.getByRole('list').getByRole('link')

  await secondPage.click()
  await expect(secondPage).toHaveAttribute('aria-current', 'page')
  await expect(cards).toHaveCount(9)
  expect(new URL(page.url()).searchParams.get('page')).toBe('2')
  const secondPageNames = await cards.getByRole('heading').allTextContents()

  await sort.selectOption('price-asc')
  await expect(firstPage).toHaveAttribute('aria-current', 'page')
  await expect(cards).toHaveCount(9)
  expect(new URL(page.url()).searchParams.get('sort')).toBe('price-asc')
  expect(new URL(page.url()).searchParams.has('page')).toBe(false)

  const priceLabels = cards.getByText(/^\d+(?:\.\d+)? ETH$/)
  const priceTexts = await priceLabels.allTextContents()
  const prices = priceTexts.map((text) => Number(text.replace(' ETH', '')))
  expect(prices).toHaveLength(9)
  expect(new Set(prices).size).toBeGreaterThan(1)
  expect(prices).toEqual([...prices].sort((left, right) => left - right))

  await page.goBack()
  await expect(secondPage).toHaveAttribute('aria-current', 'page')
  await expect(sort).toHaveValue('recent')
  await expect(cards.getByRole('heading')).toHaveText(secondPageNames)

  await page.goForward()
  await expect(firstPage).toHaveAttribute('aria-current', 'page')
  await expect(sort).toHaveValue('price-asc')
  await expect(priceLabels).toHaveText(priceTexts)
})
