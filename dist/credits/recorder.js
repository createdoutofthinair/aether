export const MP4_TYPES=[
 'video/mp4;codecs=avc1.42001E,mp4a.40.2',
 'video/mp4;codecs=avc1,mp4a.40.2',
 'video/mp4'
];
export function selectMp4Type(Recorder=globalThis.MediaRecorder){
 if(!Recorder?.isTypeSupported)return null;
 return MP4_TYPES.find(type=>{try{return Recorder.isTypeSupported(type);}catch{return false;}})||null;
}
export function validateCreditsStream(stream){
 const video=stream.getVideoTracks()[0];
 if(!video)throw Error('No video was shared. Select this Aether recording tab.');
 const surface=video.getSettings?.().displaySurface;
 if(surface&&surface!=='browser')throw Error('Select a browser tab, rather than a window or your entire screen.');
 if(!stream.getAudioTracks().some(track=>track.readyState!=='ended'))throw Error('Sound is missing. Select this tab and enable “Share tab audio”, then try again.');
 return video;
}
export class CreditsRecorder{
 constructor({capture=options=>navigator.mediaDevices.getDisplayMedia(options),Recorder=globalThis.MediaRecorder,afterPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))),onState=()=>{},onClean=()=>{},onReset=()=>{},onBegin=()=>{},onFinish=()=>{},onError=()=>{},onResult=()=>{}}={}){
  Object.assign(this,{capture,Recorder,afterPaint,onState,onClean,onReset,onBegin,onFinish,onError,onResult});this.state='idle';this.chunks=[];this.disposed=false;
 }
 setState(state){this.state=state;this.onState(state);}
 async start(){
  if(this.disposed||!['idle','finished','error'].includes(this.state))return;
  const mimeType=selectMp4Type(this.Recorder);if(!mimeType){this.onError(Error('MP4 recording is unavailable in this browser. Open this page in current desktop Chrome or Edge.'));return;}
  this.chunks=[];this.failure=null;this.setState('selecting');
  try{
   // Invoked directly by the Record button: capture permission requires a user gesture.
   const stream=await this.capture({video:{frameRate:{ideal:30,max:30},width:{ideal:1920},height:{ideal:1080},cursor:'never'},audio:{suppressLocalAudioPlayback:false},preferCurrentTab:true,selfBrowserSurface:'include',surfaceSwitching:'exclude',systemAudio:'exclude',monitorTypeSurfaces:'exclude'});
   this.stream=stream;if(this.disposed){this.release();return;}
   const video=validateCreditsStream(stream);
   this.onClean(true);this.onReset();this.setState('preparing');await this.afterPaint();
   if(this.disposed||this.state!=='preparing'){this.release();return;}
   if(video.readyState==='ended')throw Error('Tab sharing stopped before recording began.');
   const recorder=new this.Recorder(stream,{mimeType,videoBitsPerSecond:6000000,audioBitsPerSecond:192000});this.recorder=recorder;
   if(!recorder.mimeType?.startsWith('video/mp4'))throw Error('The browser did not select a genuine MP4 recording format.');
   recorder.ondataavailable=event=>{if(!this.disposed&&event.data?.size)this.chunks.push(event.data);};
   recorder.onerror=event=>{this.failure=event.error||Error('The recording encoder failed.');this.stop();};
   recorder.onstart=()=>{if(this.disposed||this.state!=='preparing'){this.stop();return;}this.setState('recording');Promise.resolve().then(()=>{if(this.state==='recording')return this.onBegin();}).catch(error=>{this.failure=error;this.stop();});};
   recorder.onstop=()=>this.finalize();video.addEventListener('ended',()=>this.stop(),{once:true});
   recorder.start(1000);
  }catch(error){this.fail(error);}
 }
 stop(){
  if(this.state==='stopping'||this.state==='finished'||this.state==='error')return;
  if(this.recorder&&this.recorder.state!=='inactive'){this.setState('stopping');this.recorder.stop();}
  else if(this.state==='selecting'||this.state==='preparing')this.fail(Error('Recording cancelled.'));
 }
 finalize(){
  if(this.state==='finished'||this.state==='error')return;
  const blob=new Blob(this.chunks,{type:this.recorder?.mimeType||'video/mp4'});this.chunks=[];this.release();this.onClean(false);this.onFinish();
  if(this.failure||!blob.size){this.setState('error');if(!this.disposed)this.onError(this.failure||Error('The recording was empty. Please try again.'));return;}
  this.setState('finished');if(!this.disposed)this.onResult(blob);
 }
 fail(error){this.release();this.chunks=[];this.recorder=null;this.setState('error');this.onClean(false);this.onFinish();if(!this.disposed)this.onError(error);}
 release(){for(const track of this.stream?.getTracks()||[])track.stop();this.stream=null;}
 dispose(){this.disposed=true;if(this.recorder?.state==='recording'||this.recorder?.state==='paused'){this.stop();}else{this.release();this.onClean(false);}this.chunks=[];}
}
