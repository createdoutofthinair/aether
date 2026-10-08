// Approximate main-sequence systems, with Keplerian two-body orbits in AU/days.
export const stars={
 M:{name:'Red dwarf',mass:.32,luminosity:.014,temperature:3300,color:'#ffac7c'},
 K:{name:'Orange dwarf',mass:.72,luminosity:.24,temperature:4600,color:'#ffd09b'},
 G:{name:'Sun-like star',mass:1,luminosity:1,temperature:5772,color:'#fff0c4'},
 F:{name:'White-yellow star',mass:1.3,luminosity:3,temperature:6600,color:'#eef4ff'}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function random(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const periodDays=(a,mass)=>365.25*Math.sqrt(a*a*a/mass);
export const equilibriumTemperature=(luminosity,a,albedo)=>278.3*Math.pow(luminosity*(1-albedo)/(a*a),.25);
export function orbitalPosition(planet,day){
 const mean=((planet.phase+2*Math.PI*day/planet.period)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);let e=mean;
 for(let i=0;i<10;i++)e-=(e-planet.eccentricity*Math.sin(e)-mean)/(1-planet.eccentricity*Math.cos(e));
 const x=planet.axis*(Math.cos(e)-planet.eccentricity),y=planet.axis*Math.sqrt(1-planet.eccentricity**2)*Math.sin(e),c=Math.cos(planet.periapsis),s=Math.sin(planet.periapsis);
 return{x:x*c-y*s,y:x*s+y*c,distance:Math.hypot(x,y)};
}
export function generateSystem(seed=6,spectral='G'){
 seed=Number.isFinite(Number(seed))?Math.round(clamp(Number(seed),0,999999)):6;if(!stars[spectral])spectral='G';
 const rng=random(seed),star={...stars[spectral],spectral},habitable={inner:Math.sqrt(star.luminosity/1.1),outer:Math.sqrt(star.luminosity/.35)};
 const names=['Cinder','Ochre','Nacre','Rime','Aureole','Boreal','Vesper'];
 const planets=[.30,.56,1.05,1.65,3.4,7.2,14].map((factor,i)=>{
  const axis=factor*Math.sqrt(star.luminosity)*(i===2?1:.95+rng()*.1),flux=star.luminosity/(axis*axis),giant=i===4||i===5;
  const volatile=rng();let type=giant?(i===4?'Gas giant':'Ice giant'):flux>5?'Scorched rock':flux>1.5?'Arid rock':flux<.5?'Ice world':volatile>.68?'Oceanic world':'Temperate rock';
  if(seed===6&&spectral==='G'&&i===2)type='Temperate rock';
  const radius=giant?(i===4?8+rng()*3:3+rng()*1.5):.45+rng()*.85,mass=giant?(i===4?150+rng()*180:12+rng()*10):radius**3.4;
  const albedo=type==='Ice world'?.55:type==='Scorched rock'?.12:giant?.4:.28;
  const pressure=giant?null:type==='Scorched rock'?0:type==='Arid rock'?.02+rng()*.18:type==='Ice world'?.005+rng()*.04:.65+rng()*.8;
  let greenhouse=giant?0:type==='Ice world'?1:pressure*25;
  const equilibrium=equilibriumTemperature(star.luminosity,axis,albedo),activity=type==='Scorched rock'?.7+rng()*.3:.1+rng()*.5;
  const config={seed:Math.floor(rng()*999999),relief:Math.round((.6+rng()*1.5)*20)/20,temperature:Math.round(clamp(equilibrium-273.15+greenhouse+18,-240,450)),water:type==='Oceanic world'?250:type==='Temperate rock'?-180:-1000,pressure:pressure??2,activity};
  // Preserve the original exploration world in the default system.
  if(seed===6&&spectral==='G'&&i===2){Object.assign(config,{seed:6,relief:1,temperature:18,water:-180,pressure:1,activity:.45});greenhouse=273.15-equilibrium;}
  const liquid=type==='Temperate rock'||type==='Oceanic world';
  return{id:`${seed}-${spectral}-${i}`,name:names[i],type,axis,flux,period:periodDays(axis,star.mass),eccentricity:.01+rng()*.07,phase:rng()*Math.PI*2,periapsis:rng()*Math.PI*2,radius,mass,gravity:mass/(radius*radius),albedo,equilibrium,greenhouse,pressure:config.pressure,tilt:rng()*35,dayHours:8+rng()*60,landable:!giant,config,environment:{waterEnabled:liquid,iceEnabled:type!=='Scorched rock'&&type!=='Arid rock',basin:seed===6&&spectral==='G'&&i===2,gravity:mass/(radius*radius)},inZone:axis>=habitable.inner&&axis<=habitable.outer};
 });
 return{seed,star,habitable,planets};
}
export function surfaceProfile(planet){if(!planet.landable)throw new Error('Gas and ice giants have no rover landing surface');return{config:{...planet.config},environment:{...planet.environment}};}
