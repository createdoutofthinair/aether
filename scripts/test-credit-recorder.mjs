import assert from 'node:assert/strict';
import {CreditsRecorder,selectMp4Type,validateCreditsStream} from '../dist/credits/recorder.js';
class Track extends EventTarget{constructor(kind,surface='browser'){super();this.kind=kind;this.surface=surface;this.readyState='live';}getSettings(){return{displaySurface:this.surface};}stop(){this.readyState='ended';}}
function stream({audio=true,surface='browser'}={}){const video=new Track('video',surface),sound=new Track('audio');return{video,sound,getVideoTracks:()=>[video],getAudioTracks:()=>audio?[sound]:[],getTracks:()=>audio?[video,sound]:[video]};}
class Recorder{static isTypeSupported(type){return type.startsWith('video/mp4');}constructor(source,options){this.stream=source;this.mimeType=options.mimeType;this.state='inactive';}start(){this.state='recording';queueMicrotask(()=>this.onstart?.());}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['mp4-test'])});this.onstop?.();}}
assert.ok(selectMp4Type(Recorder).startsWith('video/mp4'));assert.equal(selectMp4Type({isTypeSupported:()=>false}),null);
assert.throws(()=>validateCreditsStream(stream({audio:false})),/Share tab audio/);assert.throws(()=>validateCreditsStream(stream({surface:'monitor'})),/browser tab/);
let result,begin=0,finished=0,clean=[],errors=[];let source=stream();let options;
const rec=new CreditsRecorder({Recorder,capture:async o=>{options=o;return source;},afterPaint:async()=>{},onClean:v=>clean.push(v),onBegin:()=>begin++,onFinish:()=>finished++,onError:e=>errors.push(e),onResult:b=>result=b});
await rec.start();await Promise.resolve();await Promise.resolve();assert.equal(rec.state,'recording');assert.equal(begin,1);assert.equal(options.audio.suppressLocalAudioPlayback,false);assert.equal(options.monitorTypeSurfaces,'exclude');rec.stop();assert.equal(rec.state,'finished');assert.ok(result.type.startsWith('video/mp4'));assert.ok(result.size>0);assert.deepEqual(clean,[true,false]);assert.equal(source.video.readyState,'ended');assert.equal(source.sound.readyState,'ended');assert.equal(finished,1);assert.equal(errors.length,0);
// Missing shared audio must fail before recording and release every capture track.
const silent=stream({audio:false});let missing;
const bad=new CreditsRecorder({Recorder,capture:async()=>silent,onError:e=>missing=e});await bad.start();assert.equal(bad.state,'error');assert.match(missing.message,/Share tab audio/);assert.equal(silent.video.readyState,'ended');
// Stop-sharing and preparation cancellation retain clean UI and do not start late.
let unblock,cancelBegins=0;const cancelSource=stream();const cancel=new CreditsRecorder({Recorder,capture:async()=>cancelSource,afterPaint:()=>new Promise(r=>unblock=r),onBegin:()=>cancelBegins++});const pending=cancel.start();await Promise.resolve();assert.equal(cancel.state,'preparing');cancel.stop();unblock();await pending;assert.equal(cancelBegins,0);assert.equal(cancel.state,'error');
let lateResolve;const lateSource=stream();const late=new CreditsRecorder({Recorder,capture:()=>new Promise(r=>lateResolve=r)});const opening=late.start();late.dispose();lateResolve(lateSource);await opening;assert.equal(lateSource.video.readyState,'ended');
console.log('Credits recorder: MP4 selection, video+audio validation, clean capture lifecycle, early stop and cancellation/disposal races passed');
const endedSource=stream();let earlyBlob;const early=new CreditsRecorder({Recorder,capture:async()=>endedSource,afterPaint:async()=>{},onResult:b=>earlyBlob=b});await early.start();await Promise.resolve();endedSource.video.dispatchEvent(new Event('ended'));assert.equal(early.state,'finished');assert.ok(earlyBlob.size);
// A failed soundtrack start must discard the capture instead of downloading silence.
let audioFailure,silentDownload=false;const failedAudio=new CreditsRecorder({Recorder,capture:async()=>stream(),afterPaint:async()=>{},onBegin:()=>Promise.reject(Error('Soundtrack unavailable')),onError:e=>audioFailure=e,onResult:()=>silentDownload=true});await failedAudio.start();for(let i=0;i<6;i++)await Promise.resolve();assert.equal(silentDownload,false);assert.match(audioFailure.message,/Soundtrack/);
// Only the dedicated capture page bypasses the app shell.
const {readFileSync}=await import('node:fs');const {runInNewContext}=await import('node:vm');const navigation=readFileSync(new URL('../dist/navigation.js',import.meta.url),'utf8');
for(const [search,expected] of [['?capture=1',0],['',1]]){let redirects=0;const win={};win.top=win;runInNewContext(navigation,{window:win,location:{pathname:'/aether/credits.html',search,replace:()=>redirects++},URLSearchParams});assert.equal(redirects,expected);}
console.log('Stop-sharing finalization, rejected soundtrack and standalone capture routing passed');
