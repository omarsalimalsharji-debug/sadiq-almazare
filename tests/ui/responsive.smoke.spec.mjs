import { test, expect } from '@playwright/test';

test('home and farmer challenge remain usable across phone and desktop widths', async ({ page }) => {
  const widths = [320, 360, 390, 768, 1280];
  let generatedQuestionRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/games/generate-questions') {
      generatedQuestionRequests += 1;
    }
  });

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
    const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(homeOverflow, `Home horizontally overflows at ${width}px`).toBeLessThanOrEqual(1);
  }

  await page.getByRole('button', { name: /ابدأ التحدي/ }).first().click();
  await expect(page.getByText('تحدي المعرفة الزراعية', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ابدأ التحدي' }).first().click();
  await expect(page.getByTestId('challenge-question')).toBeVisible();
  expect(generatedQuestionRequests, 'AI generation must stay off by default').toBe(0);

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const challengeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(challengeOverflow, `Challenge horizontally overflows at ${width}px`).toBeLessThanOrEqual(1);
  }

  await page.getByTestId('challenge-answer').first().click();
  await expect(page.getByText('الشرح والتوضيح الزراعي:')).toBeVisible();
});

test('image challenge displays a local SVG illustration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /ابدأ التحدي/ }).first().click();

  const imageChallenge = page.getByRole('heading', { name: 'تعرّف على الصورة' });
  await expect(imageChallenge).toBeVisible();
  const card = imageChallenge.locator('xpath=../..');
  await card.getByRole('button', { name: 'ابدأ التحدي' }).click();

  const illustration = page.locator('figure img').first();
  await expect(illustration).toBeVisible();
  const imagePath = new URL(await illustration.getAttribute('src'), page.url()).pathname;
  expect(imagePath).toMatch(/^\/assets\/challenge\/[^/]+\.svg$/);
});

test('diagnosis and Flijan learning screens render on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByRole('button', { name: 'الفحص' }).click();
  await expect(page.getByRole('heading', { name: 'اكتشاف أمراض النباتات والحشرات' })).toBeVisible();
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'Diagnosis screen must fit a phone width').toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'فليجان' }).click();
  await expect(page.getByRole('heading', { name: 'استوديو فليجان التعليمي للمزارع العُماني' })).toBeVisible();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'Flijan learning screen must fit a phone width').toBeLessThanOrEqual(1);
});
