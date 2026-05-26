import type { Key } from 'react';
import { App } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

// Antd's static `message.xxx()` helpers can't read context, so they ignore the
// active theme (toasts render light even in dark mode) and log a warning. We
// bridge the context-aware instance from <App> into a module-level holder and
// re-export a `message` object with the same API, so call sites stay unchanged.

let inst: MessageInstance | undefined;

/** Mount once inside antd's <App> so static `message` calls become theme-aware. */
export function MessageBridge() {
  const { message } = App.useApp();
  inst = message;
  return null;
}

function forward<Args extends unknown[]>(pick: (m: MessageInstance) => (...args: Args) => unknown) {
  return (...args: Args) => {
    if (!inst) return undefined as never;
    return pick(inst)(...args);
  };
}

export const message = {
  open: forward((m) => m.open),
  success: forward((m) => m.success),
  error: forward((m) => m.error),
  info: forward((m) => m.info),
  warning: forward((m) => m.warning),
  loading: forward((m) => m.loading),
  destroy: (key?: Key) => inst?.destroy(key),
} as unknown as MessageInstance;
