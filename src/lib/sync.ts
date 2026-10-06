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

const SCROLL_SCRIPT = `
(() => {
  if (window.__pixelgridSyncInstalled) return;
  window.__pixelgridSyncInstalled = true;
  window.__pixelgridIsSyncing = false;

  const post = (channel, payload) => {
    try {
      window.postMessage({ channel, payload, __pixelgrid: true }, '*');
    } catch (_) {}
  };

  window.addEventListener('scroll', () => {
    if (window.__pixelgridIsSyncing) return;
    const maxX = Math.max(document.documentElement.scrollWidth - window.innerWidth, 1);
    const maxY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    post('pixelgrid-scroll', {
      ratioX: window.scrollX / maxX,
      ratioY: window.scrollY / maxY,
    });
  }, { passive: true });

  window.addEventListener('click', (event) => {
    if (window.__pixelgridIsSyncing) return;
    post('pixelgrid-pointer', {
      type: 'click',
      ratioX: event.clientX / Math.max(window.innerWidth, 1),
      ratioY: event.clientY / Math.max(window.innerHeight, 1),
    });
  }, true);

  window.addEventListener('mousemove', (event) => {
    if (window.__pixelgridIsSyncing) return;
    if (!event.metaKey && !event.ctrlKey) return;
    post('pixelgrid-pointer', {
      type: 'mousemove',
      ratioX: event.clientX / Math.max(window.innerWidth, 1),
      ratioY: event.clientY / Math.max(window.innerHeight, 1),
    });
  }, { passive: true });

  window.__pixelgridApplyScroll = (ratioX, ratioY) => {
    window.__pixelgridIsSyncing = true;
    const maxX = Math.max(document.documentElement.scrollWidth - window.innerWidth, 0);
    const maxY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    window.scrollTo(maxX * ratioX, maxY * ratioY);
    requestAnimationFrame(() => {
      window.__pixelgridIsSyncing = false;
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
  return `window.__pixelgridApplyScroll && window.__pixelgridApplyScroll(${ratioX}, ${ratioY});`
}

export function getApplyPointerScript(
  type: 'click' | 'mousemove',
  ratioX: number,
  ratioY: number,
) {
  return `window.__pixelgridApplyPointer && window.__pixelgridApplyPointer(${JSON.stringify(type)}, ${ratioX}, ${ratioY});`
}
