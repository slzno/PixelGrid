export type SyncScrollPayload = {
  sourceId: string
  ratioX: number
  ratioY: number
}

export type SyncPointerPayload = {
  sourceId: string
  type: 'click' | 'mousemove'
  ratioX: number
  ratioY: number
}

/**
 * Installed in each guest page.
 * Posts scroll/click via guest preload (__pixelgridHost) or console fallback.
 * Capture-phase scroll + primary scroller detection so nested overflow syncs.
 */
const SCROLL_SCRIPT = `
(() => {
  const SYNC_VERSION = 2;
  if (window.__pixelgridSyncVersion === SYNC_VERSION) return;
  window.__pixelgridSyncVersion = SYNC_VERSION;
  window.__pixelgridSyncInstalled = true;
  window.__pixelgridIsSyncing = false;

  // Drop prior listeners if an older sync script was injected.
  if (typeof window.__pixelgridSyncTeardown === 'function') {
    try { window.__pixelgridSyncTeardown(); } catch (_) {}
  }

  const post = (channel, payload) => {
    try {
      if (window.__pixelgridHost && typeof window.__pixelgridHost.send === 'function') {
        window.__pixelgridHost.send(channel, payload);
        return;
      }
    } catch (_) {}
    try {
      console.log('__PIXELGRID__' + JSON.stringify({ channel, payload }));
    } catch (_) {}
  };

  const metrics = (el) => {
    if (!el) return { el: null, ratioX: 0, ratioY: 0, maxX: 0, maxY: 0 };
    const maxX = Math.max((el.scrollWidth || 0) - (el.clientWidth || 0), 0);
    const maxY = Math.max((el.scrollHeight || 0) - (el.clientHeight || 0), 0);
    return {
      el,
      maxX,
      maxY,
      ratioX: maxX > 0 ? el.scrollLeft / maxX : 0,
      ratioY: maxY > 0 ? el.scrollTop / maxY : 0,
    };
  };

  const docScroller = () =>
    document.scrollingElement || document.documentElement || document.body;

  const isScrollable = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const style = window.getComputedStyle(el);
    const ox = style.overflowX;
    const oy = style.overflowY;
    const canX = (ox === 'auto' || ox === 'scroll' || ox === 'overlay') &&
      el.scrollWidth > el.clientWidth + 1;
    const canY = (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      el.scrollHeight > el.clientHeight + 1;
    return canX || canY;
  };

  const findPrimaryScroller = () => {
    const doc = docScroller();
    const docM = metrics(doc);
    if (docM.maxY > 1 || docM.maxX > 1) return doc;

    let best = null;
    let bestArea = 0;
    const all = document.querySelectorAll('body *');
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      if (!isScrollable(el)) continue;
      const area = el.clientWidth * el.clientHeight;
      if (area > bestArea) {
        best = el;
        bestArea = area;
      }
    }
    return best || doc;
  };

  const scrollerFromEvent = (event) => {
    let t = event && event.target;
    if (t === document || t === window) t = docScroller();
    if (t && t.nodeType === 9) t = docScroller();
    if (t && t.nodeType === 1) {
      let cur = t;
      while (cur && cur !== document.documentElement) {
        if (isScrollable(cur) || cur === document.body || cur === document.documentElement) {
          const m = metrics(cur === document.body ? docScroller() : cur);
          if (m.maxY > 0 || m.maxX > 0) return m.el;
        }
        cur = cur.parentElement;
      }
    }
    return findPrimaryScroller();
  };

  let scrollRaf = 0;
  let pendingEl = null;

  const emitScroll = () => {
    scrollRaf = 0;
    if (window.__pixelgridIsSyncing) return;
    const el = pendingEl || findPrimaryScroller();
    pendingEl = null;
    const { ratioX, ratioY } = metrics(el);
    post('pixelgrid-scroll', { ratioX, ratioY });
  };

  const onScroll = (event) => {
    if (window.__pixelgridIsSyncing) return;
    pendingEl = scrollerFromEvent(event);
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(emitScroll);
  };

  const onClick = (event) => {
    if (window.__pixelgridIsSyncing) return;
    post('pixelgrid-pointer', {
      type: 'click',
      ratioX: event.clientX / Math.max(window.innerWidth, 1),
      ratioY: event.clientY / Math.max(window.innerHeight, 1),
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('click', onClick, true);

  window.__pixelgridSyncTeardown = () => {
    window.removeEventListener('scroll', onScroll, true);
    document.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('click', onClick, true);
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
  };

  window.__pixelgridApplyScroll = (ratioX, ratioY) => {
    window.__pixelgridIsSyncing = true;
    const el = findPrimaryScroller();
    const { maxX, maxY } = metrics(el);
    const x = maxX * Math.min(1, Math.max(0, Number(ratioX) || 0));
    const y = maxY * Math.min(1, Math.max(0, Number(ratioY) || 0));
    try {
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ left: x, top: y, behavior: 'auto' });
      } else {
        el.scrollLeft = x;
        el.scrollTop = y;
      }
    } catch (_) {
      try {
        el.scrollLeft = x;
        el.scrollTop = y;
      } catch (__) {}
    }
    if (el === docScroller()) {
      try { window.scrollTo(x, y); } catch (_) {}
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.__pixelgridIsSyncing = false;
      });
    });
  };

  window.__pixelgridApplyPointer = (type, ratioX, ratioY) => {
    window.__pixelgridIsSyncing = true;
    const x = Math.max(0, Math.min(window.innerWidth - 1, ratioX * window.innerWidth));
    const y = Math.max(0, Math.min(window.innerHeight - 1, ratioY * window.innerHeight));
    const target = document.elementFromPoint(x, y) || document.body;
    const eventInit = {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      view: window,
    };
    if (type === 'click') {
      target.dispatchEvent(new MouseEvent('click', eventInit));
    } else {
      target.dispatchEvent(new MouseEvent('mousemove', eventInit));
    }
    requestAnimationFrame(() => {
      window.__pixelgridIsSyncing = false;
    });
  };
})();
`

export function getSyncInstallScript() {
  return SCROLL_SCRIPT
}

export function getApplyScrollScript(ratioX: number, ratioY: number) {
  const x = Number.isFinite(ratioX) ? ratioX : 0
  const y = Number.isFinite(ratioY) ? ratioY : 0
  return `window.__pixelgridApplyScroll && window.__pixelgridApplyScroll(${x}, ${y});`
}

export function getApplyPointerScript(
  type: 'click' | 'mousemove',
  ratioX: number,
  ratioY: number,
) {
  const x = Number.isFinite(ratioX) ? ratioX : 0
  const y = Number.isFinite(ratioY) ? ratioY : 0
  return `window.__pixelgridApplyPointer && window.__pixelgridApplyPointer(${JSON.stringify(type)}, ${x}, ${y});`
}

export type SyncBridgeMessage = {
  channel: string
  payload: Record<string, number | string>
}

export function parseSyncBridgeArgs(args: unknown[]): SyncBridgeMessage | null {
  const first = args[0]
  if (!first || typeof first !== 'object') return null
  const data = first as { channel?: unknown; payload?: unknown }
  if (typeof data.channel !== 'string' || !data.payload || typeof data.payload !== 'object') {
    return null
  }
  return {
    channel: data.channel,
    payload: data.payload as Record<string, number | string>,
  }
}

export function parseSyncConsoleMessage(message: string): SyncBridgeMessage | null {
  const marker = '__PIXELGRID__'
  const idx = message.indexOf(marker)
  if (idx === -1) return null
  try {
    const parsed = JSON.parse(message.slice(idx + marker.length)) as SyncBridgeMessage
    if (typeof parsed.channel !== 'string' || !parsed.payload) return null
    return parsed
  } catch {
    return null
  }
}

export function toGuestPreloadUrl(filePath: string) {
  if (!filePath) return ''
  if (filePath.startsWith('file:')) return filePath
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized.startsWith('/')) return `file://${normalized}`
  return `file:///${normalized}`
}
