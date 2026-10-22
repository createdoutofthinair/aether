const pages = {
 'nature-studio.html':'nature', 'index.html':'explorer', 'explorer.html':'explorer', 'material-editor.html':'materials',
 'hud-design.html':'hud', 'logo-design.html':'studio', 'webgpu-preview.html':'renderer',
 'nebula-generator.html':'nebula', 'credits.html':'credits'
};
const file = location.pathname.split('/').pop();
const route = pages[file] || 'explorer';
if (window === window.top) {
 location.replace('./index.html#/' + route);
} else {
 document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || link.target === '_blank') return;
  const url = new URL(link.href);
  const target = pages[url.pathname.split('/').pop()];
  if(url.origin === location.origin && target && !url.hash && url.pathname.slice(0,url.pathname.lastIndexOf('/')) === location.pathname.slice(0,location.pathname.lastIndexOf('/'))) {
   event.preventDefault();
   parent.postMessage({type:'aether:navigate',route:target}, location.origin);
  }
 });
}
