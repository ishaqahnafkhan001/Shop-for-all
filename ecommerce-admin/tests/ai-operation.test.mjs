import test from 'node:test';
import assert from 'node:assert/strict';
import { aiSnapshot, createAiOperationState, createAiPatch, undoAiPatch } from '../src/utils/aiOperationState.js';

test('lost response retry preserves ID; intentional regenerate gets a new one; stale and out-of-order replies cannot apply', () => {
    const machine = createAiOperationState();
    const key = aiSnapshot({ entity: 'a', revision: 1, title: 'পোশাক' });
    const first = machine.begin('product.content', key);
    const retry = machine.begin('product.content', key, true);
    assert.equal(retry.id, first.id);
    assert.equal(first.controller.signal.aborted, true);
    assert.equal(machine.finish(first, key), false);
    assert.equal(machine.finish(retry, key), true);
    assert.equal(machine.canApply(key), true);
    assert.equal(machine.canApply(aiSnapshot({ entity: 'b' })), false);
    assert.throws(() => machine.begin('product.content', 'changed', true));
    const next = machine.begin('product.content', key);
    assert.notEqual(next.id, retry.id);
    machine.cancel();
    assert.equal(machine.finish(next, key), false);
});

test('Undo restores only fields from the last Apply and preserves subsequent edits and commerce fields', () => {
    const before = { title: 'A', seo: { title: 'Original', description: 'Original description' }, stock: 5, price: 100 };
    const after = { ...before, seo: { title: 'Generated', description: 'Generated description' } };
    const patch = createAiPatch(before, after);
    const current = { ...after, seo: { ...after.seo, title: 'Later manual edit' }, stock: 7 };
    const result = undoAiPatch(current, patch);
    assert.equal(result.value.seo.title, 'Later manual edit');
    assert.equal(result.value.seo.description, 'Original description');
    assert.equal(result.value.stock, 7);
    assert.equal(result.value.price, 100);
    assert.equal(result.conflicts, 1);
});
