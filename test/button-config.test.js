import { describe, it, expect } from 'vitest';
import { shouldShowButton, BUTTON_MODES } from '../src/core/button-config.js';

const configured = { token: 't', databaseId: 'db', mapping: { title: 'Name' } };

describe('shouldShowButton', () => {
  it('モードの選択肢は always / android / off', () => {
    expect(BUTTON_MODES).toEqual(['always', 'android', 'off']);
  });

  it('未指定なら「常に」表示する', () => {
    expect(shouldShowButton(configured, 'mac')).toBe(true);
  });

  it.each([
    ['always', 'mac', true],
    ['always', 'android', true],
    ['android', 'android', true],
    ['android', 'mac', false],
    ['off', 'android', false],
  ])('mode=%s os=%s → %s', (mode, os, expected) => {
    expect(shouldShowButton({ ...configured, floatingButton: mode }, os)).toBe(expected);
  });

  it('未設定（トークンやDBが無い）なら表示しない', () => {
    expect(shouldShowButton(null, 'android')).toBe(false);
    expect(shouldShowButton({ ...configured, token: '' }, 'android')).toBe(false);
  });
});
