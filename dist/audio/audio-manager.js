/** One managed audio element per app; no visible player or UI dependency. */
export class AudioManager extends EventTarget {
  constructor({audio=new Audio(),mediaSession=globalThis.navigator?.mediaSession}={}) {
    super();this.audio=audio;this.mediaSession=mediaSession;this.playlist=[];this.index=0;this.wantsPlayback=false;this.disposed=false;this.generation=0;
    audio.preload='metadata';audio.volume=.65;
    this.onEnded=()=>{if(this.wantsPlayback)this.next();};
    this.onError=()=>this.emit('error',{code:audio.error?.code});
    this.onPlay=()=>this.emit('playing');this.onPause=()=>this.emit('paused');
    audio.addEventListener('ended',this.onEnded);audio.addEventListener('error',this.onError);
    audio.addEventListener('playing',this.onPlay);audio.addEventListener('pause',this.onPause);
    this.unlock=()=>{if(this.wantsPlayback&&audio.paused)this.play();};
    globalThis.document?.addEventListener('pointerdown',this.unlock);
    globalThis.document?.addEventListener('keydown',this.unlock);
    for(const [action,handler] of Object.entries({play:()=>this.play(),pause:()=>this.pause(),nexttrack:()=>this.next(),previoustrack:()=>this.previous()})){
      try{mediaSession?.setActionHandler(action,handler);}catch{/* Optional platform integration. */}
    }
  }
  emit(type,detail={}){this.dispatchEvent(new CustomEvent(type,{detail:{track:this.playlist[this.index],...detail}}));}
  setPlaylist(tracks,{loop=true}={}){
    if(this.disposed)throw Error('Audio manager is disposed');
    if(!tracks.length||tracks.some(t=>!t.src||!/^https?:/.test(t.src)))throw Error('Playlist requires HTTP(S) audio sources');
    this.pause();this.playlist=tracks.map(t=>({...t}));this.loop=loop;this.load(0);
  }
  load(index){
    this.generation++;this.audio.pause();this.index=index;const track=this.playlist[index];
    this.audio.src=track.src;this.audio.load();
    if(this.mediaSession&&globalThis.MediaMetadata)this.mediaSession.metadata=new MediaMetadata({title:track.title,artist:track.artist,album:track.album||'AETHER'});
    this.emit('trackchange');
  }
  async play(){
    if(this.disposed||!this.playlist.length)return false;
    this.wantsPlayback=true;const generation=this.generation;
    try{await this.audio.play();if(!this.wantsPlayback||this.disposed)this.audio.pause();return this.wantsPlayback&&!this.disposed;}
    catch(error){if(generation!==this.generation||!this.wantsPlayback||this.disposed)return false;this.emit(error.name==='NotAllowedError'?'blocked':'error',{message:error.message});return false;}
  }
  pause(){this.wantsPlayback=false;this.audio.pause();}
  setPlaying(value){return value?this.play():this.pause();}
  next(){if(!this.playlist.length)return;const resume=this.wantsPlayback;if(this.index+1>=this.playlist.length&&!this.loop){this.pause();this.emit('complete');return;}this.load((this.index+1)%this.playlist.length);if(resume)this.play();}
  previous(){if(!this.playlist.length)return;const resume=this.wantsPlayback;this.load((this.index-1+this.playlist.length)%this.playlist.length);if(resume)this.play();}
  restart(){if(this.playlist.length){this.audio.currentTime=0;if(this.wantsPlayback)this.play();}}
  setVolume(value){if(!Number.isFinite(value))return;this.audio.volume=Math.max(0,Math.min(1,value));}
  setMuted(value){this.audio.muted=Boolean(value);}
  dispose(){this.pause();this.disposed=true;globalThis.document?.removeEventListener('pointerdown',this.unlock);globalThis.document?.removeEventListener('keydown',this.unlock);this.audio.removeEventListener('ended',this.onEnded);this.audio.removeEventListener('error',this.onError);this.audio.removeEventListener('playing',this.onPlay);this.audio.removeEventListener('pause',this.onPause);this.audio.removeAttribute('src');this.audio.load();for(const action of ['play','pause','nexttrack','previoustrack']){try{this.mediaSession?.setActionHandler(action,null);}catch{}}if(this.mediaSession)this.mediaSession.metadata=null;}
}
let shared;
export function getAudioManager(){if(!shared||shared.disposed)shared=new AudioManager();return shared;}
