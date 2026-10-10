import {featuredRegions,regionAt} from './regions.js?v=terrain-10';
import * as T from './vendor/three.module.js';
import {world,environment,defaults,configureWorld,climate,mapDirection,mapUV,biomeColors} from './world.js?v=terrain-10';
import {height,landing,surfaceNormal,surfaceClimate,regionLanding} from './terrain.js?v=terrain-10';
export function createAtlas({onApply,onTravel,onReset}){
 const $=id=>document.getElementById(id),dialog=$('atlas'),canvas=$('biomeMap'),ctx=canvas.getContext('2d');
 let selected=landing.clone(),background;
 function selection(){const h=height(selected),c=surfaceClimate(selected,h),safe=!c.ocean&&surfaceNormal(selected).dot(selected)>.94;
  $('siteLatitude').value=(Math.asin(selected.y)*180/Math.PI).toFixed(1);$('siteLongitude').value=(Math.atan2(selected.x,selected.z)*180/Math.PI).toFixed(1);
  $('siteInfo').textContent=`${c.biome} · ${h.toFixed(0)} m elevation · ${c.temperature.toFixed(0)}°C · ${(Math.asin(selected.y)*180/Math.PI).toFixed(1)}° latitude`;
  $('siteStatus').textContent=c.ocean?'Choose dry land for the rover.':!safe?'This slope is too steep. Choose a gentler site.':'Ready for orbital approach and guided landing.';
  $('visitSite').disabled=!safe;draw();return safe;
 }
 function draw(){if(!background)return;ctx.putImageData(background,0,0);ctx.font='bold 10px Arial';ctx.textAlign='center';featuredRegions().forEach((r,i)=>{const p=mapUV(r.center);ctx.fillStyle='#101923';ctx.beginPath();ctx.arc(p.u*canvas.width,p.v*canvas.height,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(String(i+1),p.u*canvas.width,p.v*canvas.height+3);});const {u,v}=mapUV(selected);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(u*canvas.width,v*canvas.height,5,0,Math.PI*2);ctx.stroke();}
 function render(){const w=canvas.width,h=canvas.height,img=ctx.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=new T.Vector3().copy(mapDirection((x+.5)/w,(y+.5)/h)),e=height(n),c=climate(n,e),color=biomeColors[c.biome],shade=.83+.17*Math.max(0,Math.min(1,(e+500)/1800));const r=regionAt(n),blend=r&&!c.ocean?r.weight*(1-c.ice):0;const i=(y*w+x)*4;for(let k=0;k<3;k++)img.data[i+k]=((1-blend)*color[k]+blend*(r?.color[k]||0))*shade;img.data[i+3]=255;}
  background=img;selection();regionButtons();
 }
 function fill(){$('surfaceWater').checked=environment.waterEnabled;$('surfaceIce').checked=environment.iceEnabled;for(const key of Object.keys(defaults))$('planet-'+key).value=world[key];}
 function regionButtons(){$('regionVisits').replaceChildren();featuredRegions().forEach((r,i)=>{const button=document.createElement('button');button.textContent=(i+1)+' · '+r.name;button.title=r.description;button.onclick=()=>{const site=regionLanding(r);if(site){selected.copy(site);selection();$('siteStatus').textContent=r.description+' · Ready for orbital approach.';}else{selected.copy(r.center);selection();$('siteStatus').textContent='No dry, gentle landing site found here with the current planet settings.';}};$('regionVisits').append(button);});}
 $('openAtlas').onclick=()=>{fill();render();dialog.showModal();};$('closeAtlas').onclick=()=>dialog.close();
 canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();selected.copy(mapDirection((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height));selection();});
 // Keyboard and touch users can select coordinates without precision pointing.
 $('pickCoordinates').onclick=()=>{const lat=Number($('siteLatitude').value),lon=Number($('siteLongitude').value);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;selected.copy(mapDirection((Math.max(-180,Math.min(180,lon))+180)/360,(90-Math.max(-90,Math.min(90,lat)))/180));selection();};
 $('defaultSite').onclick=()=>{selected.copy(landing);selection();};
 $('planetForm').onsubmit=e=>{e.preventDefault();const settings={};for(const key of Object.keys(defaults))settings[key]=$('planet-'+key).value;configureWorld(settings);environment.waterEnabled=$('surfaceWater').checked;environment.iceEnabled=$('surfaceIce').checked;fill();onApply();render();$('siteStatus').textContent+=' Planet regenerated; current flight returned to orbit.';};
 $('resetPlanet').onclick=()=>{if(onReset)onReset();else configureWorld(defaults);fill();onApply();render();};
 $('visitSite').onclick=()=>{if(selection()){onTravel(selected.clone());dialog.close();}};
 return{isOpen:()=>dialog.open};
}
