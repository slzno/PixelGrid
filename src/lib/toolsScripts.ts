export type InspectPayload = {
  tag: string
  id: string
  classes: string
  width: number
  height: number
  x: number
  y: number
  text: string
}

export function getInspectInstallScript() {
  return `
(() => {
  if (window.__prixelgridInspectInstalled) {
    window.__prixelgridInspectEnabled = true;
    return;
  }
  window.__prixelgridInspectInstalled = true;
  window.__prixelgridInspectEnabled = true;

  const highlight = document.createElement('div');
  highlight.id = '__prixelgrid-inspect-hl';
  Object.assign(highlight.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483646',
    border: '2px solid #3ddeb5',
    background: 'rgba(61, 222, 181, 0.12)',
    display: 'none',
  });
  document.documentElement.appendChild(highlight);

  const label = document.createElement('div');
  label.id = '__prixelgrid-inspect-label';
  Object.assign(label.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483647',
    background: '#12141a',
    color: '#e8ebf2',
    border: '1px solid #3ddeb5',
    borderRadius: '6px',
    padding: '4px 8px',
    font: '12px/1.3 IBM Plex Mono, ui-monospace, monospace',
    display: 'none',
  });
  document.documentElement.appendChild(label);

  const describe = (el) => {
    const rect = el.getBoundingClientRect();
    const text = (el.innerText || '').trim().slice(0, 80);
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      classes: typeof el.className === 'string' ? el.className : '',
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      text,
    };
  };

  const onMove = (event) => {
    if (!window.__prixelgridInspectEnabled) return;
    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (!el || el === highlight || el === label) return;
    const rect = el.getBoundingClientRect();
    Object.assign(highlight.style, {
      display: 'block',
      left: rect.left + 'px',
      top: rect.top + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
    });
    const info = describe(el);
    label.textContent = info.tag + (info.id ? '#' + info.id : '') + ' · ' + info.width + '×' + info.height;
    Object.assign(label.style, {
      display: 'block',
      left: Math.min(event.clientX + 12, window.innerWidth - 180) + 'px',
      top: Math.max(8, event.clientY - 28) + 'px',
    });
  };

  const onClick = (event) => {
    if (!window.__prixelgridInspectEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (!el || el === highlight || el === label) return;
    console.log('__PRIXELGRID_INSPECT__' + JSON.stringify(describe(el)));
  };

  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('click', onClick, true);

  window.__prixelgridSetInspect = (enabled) => {
    window.__prixelgridInspectEnabled = !!enabled;
    if (!enabled) {
      highlight.style.display = 'none';
      label.style.display = 'none';
    }
  };
})();
`
}

export function getInspectEnableScript(enabled: boolean) {
  return `
${getInspectInstallScript()}
window.__prixelgridSetInspect && window.__prixelgridSetInspect(${enabled ? 'true' : 'false'});
`
}

export function getDesignOverlayScript(enabled: boolean, gridSize: number) {
  return `
(() => {
  const id = '__prixelgrid-design-grid';
  const existing = document.getElementById(id);
  if (!${enabled}) {
    if (existing) existing.remove();
    return;
  }
  const size = ${Math.max(4, Math.round(gridSize))};
  const node = existing || document.createElement('div');
  node.id = id;
  Object.assign(node.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '2147483645',
    backgroundImage:
      'linear-gradient(to right, rgba(184,240,0,0.22) 1px, transparent 1px),' +
      'linear-gradient(to bottom, rgba(184,240,0,0.22) 1px, transparent 1px)',
    backgroundSize: size + 'px ' + size + 'px',
  });
  if (!existing) document.documentElement.appendChild(node);
})();
`
}

export function getEyedropperScript() {
  return `
(async () => {
  try {
    if (window.EyeDropper) {
      const result = await new EyeDropper().open();
      console.log('__PRIXELGRID_COLOR__' + JSON.stringify({ color: result.sRGBHex }));
      return result.sRGBHex;
    }
    return null;
  } catch (_) {
    return null;
  }
})();
`
}
