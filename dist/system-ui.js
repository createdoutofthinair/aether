import {generateSystem,orbitalPosition,surfaceProfile} from './solar.js?v=shadows-1';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const palette={'Scorched rock':'#b66b4d','Arid rock':'#cdad73','Temperate rock':'#9db8b1','Oceanic world':'#599cc4','Ice world':'#b9d8e5','Gas giant':'#d6b58f','Ice giant':'#7fbccd'};
function element(tag,attrs,parent){const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);parent.appendChild(el);return el;}
export function createSystemExplorer(){
 let system=generateSystem(),selected=system.planets[2],active=selected,visit=null,unavailable=false,days=0,playing=false,raf=0,last=0;
 const profiles=new Map(),dialog=$('solarSystem'),svg=$('orbitMap'),bodies=[];
 const radius=d=>Math.log1p(d/(Math.sqrt(system.star.luminosity)*.16))/Math.log1p(system.planets.at(-1).axis*1.12/(Math.sqrt(system.star.luminosity)*.16))*192;
 const point=p=>{const r=radius(p.distance);return[370+p.x/p.distance*r,220+p.y/p.distance*r];};
 function detail(){
  $('planetName').textContent=selected.name;$('planetType').textContent=selected.type;$('zoneBadge').textContent=selected.inZone?'Inside reference Goldilocks zone':'Outside reference Goldilocks zone';
  const data=[['Orbit',selected.axis.toFixed(3)+' AU'],['Year',selected.period.toFixed(1)+' days'],['Radius',selected.radius.toFixed(2)+' Earth radii'],['Gravity',selected.gravity.toFixed(2)+' g'],['Stellar flux',selected.flux.toFixed(2)+' × Earth'],['Equilibrium',Math.round(selected.equilibrium-273.15)+' °C'],['Albedo',selected.albedo.toFixed(2)],['Eccentricity',selected.eccentricity.toFixed(3)]];
  $('planetFacts').replaceChildren();for(const[label,value]of data){const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;div.append(dt,dd);$('planetFacts').append(div);}
  $('planetNotes').textContent=selected.landable?'Explore a compact 60 km-radius interpretation of this planet. Temperature, sea coverage, atmosphere, geology and relative gravity carry into the terrain.':'Atmospheric giant: inspect its orbit and properties here. Rover landing is unavailable.';
  $('visitPlanet').disabled=!selected.landable||!visit;$('visitPlanet').textContent=unavailable?'3D exploration unavailable':selected.landable?'Explore '+selected.name:'No solid landing surface';
  for(const b of $('planetList').children){b.setAttribute('aria-pressed',String(b.dataset.planet===selected.id));}
  for(const item of bodies){item.ring.setAttribute('stroke',item.planet.id===selected.id?'#f2dcaa':'#ffffff20');item.circle.setAttribute('stroke',item.planet.id===selected.id?'#fff':'#ffffff50');}
 }
 function draw(){svg.replaceChildren();bodies.length=0;
  element('rect',{width:740,height:440,fill:'#070f19',rx:12},svg);
  for(let i=0;i<95;i++)element('circle',{cx:(i*127.13)%740,cy:(i*71.71)%440,r:i%5===0?1:.55,fill:'#bed5ed',opacity:.18+(i%3)*.1},svg);
  const inner=radius(system.habitable.inner),outer=radius(system.habitable.outer);
  element('circle',{cx:370,cy:220,r:(inner+outer)/2,fill:'none',stroke:'#68ba9a','stroke-width':outer-inner,opacity:.15},svg);
  element('circle',{cx:370,cy:220,r:outer,fill:'none',stroke:'#79c4a6','stroke-dasharray':'3 5',opacity:.4},svg);
  element('circle',{cx:370,cy:220,r:22,fill:system.star.color,opacity:.08},svg);element('circle',{cx:370,cy:220,r:11,fill:system.star.color},svg);
  for(const planet of system.planets){let d='';for(let k=0;k<=180;k++){const xy=point(orbitalPosition(planet,k/180*planet.period));d+=(k?'L':'M')+xy.join(',');}
   const ring=element('path',{d,fill:'none',stroke:'#ffffff20','stroke-width':1},svg),group=element('g',{},svg),circle=element('circle',{r:planet.landable?5:8,fill:palette[planet.type],stroke:'#ffffff50','stroke-width':2},group),label=element('text',{x:12,y:4,fill:'#d7e5ee','font-size':12},group);label.textContent=planet.name;
   group.style.cursor='pointer';group.addEventListener('click',()=>{selected=planet;detail();});bodies.push({planet,group,circle,ring});
  }
  $('starInfo').textContent=`${system.star.spectral}-type · ${system.star.name} · ${system.star.mass} solar masses · ${system.star.luminosity} solar luminosities · ${system.star.temperature} K`;
  $('zoneInfo').textContent=`Reference Goldilocks zone: ${system.habitable.inner.toFixed(2)}–${system.habitable.outer.toFixed(2)} AU`;
  $('planetList').replaceChildren();for(const p of system.planets){const b=document.createElement('button');b.dataset.planet=p.id;b.textContent=p.name;b.style.setProperty('--planet-color',palette[p.type]);b.onclick=()=>{selected=p;detail();};$('planetList').append(b);}positions();detail();
 }
 function positions(){for(const{planet,group}of bodies)group.setAttribute('transform',`translate(${point(orbitalPosition(planet,days)).join(' ')})`);$('systemTime').value=String(Math.round(days));$('systemDay').textContent='Day '+Math.floor(days).toLocaleString();}
 function tick(now){if(!dialog.open)return;if(playing){days=Math.min(10000,days+Math.min((now-last)/1000,.1)*20);positions();if(days===10000){playing=false;$('playOrbits').textContent='Play orbits';}}last=now;raf=requestAnimationFrame(tick);}
 function open(){if(dialog.open)return;draw();dialog.showModal();last=performance.now();raf=requestAnimationFrame(tick);}
 $('openSystem').onclick=open;$('closeSystem').onclick=()=>dialog.close();dialog.addEventListener('close',()=>cancelAnimationFrame(raf));
 $('systemForm').onsubmit=e=>{e.preventDefault();system=generateSystem($('systemSeed').value,$('starClass').value);selected=system.planets[2];days=0;draw();};
 $('systemTime').oninput=()=>{days=+$('systemTime').value;positions();};$('playOrbits').onclick=()=>{playing=!playing;$('playOrbits').textContent=playing?'Pause orbits':'Play orbits';};
 $('visitPlanet').onclick=()=>{if(!visit||!selected.landable)return;const profile=profiles.get(selected.id)||surfaceProfile(selected);visit(selected,{config:{...profile.config},environment:{...profile.environment}},system.star);active=selected;$('activeWorld').textContent=active.name.toUpperCase();dialog.close();};
 return{open,getActive:()=>active,remember:profile=>profiles.set(active.id,structuredClone(profile)),getDefault:()=>surfaceProfile(active),setVisit:fn=>{visit=fn;detail();},unavailable:()=>{unavailable=true;visit=null;detail();open();}};
}
export const systemExplorer=createSystemExplorer();
