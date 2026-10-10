// Deterministic camera paths; wall-clock performance is measured independently.
export const VALIDATION_PROFILES={
 temperate:{temperature:18,pressure:1,activity:.45,waterEnabled:true,iceEnabled:true},
 dry:{temperature:65,pressure:.7,activity:.3,waterEnabled:false,iceEnabled:false},
 volcanic:{temperature:100,pressure:1,activity:.9,waterEnabled:false,iceEnabled:false},
 glacial:{temperature:-50,pressure:.8,activity:.2,waterEnabled:true,iceEnabled:true},
 airless:{temperature:5,pressure:0,activity:.2,waterEnabled:false,iceEnabled:false}
};
export const VALIDATION_ROUTES=['ground-orbit','terrain-drive','coast'];
export function routePose(route,t){
 const u=Math.min(1,Math.max(0,t/12));
 if(route==='ground-orbit'){const arc=Math.sin(Math.PI*u);return{altitude:2*Math.pow(37500,arc),east:0,north:0,pitch:-.06-1.2*arc};}
 if(route==='terrain-drive')return{altitude:3,east:120*u,north:20*Math.sin(u*Math.PI),pitch:-.08};
 if(route==='coast')return{altitude:18,east:80*u,north:0,pitch:-.16};
 throw Error('Unknown validation route');
}
export function installValidationUI(api){
 const button=document.createElement('button');button.textContent='Run visual validation';button.type='button';
 document.getElementById('exportDiagnostics').after(button);
 button.onclick=async()=>{button.disabled=true;const report={version:1,runs:[],screenshots:[],note:'Review screenshots manually. GPU timing is device-specific; route movement is camera-only, not a rover physics test.'};
 try{for(const profile of Object.keys(VALIDATION_PROFILES)){await api.validationProfile(profile);for(const route of VALIDATION_ROUTES){button.textContent=`Validating ${profile} · ${route}`;const start=api.validationStart(route);if(!start.available){report.runs.push({profile,route,skipped:start.reason});continue;}
 await api.validationWait(180);api.resetPerformance();api.validationPlay();
 for(const seconds of [0,3,6,9,12]){await api.validationUntil(seconds);report.screenshots.push({profile,route,seconds,png:await api.validationCapture()});}
 report.runs.push({profile,route,...api.performance()});}}
 const blob=new Blob([JSON.stringify(report)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='aether-visual-validation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){document.getElementById('message').textContent='Validation failed: '+error.message;}
 finally{api.validationStop();button.disabled=false;button.textContent='Run visual validation';}}
}
