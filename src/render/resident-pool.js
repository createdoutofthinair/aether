/** Renderer-independent lifecycle for bounded, prewarmed scene assets.
 * Factories and GPU warmup run only during prepare(), never during acquire(). */
export class ResidentPool {
 constructor({create,warm=async()=>{},destroy}){this.create=create;this.warm=warm;this.destroy=destroy;this.entries=[];this.disposed=false;this.ready=false;this.preparation=null;}
 prepare(keys){if(this.preparation)return this.preparation;this.preparation=(async()=>{try{for(const key of keys){if(this.disposed)return;const object=await this.create(key);if(this.disposed){this.destroy(object);return;}this.entries.push({key,object,owner:null});await this.warm(object);if(this.disposed)return;}this.ready=true;}catch(e){this.dispose();throw e;}})();return this.preparation;}
 acquire(key,owner){if(!this.ready||this.disposed)return null;const entry=this.entries.find(e=>e.key===key);if(!entry||entry.owner!==null&&entry.owner!==owner)return null;entry.owner=owner;return entry.object;}
 release(owner){const entry=this.entries.find(e=>e.owner===owner);if(!entry)return;entry.object.visible=false;entry.owner=null;}
 reset(){for(const entry of this.entries){entry.object.visible=false;entry.owner=null;}}
 dispose(){if(this.disposed)return;this.disposed=true;this.ready=false;for(const entry of this.entries)this.destroy(entry.object);this.entries.length=0;}
}
