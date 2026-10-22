import {CreditsRecorder,selectMp4Type} from './recorder.js';
/** Dedicated top-level page captures the rendered DOM and every WebGPU layer. */
export function createRecordingUI({onPrepare,onReset,onBegin,onFinish}){
 const dedicated=new URLSearchParams(location.search).has('capture');
 const gateButton=document.querySelector('#recordCredits'),footerButton=document.querySelector('#recordCreditsFooter'),note=document.querySelector('#recordingNote'),dialog=document.querySelector('#recordingResult'),download=document.querySelector('#downloadRecording'),preview=document.querySelector('#recordingPreview');
 let ready=false,url,disposed=false,finishTimer;
 const native=Boolean(navigator.mediaDevices?.getDisplayMedia&&selectMp4Type());
 if(dedicated){document.body.classList.add('capture-page');document.title='Aether · Credits MP4 Recording';note.textContent=native?'Choose this recording tab and enable “Share tab audio”. Controls are hidden in the video. Keep this tab visible; recording stops automatically at the end. Use Esc or the browser’s Stop sharing button to stop early.':'MP4 tab recording requires a supported desktop browser. Try current Chrome or Edge.';}
 else note.textContent='Record MP4 opens a dedicated tab with a clean, control-free view.';
 function refresh(){for(const button of [gateButton,footerButton]){button.disabled=!ready||(dedicated&&!native)||['selecting','preparing','recording','stopping'].includes(recorder.state);}}
 const recorder=new CreditsRecorder({
  afterPaint:async()=>{await document.fonts?.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},
  onState(state){refresh();if(state==='selecting')note.textContent='In the browser picker, select this tab and enable Share tab audio.';},
  onClean(clean){document.body.classList.toggle('recording-clean',clean);},
  onReset(){onReset();},
  onBegin:()=>onBegin(),
  onFinish(){clearTimeout(finishTimer);onFinish();refresh();},
  onError(error){note.textContent=error.name==='NotAllowedError'?'Recording cancelled or sharing permission was denied. You can try again.':error.message;},
  onResult(blob){
   if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);download.href=url;download.download='Aether-Credits-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.mp4';preview.src=url;
   document.querySelector('#recordingSize').textContent=`MP4 with tab audio · ${(blob.size/1024/1024).toFixed(1)} MB`;
   dialog.showModal();download.click();note.textContent='Recording complete. Your MP4 is ready to download.';
  }
 });
 function record(){if(!ready)return;if(!dedicated){window.open('./credits.html?capture=1','_blank','noopener');return;}if(!native)return;onPrepare();recorder.start();}
 gateButton.addEventListener('click',record);footerButton.addEventListener('click',record);
 document.querySelector('#closeRecordingResult').addEventListener('click',()=>{preview.pause();dialog.close();});
 dialog.addEventListener('cancel',()=>preview.pause());
 function escape(event){if(event.key==='Escape'&&['recording','preparing'].includes(recorder.state)){event.preventDefault();event.stopImmediatePropagation();recorder.stop();}}
 document.addEventListener('keydown',escape,true);
 const api={
  get busy(){return ['selecting','preparing','recording','stopping'].includes(recorder.state);},
  setReady(value){ready=value;refresh();},
  complete(){if(recorder.state==='recording')finishTimer=setTimeout(()=>recorder.stop(),1800);},
  dispose(){disposed=true;clearTimeout(finishTimer);document.removeEventListener('keydown',escape,true);recorder.dispose();preview.pause();preview.removeAttribute('src');if(url)URL.revokeObjectURL(url);}
 };
 refresh();return api;
}
