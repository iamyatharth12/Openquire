import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractTextFromHtml } from '../server/htmlExtractor';

describe('HTML Text Extractor & Content Sanitizer', () => {
  it('should extract title and clean body text from HTML', () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>The Future of Clean Energy &amp; Hydrogen</title>
          <meta name="description" content="An empirical study of hydrogen fuel cells in 2026.">
          <style>body { color: red; }</style>
          <script>alert("malicious script");</script>
        </head>
        <body>
          <nav><a href="/">Home Menu Item</a></nav>
          <header><h1>Header banner</h1></header>
          <main>
            <article>
              <h2>Hydrogen Storage Milestones</h2>
              <p>Perovskite solar tandem cells achieved 33.9% power conversion efficiency in recent trials.</p>
              <p>Long-duration storage systems are reaching cost parity with peaking plants.</p>
            </article>
          </main>
          <footer>Copyright 2026 Energy Corp. All rights reserved.</footer>
        </body>
      </html>
    `;

    const extracted = extractTextFromHtml(rawHtml, 1000);

    assert.strictEqual(extracted.title, 'The Future of Clean Energy & Hydrogen');
    assert.strictEqual(extracted.description, 'An empirical study of hydrogen fuel cells in 2026.');
    assert.strictEqual(extracted.textContent.includes('alert('), false, 'Scripts must be stripped');
    assert.strictEqual(extracted.textContent.includes('color: red'), false, 'Styles must be stripped');
    assert.strictEqual(extracted.textContent.includes('Perovskite solar tandem cells'), true);
  });

  it('should truncate excessively long articles to max length boundary', () => {
    const longText = '<p>' + 'A'.repeat(5000) + '</p>';
    const extracted = extractTextFromHtml(longText, 500);

    assert.ok(extracted.textContent.length <= 505);
    assert.ok(extracted.textContent.endsWith('...'));
  });
});
