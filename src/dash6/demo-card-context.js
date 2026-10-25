/** Keep a structural card at the view root while isolating its complete tree. */
export function withDemoCardContext(Base, {loadRuntime, entityHass}) {
 return class extends Base {
  setConfig(config) {
   this._liquidDemoMode=config.liquid_glass_demo_mode;
   super.setConfig(config);
   this._applyLiquidDemoContext();
  }
  set hass(value) {this._liquidHostHass=value;this._applyLiquidDemoContext();}
  get hass() {return super.hass;}
  connectedCallback() {super.connectedCallback?.();this._applyLiquidDemoContext();}
  disconnectedCallback() {
   this._liquidDemoUnsubscribe?.();this._liquidDemoUnsubscribe=null;
   super.disconnectedCallback?.();
  }
  _applyLiquidDemoContext() {
   const host=this._liquidHostHass;
   if(!host)return;
   if(!this._liquidDemoMode||host.__liquidGlassDemoRuntime) {super.hass=host;return;}
   if(this._liquidDemoMode==='entities') {super.hass=entityHass(host);return;}
   if(this._liquidDemoRuntime) {
    if(this.isConnected)this._liquidDemoUnsubscribe||=this._liquidDemoRuntime.subscribe(()=>this._applyLiquidDemoContext());
    super.hass=this._liquidDemoRuntime.hass(host);return;
   }
   // Never pass the host to a demo card while its local runtime is loading.
   super.hass=undefined;
   this._liquidDemoPending||=loadRuntime().then(runtime=>{
    this._liquidDemoRuntime=runtime;this._applyLiquidDemoContext();
   }).catch(error=>{this._liquidDemoPending=null;console.error('Demo runtime:',error);});
  }
 };
}
