import {request,envelope,configure} from './api.js';
import {TerritoryMap} from './map.js';
const $=id=>document.getElementById(id);
const eye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const state={points:[],bootstrap:null,selected:null,view:'visor',timers:new Set()};
const map=new TerritoryMap($('mapCanvas'),select);
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function button(text,fn,cls='secondary'){const b=node('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;}
function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),5000);}
function hideSensitive(){
  document.querySelectorAll('[data-eye]').forEach(b=>{const input=$(b.dataset.eye);input.type='password';b.setAttribute('aria-pressed','false');});
  document.querySelectorAll('[data-secret]').forEach(n=>n.textContent='••••••••');
  document.querySelectorAll('[data-reveal]').forEach(b=>{b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Mostrar '+b.dataset.reveal);});
}
function timedHide(fn){const timer=setTimeout(()=>{fn();state.timers.delete(timer);},15000);state.timers.add(timer);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)hideSensitive();});
window.addEventListener('blur',hideSensitive);
for(const b of document.querySelectorAll('[data-eye]')){
  b.innerHTML=eye;b.addEventListener('click',()=>{const input=$(b.dataset.eye),show=input.type==='password';input.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));if(show)timedHide(()=>{input.type='password';b.setAttribute('aria-pressed','false');});});
}
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{hideSensitive();d.querySelector('form').reset();}));
async function bootstrap(){
  state.bootstrap=await request('/bootstrap');configure(state.bootstrap);
  const user=state.bootstrap.user;
  $('accountLabel').textContent=user?user.username+' · Salir':'Acceso al equipo';
  $('newPoint').classList.toggle('hidden',user?.role!=='admin');
  for(const id of ['categoryFilter','pointCategory']){
    $(id).replaceChildren();
    if(id==='categoryFilter')$(id).append(new Option('Todas las categorías',''));
    state.bootstrap.categories.forEach(c=>$(id).append(new Option(c.name,c.id)));
  }
}
async function refresh(){state.points=await request('/points');render();}
function visible(){const term=$('search').value.trim().toLocaleLowerCase('es'),category=$('categoryFilter').value;return state.points.filter(p=>(!term||(p.name+' '+p.description).toLocaleLowerCase('es').includes(term))&&(!category||String(p.category_id)===category));}
function select(id){hideSensitive();state.selected=id;render();}
function render(){
  const points=visible();
  if(!points.some(p=>p.id===state.selected))state.selected=points[0]?.id||null;
  $('stats').replaceChildren(...[[state.points.filter(p=>p.status==='publicado').length,'Puntos publicados','◈','en el conjunto'],[new Set(state.points.map(p=>p.category_id)).size,'Categorías','▦','tipos de punto'],[1,'Comuna piloto','⌖','alcance inicial'],['100%','Datos sintéticos','◇','uso demostrativo']].map(([n,title,icon,hint])=>{
    const card=node('div',undefined,'stat'),text=node('div');text.append(node('small',title),node('strong',String(n)),node('em',hint));card.append(text,node('span',icon,'stat-icon'));return card;
  }));
  map.render(points,state.selected);
  $('resultCount').textContent=points.length+' resultados';
  $('pointCards').replaceChildren(...points.map(p=>{
    const card=button('',()=>select(p.id),'point-card'+(state.selected===p.id?' selected':''));
    card.append(node('small',p.category+' · '+p.status),node('strong',p.name),node('span','Consultar ficha →'));return card;
  }));
  if(!points.length)$('pointCards').append(node('p','No hay puntos para estos filtros. Prueba otra búsqueda.','empty'));
  renderDetail(points.find(p=>p.id===state.selected));
  $('directoryList').replaceChildren(...state.points.map(p=>listRow(p.name,p.category+' · '+p.commune+' · '+p.status,button('Ver ficha',()=>{setView('visor');$('search').value='';$('categoryFilter').value='';select(p.id);}))));
  if(state.view==='manage')renderManagement();
}
function listRow(title,sub,action){const row=node('div',undefined,'directory-item'),text=node('div');text.append(node('strong',title),node('p',sub));row.append(text);if(action)row.append(action);return row;}
function renderDetail(p){
  const panel=$('detail');panel.replaceChildren();
  if(!p){panel.append(node('h2','Sin selección'),node('p','Elige un punto del mapa o de la lista.'));return;}
  const top=node('div',undefined,'detail-top');top.append(node('span','FICHA TERRITORIAL'),node('span',p.status,'status'));
  panel.append(top,node('div','⌖','detail-icon'),node('h2',p.name),node('span',p.category,'category-label'),node('p',p.description));
  const data=node('div',undefined,'detail-data');
  for(const [label,value] of [['Comuna',p.commune],['Latitud',p.latitude.toFixed(5)],['Longitud',p.longitude.toFixed(5)],['Versión',String(p.version)],['Fuente','Conjunto sintético LKV']]){
    const row=node('div',undefined,'data-row');row.append(node('span',label),node('strong',value));data.append(row);
  }panel.append(data);
  if(state.bootstrap.user?.role==='admin' && p.hasContact){
    panel.append(node('p','Contacto protegido · visible durante 15 segundos','field-help'));
    for(const [field,label] of [['name','Nombre'],['email','Correo'],['phone','Teléfono']]){
      const row=node('div',undefined,'protected-row'),value=node('span','••••••••'),b=button('',async()=>{
        if(b.getAttribute('aria-pressed')==='true'){value.textContent='••••••••';b.setAttribute('aria-pressed','false');return;}
        b.disabled=true;
        try{const result=await request('/points/'+p.id+'/reveal',{method:'POST',data:{field}});if(state.selected!==p.id)return;value.textContent=result.value;b.setAttribute('aria-pressed','true');b.setAttribute('aria-label','Ocultar '+label);timedHide(()=>{value.textContent='••••••••';b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Mostrar '+label);});}
        catch(e){toast(e.message);}finally{b.disabled=false;}
      },'eye');
      value.dataset.secret=field;b.dataset.reveal=label;b.innerHTML=eye;b.setAttribute('aria-label','Mostrar '+label);b.setAttribute('aria-pressed','false');
      row.append(node('span',label),value,b);panel.append(row);
    }
  }
  const actions=node('div',undefined,'detail-actions');
  actions.append(button('↓ Descargar informe PDF',()=>download(p),'primary'));
  if(state.bootstrap.user?.role==='admin')actions.append(button('Editar punto',()=>openPoint(p)));
  panel.append(actions);
}
async function download(p){try{
  const blob=await request('/points/'+p.id+'/report',{method:'POST',data:{},blob:true});
  const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='LKV-'+p.id.slice(0,12)+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('Informe descargado. Incluye la advertencia referencial.');
}catch(e){toast(e.message);}}
async function setView(view){
  hideSensitive();state.view=view;
  for(const v of ['visor','directory','reports','manage'])$(v+'View').classList.toggle('hidden',view!==v);
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const titles={visor:['El territorio, en perspectiva.','Consulta puntos de interés, explora sus fichas y prepara informes.'],directory:['Cada punto, su contexto.','Consulta el conjunto territorial desde una vista accesible.'],reports:['Información para compartir.','Documentos referenciales generados desde las fichas del visor.'],manage:['Un conjunto bien cuidado.','Administra los registros y revisa su trazabilidad.']};
  $('pageTitle').textContent=titles[view][0];$('pageSubtitle').textContent=titles[view][1];
  if(view==='reports'){try{
    const reports=await request('/reports');$('reportList').replaceChildren(...reports.map(r=>listRow(r.name,new Date(r.generated_at).toLocaleString('es-CL')+' · Versión '+r.point_version,button('Ir a ficha',()=>{setView('visor');$('search').value='';$('categoryFilter').value='';select(r.point_id);}))));
    if(!reports.length)$('reportList').append(node('p','Aún no hay informes. Genera uno desde una ficha territorial.','empty'));
  }catch(e){toast(e.message);}}
  if(view==='manage')renderManagement();
}
async function renderManagement(){
  const target=$('manageContent');target.replaceChildren();
  if(state.bootstrap.user?.role!=='admin'){target.append(node('p','Inicia sesión con un perfil administrador para mantener el conjunto de datos.','empty'),button('Acceder al equipo',openAuth,'primary'));return;}
  const head=node('div',undefined,'section-title');head.append(node('h2','Puntos administrados'),node('p','Publica, edita o retira un registro desde su ficha.'));target.append(head);
  for(const p of state.points)target.append(listRow(p.name,p.category+' · '+p.status+' · v'+p.version,button('Editar',()=>openPoint(p))));
  const h=node('div',undefined,'section-title');h.append(node('h2','Actividad reciente'));target.append(h);
  try{const records=await request('/audit');if(state.view!=='manage')return;const list=node('div',undefined,'audit-list');records.forEach(r=>list.append(node('div',new Date(r.created_at).toLocaleString('es-CL')+' · '+r.username+' · '+r.action.replaceAll('_',' '),'audit-item')));target.append(list);}
  catch(e){toast(e.message);}
}
function openAuth(){
  const setup=state.bootstrap.setupRequired;
  $('authTitle').textContent=setup?'Configura el primer acceso':'Ingresar al equipo';
  $('authHelp').textContent=setup?'Crea la cuenta administradora de esta instalación local. Conserva tu contraseña.':'Accede para administrar puntos y sus contactos protegidos.';
  $('authSubmit').textContent=setup?'Crear cuenta administradora':'Ingresar';
  $('password').autocomplete=setup?'new-password':'current-password';$('authError').textContent='';$('authDialog').showModal();
}
$('authButton').addEventListener('click',async()=>{if(state.bootstrap.user){try{await request('/logout',{method:'POST',data:{}});hideSensitive();await bootstrap();await refresh();toast('Sesión cerrada.');}catch(e){toast(e.message);}}else openAuth();});
$('authForm').addEventListener('submit',async e=>{
  e.preventDefault();$('authSubmit').disabled=true;$('authError').textContent='';
  try{const input={username:$('username').value,password:$('password').value};
    await request(state.bootstrap.setupRequired?'/setup':'/login',{method:'POST',data:await envelope(input,'credentials')});
    $('authDialog').close();await bootstrap();await refresh();toast('Sesión iniciada.');
  }catch(error){$('authError').textContent=error.message;}finally{$('authSubmit').disabled=false;}
});
function openPoint(p){
  $('pointForm').reset();$('pointError').textContent='';
  $('editId').value=p?.id||'';$('editVersion').value=p?.version||'';
  $('pointFormTitle').textContent=p?'Editar punto territorial':'Nuevo punto territorial';
  if(p){$('pointName').value=p.name;$('pointCategory').value=p.category_id;$('pointStatus').value=p.status;$('latitude').value=p.latitude;$('longitude').value=p.longitude;$('description').value=p.description;}
  hideSensitive();$('pointDialog').showModal();
}
$('newPoint').addEventListener('click',()=>openPoint());
$('pointForm').addEventListener('submit',async e=>{
  e.preventDefault();$('savePoint').disabled=true;$('pointError').textContent='';
  try{
    const id=$('editId').value;
    const input={name:$('pointName').value,categoryId:Number($('pointCategory').value),status:$('pointStatus').value,latitude:Number($('latitude').value),longitude:Number($('longitude').value),description:$('description').value,version:Number($('editVersion').value)};
    const contact={name:$('contactName').value,email:$('contactEmail').value,phone:$('contactPhone').value};
    if(Object.values(contact).some(Boolean))input.contact=await envelope(contact,'contact');
    const result=await request('/points'+(id?'/'+id:''),{method:id?'PUT':'POST',data:input});
    state.selected=result.id;$('pointDialog').close();await refresh();toast('Punto guardado correctamente.');
  }catch(error){$('pointError').textContent=error.message;}finally{$('savePoint').disabled=false;}
});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('search').addEventListener('input',render);$('categoryFilter').addEventListener('change',render);
$('zoomIn').addEventListener('click',()=>map.scale(1.25));$('zoomOut').addEventListener('click',()=>map.scale(.8));$('resetMap').addEventListener('click',()=>map.reset());
try{await bootstrap();await refresh();}catch(e){$('detail').replaceChildren(node('h2','No se pudo cargar el visor'),node('p',e.message),button('Reintentar',()=>location.reload()));}
