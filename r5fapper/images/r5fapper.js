// R5Fapper v18 — module commun pour les sites GoMo
;(() => {
  if (window.GoMoR5Fapper) return;
  const imageBase = () => (window.GOMO_R5FAPPER_CONFIG && window.GOMO_R5FAPPER_CONFIG.imageBase) || '/r5fapper/images/';
  const image = (state) => imageBase() + 'r5fapper-' + state + '.webp';
  function ensureCss(){ if(document.querySelector('link[data-r5fapper-css]')) return; const l=document.createElement('link'); l.rel='stylesheet'; l.href='/r5fapper/r5fapper.css'; l.dataset.r5fapperCss='1'; document.head.appendChild(l); }
  function init(options={}){ ensureCss(); window.GOMO_R5FAPPER_PAGE=options.page||'central'; document.dispatchEvent(new CustomEvent('gomo:r5fapper:init',{detail:options})); }
  window.GoMoR5Fapper={init,image};
})();
