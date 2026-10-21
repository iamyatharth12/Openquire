import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { themeManager, THEME_STORAGE_KEY } from '../context/ThemeContext';

describe('Theme Manager & Dark Mode Persistence', () => {
  beforeEach(() => {
    // Mock basic window and document if not present in Node test environment
    if (typeof globalThis.window === 'undefined') {
      (globalThis as any).window = {
        matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
      };
    }
    const classListSet = new Set<string>();
    (globalThis as any).document = {
      documentElement: {
        classList: {
          add: (cls: string) => classListSet.add(cls),
          remove: (cls: string) => classListSet.delete(cls),
          contains: (cls: string) => classListSet.has(cls),
          toggle: (cls: string, force?: boolean) => {
            if (force === true) classListSet.add(cls);
            else if (force === false) classListSet.delete(cls);
            else if (classListSet.has(cls)) classListSet.delete(cls);
            else classListSet.add(cls);
          },
        },
        setAttribute: (_name: string, _val: string) => {},
        style: {} as any,
      },
      body: {
        classList: {
          add: (cls: string) => classListSet.add(cls),
          remove: (cls: string) => classListSet.delete(cls),
          contains: (cls: string) => classListSet.has(cls),
        },
      },
    };

    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) || null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    };
  });

  it('1. should default to light theme when no storage preference exists', () => {
    const current = themeManager.getTheme();
    assert.equal(current, 'light');
  });

  it('2. should toggle theme to dark and update document classes and localStorage', () => {
    assert.equal(themeManager.getTheme(), 'light');

    const next = themeManager.toggleTheme();
    assert.equal(next, 'dark');
    assert.equal(localStorage.getItem(THEME_STORAGE_KEY), 'dark');
    assert.equal(document.documentElement.classList.contains('dark'), true);
  });

  it('3. should toggle back to light theme on subsequent call', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    document.documentElement.classList.add('dark');

    const next = themeManager.toggleTheme();
    assert.equal(next, 'light');
    assert.equal(localStorage.getItem(THEME_STORAGE_KEY), 'light');
    assert.equal(document.documentElement.classList.contains('dark'), false);
  });

  it('4. should support explicit setTheme', () => {
    themeManager.setTheme('dark');
    assert.equal(localStorage.getItem(THEME_STORAGE_KEY), 'dark');
    assert.equal(document.documentElement.classList.contains('dark'), true);

    themeManager.setTheme('light');
    assert.equal(localStorage.getItem(THEME_STORAGE_KEY), 'light');
    assert.equal(document.documentElement.classList.contains('dark'), false);
  });
});

describe('Quick Command Palette Shortcuts & Specifications', () => {
  it('5. should correctly format shortcut based on operating system platform', () => {
    const isMacPlatform = (platform: string) => /Mac|iPod|iPhone|iPad/.test(platform);

    assert.equal(isMacPlatform('MacIntel'), true);
    assert.equal(isMacPlatform('MacPPC'), true);
    assert.equal(isMacPlatform('Win32'), false);
    assert.equal(isMacPlatform('Linux x86_64'), false);

    const getShortcut = (platform: string) => isMacPlatform(platform) ? '⌘K' : 'Ctrl+K';
    assert.equal(getShortcut('MacIntel'), '⌘K');
    assert.equal(getShortcut('Win32'), 'Ctrl+K');
    assert.equal(getShortcut('Linux x86_64'), 'Ctrl+K');
  });

  it('6. should match command hotkey event triggers for Cmd+K and Ctrl+K', () => {
    const isCommandHotkey = (e: { metaKey: boolean; ctrlKey: boolean; key: string }) => {
      return (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
    };

    assert.equal(isCommandHotkey({ metaKey: true, ctrlKey: false, key: 'k' }), true);
    assert.equal(isCommandHotkey({ metaKey: false, ctrlKey: true, key: 'k' }), true);
    assert.equal(isCommandHotkey({ metaKey: false, ctrlKey: true, key: 'K' }), true);
    assert.equal(isCommandHotkey({ metaKey: false, ctrlKey: false, key: 'k' }), false);
    assert.equal(isCommandHotkey({ metaKey: true, ctrlKey: false, key: 'j' }), false);
  });
});
