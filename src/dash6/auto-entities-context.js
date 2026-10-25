// Upstream card-tools resolves templates through the global HA application.
// Keep its filtering/rendering, but subscribe through this card's own context.
export function withCardTemplateContext(Base){
 return class extends Base{
  setConfig(config){
   this._stopContextTemplate();
   const template=config.filter?.template,safe=structuredClone(config);
   if(safe.filter)delete safe.filter.template;
   super.setConfig(safe);
   if(template)this._config.filter.template=template;
   this._contextTemplate=template;
   this._template=undefined;
   this._bindContextTemplate();
  }
  connectedCallback(){
   const template=this._config?.filter?.template;
   if(template)delete this._config.filter.template;
   try{super.connectedCallback?.();}
   finally{if(template)this._config.filter.template=template;}
   this._bindContextTemplate();
  }
  updated(changed){super.updated?.(changed);this._bindContextTemplate();}
  disconnectedCallback(){this._stopContextTemplate();super.disconnectedCallback?.();}
  _stopContextTemplate(){
   this._contextTemplateToken=(this._contextTemplateToken||0)+1;
   this._contextTemplateUnsubscribe?.();this._contextTemplateUnsubscribe=null;
   this._contextTemplateConnection=null;
  }
  _bindContextTemplate(){
   const connection=this.hass?.connection,template=this._contextTemplate;
   if(!this.isConnected||!connection?.subscribeMessage||!template||this._contextTemplateConnection===connection)return;
   this._stopContextTemplate();this._contextTemplateConnection=connection;
   const token=this._contextTemplateToken;
   Promise.resolve(connection.subscribeMessage(event=>{
    if(token!==this._contextTemplateToken||!this.isConnected)return;
    if(event.error){this.error=event.error;this.requestUpdate?.();return;}
    this._renderer(event.result);
   },{type:'render_template',template,variables:{config:this._config,user:this.hass.user?.name||'',
    browser:typeof document!=='undefined'&&document.querySelector('hc-main')?'CAST':typeof localStorage!=='undefined'?localStorage.getItem('browser_mod-browser-id')||'':'',
    hash:typeof location!=='undefined'?location.hash.slice(1):''}})).then(unsubscribe=>{
    if(token===this._contextTemplateToken&&this.isConnected)this._contextTemplateUnsubscribe=unsubscribe;
    else unsubscribe?.();
   }).catch(error=>{if(token===this._contextTemplateToken){this.error=error;this.requestUpdate?.();}});
  }
 };
}
