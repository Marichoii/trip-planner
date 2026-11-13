import test from 'node:test';
import assert from 'node:assert/strict';
import { keyboardOpen } from '../src/js/viewport.js';
import { proposalDiff, mochiReview, mochiProposal } from '../src/js/mochi-components.js';
import { REVIEW_OK } from '../src/js/mochi-contracts.js';
import { proposal, review } from './fixtures/mochi.js';

test('teclado virtual só conta como aberto com campo de texto em foco', () => {
  assert.equal(keyboardOpen(844, 480, { tagName: 'TEXTAREA' }), true);
  assert.equal(keyboardOpen(844, 480, { tagName: 'INPUT', type: 'search' }), true);
  assert.equal(keyboardOpen(844, 480, { tagName: 'INPUT', type: 'checkbox' }), false);
  assert.equal(keyboardOpen(844, 780, { tagName: 'TEXTAREA' }), false);
  assert.equal(keyboardOpen(844, 480, null), false);
});

test('comparação identifica cidades adicionadas, removidas e noites alteradas', () => {
  const current = {
    bases: [
      { destinationId: 'osaka', city: 'Osaka', nights: 11 },
      { destinationId: 'nagano', city: 'Nagano', nights: 2 },
      { destinationId: null, city: 'Tóquio', nights: 11 },
    ],
    days: [{ day: 1, activities: [{ title: 'Chegada', free: false }] }],
  };
  const data = {
    ...proposal(),
    bases: [
      { destinationId: 'tokyo', nights: 14, reason: 'x' },
      { destinationId: 'osaka', nights: 10, reason: 'y' },
      { destinationId: 'kyoto', nights: 0, reason: 'z' },
    ],
  };
  const diff = proposalDiff(data, current);
  const by = Object.fromEntries(diff.rows.map((r) => [r.name, r]));
  assert.equal(by['Tóquio'].status, 'changed');
  assert.equal(by['Tóquio'].was, 11);
  assert.equal(by['Osaka'].status, 'changed');
  assert.equal(by['Kyoto'].status, 'added');
  assert.equal(by['Nagano'].status, 'removed');
  assert.deepEqual([diff.added, diff.removed, diff.changed], [1, 1, 2]);
  assert.equal(diff.days[0].changed, true);
});

test('comparador e revisão escapam o texto vindo do modelo', () => {
  const html = mochiProposal(
    { ...proposal(), title: '<img src=x onerror=alert(1)>' },
    { bases: [], days: [] },
  );
  assert.ok(!html.includes('<img'));
  const reviewHtml = mochiReview(
    { ...review, positives: [{ text: '<script>x</script>', certainty: 'suggestion' }] },
    ['<b>check</b>'],
  );
  assert.ok(!reviewHtml.includes('<script>'));
  assert.ok(!reviewHtml.includes('<b>check'));
});

test('verificação sem alertas aparece como ponto forte, não como atenção', () => {
  const html = mochiReview(review, [REVIEW_OK]);
  assert.match(html, /Verificado pelo aplicativo/);
  assert.match(html, /Nada a sinalizar nas verificações automáticas/);
  const issues = mochiReview(review, ['Mais de três atividades nos dias 2.']);
  assert.match(issues, /is-checks/);
});
