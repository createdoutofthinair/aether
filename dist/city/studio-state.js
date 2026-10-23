import {architecturalRecipe,compileArchitecture,restoreArchitecture} from './architecture.js';
import {modulesFromAssembly,normalizeModules,connectionsFromAssembly} from './design.js';
export const ASSET_LIBRARY_KEY='aether.architecture.assets.v3';
export const DRAFT_KEY='aether.architecture.draft.v3';
const copy=value=>JSON.parse(JSON.stringify(value));
export function createStudioState(initial){
 let current=restoreArchitecture(initial),past=[],future=[];
 return {get recipe(){return copy(current);},get canUndo(){return past.length>0;},get canRedo(){return future.length>0;},
  change(next){const validated=restoreArchitecture(next);if(JSON.stringify(validated)===JSON.stringify(current))return false;past.push(current);if(past.length>60)past.shift();current=validated;future=[];return true;},
  undo(){if(!past.length)return false;future.push(current);current=past.pop();return true;},redo(){if(!future.length)return false;past.push(current);current=future.pop();return true;},
  freeze(){if(current.modules?.length)return false;const assembly=compileArchitecture(current);return this.change({...current,modules:modulesFromAssembly(assembly),connections:connectionsFromAssembly(assembly)});},
  updateMass(id,changes){const draft=this.recipe;if(!draft.modules)this.freeze();const next=this.recipe,index=next.modules.findIndex(m=>m.id===id);if(index<0)throw Error('Select a valid mass');Object.assign(next.modules[index],changes);return this.change(next);},
  addMass(){if(!current.modules)this.freeze();if(current.modules.length>=12)throw Error('An assembly supports up to 12 editable masses');const draft=this.recipe,id='mass-'+(1+Math.max(0,...draft.modules.map(m=>Number(m.id.replace('mass-',''))||0)));draft.modules.push(normalizeModules([{id,label:'New occupied mass',shape:'chamfer',width:18,depth:18,height:45,x:20,y:draft.foundation,z:0}])[0]);this.change(draft);return id;},
  duplicateMass(id){if(!current.modules)this.freeze();if(current.modules.length>=12)throw Error('An assembly supports up to 12 editable masses');const draft=this.recipe,source=draft.modules.find(m=>m.id===id);if(!source)throw Error('Select a mass to duplicate');let nextId=id+'-copy';while(draft.modules.some(m=>m.id===nextId))nextId+='x';draft.modules.push({...copy(source),id:nextId,label:source.label+' copy',x:source.x+8});this.change(draft);return nextId;},
  deleteMass(id){if(!current.modules)this.freeze();const draft=this.recipe;if(draft.modules.length<2)throw Error('Keep at least one occupied mass');draft.modules=draft.modules.filter(m=>m.id!==id);return this.change(draft);},
  regenerate(options={},seed=current.seed){const next=architecturalRecipe(current.family,seed,current.profile,{...current.options,...options});next.label=current.label;return this.change(next);}
 };
}
export function readAssetLibrary(storage){try{return JSON.parse(storage.getItem(ASSET_LIBRARY_KEY)||'[]').slice(0,20).map(restoreArchitecture);}catch{return [];}}
export function publishAsset(storage,document){const recipe=restoreArchitecture(document),assets=readAssetLibrary(storage).filter(a=>!(a.family===recipe.family&&a.profile===recipe.profile&&a.style===recipe.style));assets.push(recipe);storage.setItem(ASSET_LIBRARY_KEY,JSON.stringify(assets.slice(-20)));return assets;}
export function removeAsset(storage,document){const recipe=restoreArchitecture(document),assets=readAssetLibrary(storage).filter(a=>!(a.family===recipe.family&&a.profile===recipe.profile&&a.style===recipe.style));storage.setItem(ASSET_LIBRARY_KEY,JSON.stringify(assets));return assets;}
