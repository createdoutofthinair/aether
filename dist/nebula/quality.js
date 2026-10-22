/** Completion-latency feedback, not a hardware GPU timer. Keep ray detail fixed. */
export class AdaptiveNebulaQuality{
 constructor({budgetMs=20,minScale=.5}={}){this.budgetMs=budgetMs;this.minScale=minScale;this.reset();}
 reset(){this.scale=1;this.slow=0;this.fast=0;}
 observe(ms){
  if(!Number.isFinite(ms)||ms<=0)return false;
  if(ms>this.budgetMs*1.25){this.slow++;this.fast=0;}
  else if(ms<this.budgetMs*.65){this.fast++;this.slow=0;}
  else{this.fast=0;this.slow=0;}
  const old=this.scale;
  if(this.slow>=3){this.scale=Math.max(this.minScale,this.scale*.85);this.slow=0;}
  if(this.fast>=45){this.scale=Math.min(1,this.scale*1.06);this.fast=0;}
  return this.scale!==old;
 }
}
