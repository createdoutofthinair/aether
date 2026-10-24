export const routes = {
 'surface-environment': ['surface-environment.html', 'Surface environment'],
 architecture: ['architecture-lab.html', 'Architecture Lab'],
 city: ['city-lab.html', 'City Buildings Lab'],
 forest: ['forest-lab.html', 'Forest Lab'],
 ships: ['spaceship-studio.html', 'Spaceship Studio'],
 explorer: ['explorer.html', 'Planet explorer'],
 materials: ['material-editor.html', 'Material Designer'],
 nature: ['nature-studio.html', 'Nature Studio'],
 hud: ['hud-design.html', 'HUD design'],
 studio: ['logo-design.html', 'Object studio'],
 renderer: ['webgpu-preview.html', 'Renderer preview'],
 nebula: ['nebula-generator.html', 'Nebula generator'],
 credits: ['credits.html', 'Production credits']
};
const host = document.getElementById('workspace');
const dev = document.getElementById('dev');
let current;
function render() {
 const requested = location.hash.slice(2).split('?')[0];
 const route = Object.hasOwn(routes, requested) ? requested : 'credits';
 if (requested !== route) { location.replace('#/' + route); return; }
 const query=new URLSearchParams(location.hash.split('?')[1]||''),materialQuery=new URLSearchParams();if(route==='materials'){for(const key of ['tab','group'])if(query.has(key))materialQuery.set(key,query.get(key));}const key=route+'?'+materialQuery;if(key===current)return;current=key;
 const [file, label] = routes[route];
 const frame = document.createElement('iframe');
 frame.title = 'Aether · ' + label;
 frame.allow = 'autoplay; fullscreen';
 frame.src = file + '?embedded=1'+(materialQuery.size?'&'+materialQuery:'');
 // Destroy the previous browsing context, including GPU contexts, workers and audio.
 host.replaceChildren(frame);
 document.title = 'Aether · ' + label;
 document.getElementById('workspaceName').textContent = label;
 document.querySelectorAll('[data-route]').forEach(a => {
  if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
  else a.removeAttribute('aria-current');
 });
 dev.classList.toggle('active', ['surface-environment','hud','studio','renderer','nebula','nature','ships','forest','city','architecture'].includes(route));
 dev.open = false;
}
window.addEventListener('hashchange', render);
window.addEventListener('keydown', e => { if(e.key === 'Escape') dev.open = false; });
document.addEventListener('pointerdown', e => { if(!dev.contains(e.target)) dev.open = false; });
window.addEventListener('message', e => {
 if(e.origin !== location.origin || e.source !== host.querySelector('iframe')?.contentWindow) return;
 if(e.data?.type === 'aether:navigate' && Object.hasOwn(routes, e.data.route)) location.hash = '/' + e.data.route;
});
render();
