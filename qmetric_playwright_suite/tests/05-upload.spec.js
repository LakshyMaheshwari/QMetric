const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');
const path = require('node:path');
const fs = require('node:fs');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'sample_paper.csv');

test.describe('Paper upload form', () => {
  test('upload page loads for teacher', async ({ page }) => {
    await loginAs(page, 'teacher1', '/upload');
    await expect(page.getByText('Upload Paper & Details')).toBeVisible();
    await expect(page.getByText('Course Information')).toBeVisible();
    await expect(page.getByText('Course Modules')).toBeVisible();
  });

  test('upload form exposes the expected course fields', async ({ page }) => {
    await loginAs(page, 'teacher1', '/upload');
    for (const field of ['College Name', 'Branch', 'Year Of Study', 'Semester', 'Course Name', 'Course Code', 'Course Teacher']) {
      await expect(page.locator(`input[name="${field}"]`)).toBeVisible();
    }
  });

  test('submit remains disabled until a file is chosen', async ({ page }) => {
    await loginAs(page, 'teacher1', '/upload');
    await expect(page.getByRole('button', { name: /Submit Paper for Analysis/i })).toBeDisabled();
  });

  test('invalid file type is rejected client-side', async ({ page }) => {
    await loginAs(page, 'teacher1', '/upload');
    const file = path.join(__dirname, '..', 'fixtures', 'invalid.txt');
    await page.setInputFiles('#file-upload', file);
    await expect(page.getByText(/Please upload a valid Excel/i)).toBeVisible();
  });

  test('course outcome count controls render 1-20 range', async ({ page }) => {
    await loginAs(page, 'teacher1', '/upload');
    await expect(page.locator('input[placeholder*="Enter number"]').first()).toBeVisible();
  });

  test('more than 20 course outcomes shows validation error', async ({ page }) => {
    await loginAs(page, 'teacher1', '/upload');
    const label = page.getByText(/Number of Course Outcomes/i).first();
    const container = label.locator('..');
    const numberInput = container.locator('input[type="number"]').first();
    await numberInput.fill('21');
    await expect(page.getByText('Maximum 20 course outcomes allowed')).toBeVisible();
  });

  test('more than 20 modules shows validation error', async ({ page }) => {
    await loginAs(page, 'teacher1', '/upload');
    const label = page.getByText(/Number of Modules/i).first();
    const container = label.locator('..');
    const numberInput = container.locator('input[type="number"]').first();
    await numberInput.fill('21');
    await expect(page.getByText('Maximum 20 modules allowed')).toBeVisible();
  });

  test('module validation requires name and positive teaching hours', async ({ page }) => {
    await loginAs(page, 'teacher1', '/upload');
    const label = page.getByText(/Number of Modules/i).first();
    const container = label.locator('..');
    await container.locator('input[type="number"]').first().fill('1');
    await expect(page.getByText('Module 1', { exact: true })).toBeVisible();
  });

  test('sample CSV fixture is accepted by the file input', async ({ page }) => {
    await loginAs(page, 'teacher1', '/upload');
    await page.setInputFiles('#file-upload', fixturePath);
    await expect(page.getByText('sample_paper.csv')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove file' })).toBeVisible();
  });

  test('remove file clears selected upload', async ({ page }) => {
    await loginAs(page, 'teacher1', '/upload');
    await page.setInputFiles('#file-upload', fixturePath);
    await page.getByRole('button', { name: 'Remove file' }).click();
    await expect(page.getByText('Drop your file here')).toBeVisible();
  });
});
