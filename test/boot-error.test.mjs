// The inline boot-error overlay in index.html: a blank-page failure (module
// parse error on an old browser, blocked storage, failed script fetch) must
// surface as a visible error + support mailto instead of a silent white screen.
// jsdom runs the inline classic script but not the ES module — exactly the
// situation on a browser whose module load failed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const boot = () =>
  new JSDOM(html, { runScripts: 'dangerously', url: 'https://www.doremingo.com/daily/#/daily' });

const fireError = (window, init) =>
  window.dispatchEvent(new window.ErrorEvent('error', init));

test('uncaught error before boot shows the overlay with the message and support mailto', () => {
  const { window } = boot();
  fireError(window, { message: 'Unexpected reserved word', filename: 'js/main.js', lineno: 26 });

  const box = window.document.getElementById('boot-error');
  assert.ok(box, 'overlay rendered');
  assert.match(box.textContent, /could not start/);
  assert.match(box.textContent, /Unexpected reserved word/);
  assert.match(box.textContent, /js\/main\.js:26/);
  assert.match(box.textContent, /doremingo\.com\/daily/); // page URL in the report

  const mail = box.querySelector('a[href^="mailto:doremingo@okdo.co.uk"]');
  assert.ok(mail, 'mailto link present');
  assert.match(decodeURIComponent(mail.href), /Unexpected reserved word/);
});

test('only the first error renders — no overlay stacking', () => {
  const { window } = boot();
  fireError(window, { message: 'first' });
  fireError(window, { message: 'second' });
  const boxes = window.document.querySelectorAll('#boot-error');
  assert.equal(boxes.length, 1);
  assert.match(boxes[0].textContent, /first/);
});

test('errors after boot are ignored', () => {
  const { window } = boot();
  window.__doremingoBooted = true;
  fireError(window, { message: 'late in-app error' });
  assert.equal(window.document.getElementById('boot-error'), null);
});

test('unhandled promise rejection before boot shows the overlay', () => {
  const { window } = boot();
  const e = new window.Event('unhandledrejection');
  e.reason = new Error('SecurityError: localStorage blocked');
  window.dispatchEvent(e);
  const box = window.document.getElementById('boot-error');
  assert.ok(box, 'overlay rendered');
  assert.match(box.textContent, /localStorage blocked/);
});

test('failed stylesheet or script fetch shows the overlay; other resources stay quiet', () => {
  const { window } = boot();
  const doc = window.document;

  // an <img> failing must NOT trigger it
  const img = doc.createElement('img');
  img.src = 'https://www.doremingo.com/nope.png';
  doc.body.appendChild(img);
  img.dispatchEvent(new window.Event('error', { bubbles: false }));
  assert.equal(doc.getElementById('boot-error'), null);

  // the stylesheet failing must
  const link = doc.querySelector('link[rel="stylesheet"]');
  link.dispatchEvent(new window.Event('error', { bubbles: false }));
  const box = doc.getElementById('boot-error');
  assert.ok(box, 'overlay rendered');
  assert.match(box.textContent, /Failed to load/);
  assert.match(box.textContent, /style\.css/);
});
