// Injectable lifecycle controller: independent of DOM, Three.js and GPU APIs.
export class BackendSession{
 constructor(factory){this.factory=factory;this.generation=0;this.backend=null;this.state='idle';}
 async initialize(options){const generation=++this.generation;const previous=this.backend;this.backend=null;this.state='initializing';if(previous)await previous.dispose();if(generation!==this.generation)return false;
 let candidate;
 try{candidate=await this.factory(options);if(generation!==this.generation){await candidate.dispose();return false;}
 await candidate.initialize();if(generation!==this.generation){await candidate.dispose();return false;}
 this.backend=candidate;this.state='ready';return true;
 }catch(error){if(candidate)await candidate.dispose();if(generation!==this.generation)return false;this.state='failed';throw error;}}
 applyScene(snapshot){if(this.state!=='ready')throw Error('Renderer is not ready');this.backend.applyScene(snapshot);}
 resize(width,height,dpr){if(this.state==='ready')this.backend.resize(width,height,dpr);}
 render(){if(this.state==='ready')this.backend.render();}
 capabilities(){return this.backend?.capabilities()??null;}
 async dispose(){++this.generation;const backend=this.backend;this.backend=null;this.state='disposed';if(backend)await backend.dispose();}
}
