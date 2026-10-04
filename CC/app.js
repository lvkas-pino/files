(() => {
  'use strict';
  const CFG = window.CLOUD_COFFEE_CONFIG || {};
  const API = String(CFG.API_URL || '').trim();
  const state = {
    view: 'sale', items: [], cart: [], category: 'Todos', search: '', payment: 'Efectivo',
    sales: [], closures: [], shift: null, loading: false
  };

  const $ = (id) => document.getElementById(id);
  const money = (n) => new Intl.NumberFormat(CFG.LOCALE || 'es-CL', {style:'currency',currency:CFG.CURRENCY || 'CLP',maximumFractionDigits:0}).format(Number(n)||0);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeNumber = (v) => Number(String(v ?? '').replace(/[^0-9-]/g,'')) || 0;
  const toast = (msg, bad=false) => { const el=$('toast'); el.textContent=msg; el.style.background=bad?'#8f3d3d':'#211813'; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2600); };
  const setConnection = (ok, msg) => { const el=$('connectionBadge'); el.className='status-pill '+(ok?'status-ok':'status-bad'); el.textContent=msg || (ok?'Conectado':'Sin conexión'); };
  const updateClock=()=> $('clock').textContent = new Intl.DateTimeFormat('es-CL',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date());
  setInterval(updateClock,1000); updateClock();

  function jsonp(action, params={}) {
    return new Promise((resolve,reject)=>{
      if(!API) return reject(new Error('Falta configurar API_URL en config.js'));
      const cb='cccb_'+Date.now()+'_'+Math.random().toString(16).slice(2);
      const script=document.createElement('script');
      const query=new URLSearchParams({action,callback:cb,...params}).toString();
      const timer=setTimeout(()=>{cleanup();reject(new Error('Tiempo de espera agotado'));},15000);
      const cleanup=()=>{clearTimeout(timer);delete window[cb];script.remove();};
      window[cb]=(payload)=>{cleanup(); if(payload?.ok===false) reject(new Error(payload.error||'Error API')); else resolve(payload);};
      script.onerror=()=>{cleanup();reject(new Error('No se pudo conectar con el backend'));};
      script.src=API+(API.includes('?')?'&':'?')+query; document.body.appendChild(script);
    });
  }

  function formPost(action, payload) {
    return new Promise((resolve,reject)=>{
      if(!API) return reject(new Error('Falta configurar API_URL en config.js'));
      const name='ccpost_'+Date.now();
      const iframe=document.createElement('iframe'); iframe.name=name; iframe.style.display='none'; document.body.appendChild(iframe);
      const form=document.createElement('form'); form.method='POST'; form.action=API; form.target=name; form.style.display='none';
      const a=document.createElement('input'); a.name='action'; a.value=action; form.appendChild(a);
      const p=document.createElement('input'); p.name='payload'; p.value=JSON.stringify(payload); form.appendChild(p);
      document.body.appendChild(form);
      let done=false; const finish=(err)=>{if(done)return;done=true;setTimeout(()=>{iframe.remove();form.remove();},250);err?reject(err):resolve({ok:true});};
      const timer=setTimeout(()=>finish(),18000);
      iframe.onload=()=>{clearTimeout(timer);setTimeout(()=>finish(),180);};
      iframe.onerror=()=>{clearTimeout(timer);finish(new Error('No se pudo enviar la operación'));};
      form.submit();
    });
  }

  async function loadAll(){
    state.loading=true;
    try {
      const r=await jsonp('all');
      state.items=r.items||[]; state.sales=r.sales||[]; state.closures=r.closures||[]; state.shift=r.shift||null;
      setConnection(true,'Conectado'); renderAll();
    } catch(e){ setConnection(false,'Revisar conexión'); toast(e.message,true); renderAll(); }
    finally {state.loading=false;}
  }

  const activeItems=()=>state.items.filter(x=>String(x.activo).toLowerCase()!=='false');
  const categories=()=>['Todos',...Array.from(new Set(activeItems().map(x=>x.categoria).filter(Boolean)))];
  const filtered=()=>activeItems().filter(x=>(state.category==='Todos'||x.categoria===state.category) && (!state.search||`${x.nombre} ${x.descripcion||''}`.toLowerCase().includes(state.search.toLowerCase())));
  const cartTotal=()=>state.cart.reduce((s,x)=>s+x.precio*x.cantidad,0);

  function renderProducts(){
    $('categoryBar').innerHTML=categories().map(c=>`<button class="chip ${c===state.category?'active':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    const list=filtered();
    $('productGrid').innerHTML=list.length?list.map(p=>`
      <article class="product" data-add="${esc(p.id)}">
        <div class="product-media">${p.imagen?`<img src="${esc(p.imagen)}" alt="" loading="lazy" onerror="this.style.display='none'">`:''}</div>
        <div class="product-body"><div class="product-name">${esc(p.nombre)}</div><div class="product-desc">${esc(p.descripcion||'')}</div><div class="product-bottom"><span class="price">${money(p.precio)}</span><span class="add-hint">+ Agregar</span></div></div>
      </article>`).join(''):'<div class="empty-state">No hay productos activos con este filtro.</div>';
  }

  function renderCart(){
    $('cartSubtotal').textContent=money(cartTotal()); $('cartTotal').textContent=money(cartTotal());
    $('cartLines').innerHTML=state.cart.length?state.cart.map(x=>`<div class="cart-line"><div class="cart-line-top"><span class="cart-line-name">${esc(x.nombre)}</span><span class="cart-line-price">${money(x.precio*x.cantidad)}</span></div><div class="cart-line-bottom"><div class="qty"><button data-qty="minus" data-id="${esc(x.id)}">−</button><span>${x.cantidad}</span><button data-qty="plus" data-id="${esc(x.id)}">+</button></div><button class="row-actions" data-remove="${esc(x.id)}" title="Eliminar">×</button></div></div>`).join(''):'<div class="empty-state compact">Agrega productos para comenzar.</div>';
    updateCash();
  }

  function updateCash(){
    const total=cartTotal(), received=safeNumber($('cashReceived').value), change=received-total;
    $('cashChange').textContent=money(Math.max(0,change)); $('cashChange').classList.toggle('negative',state.payment==='Efectivo'&&received>0&&change<0);
    $('completeSale').disabled=!state.cart.length || (state.payment==='Efectivo' && received<total);
    $('cashBlock').style.display=state.payment==='Efectivo'?'block':'none';
  }

  function addCart(id){
    const p=state.items.find(x=>x.id===id); if(!p)return;
    const line=state.cart.find(x=>x.id===id); if(line) line.cantidad++; else state.cart.push({id:p.id,nombre:p.nombre,precio:Number(p.precio)||0,cantidad:1}); renderCart();
  }
  function changeQty(id,delta){const l=state.cart.find(x=>x.id===id);if(!l)return;l.cantidad+=delta;if(l.cantidad<=0)state.cart=state.cart.filter(x=>x.id!==id);renderCart();}

  function renderSales(){
    const today=new Date().toISOString().slice(0,10);
    const todays=state.sales.filter(s=>String(s.datetime||'').slice(0,10)===today);
    const total=todays.reduce((a,s)=>a+Number(s.total||0),0), cash=todays.filter(s=>s.metodo_pago==='Efectivo').reduce((a,s)=>a+Number(s.total||0),0), transfer=todays.filter(s=>s.metodo_pago==='Transferencia').reduce((a,s)=>a+Number(s.total||0),0);
    $('salesMetrics').innerHTML=[['Pedidos',todays.length],['Total',money(total)],['Efectivo',money(cash)],['Transferencia',money(transfer)]].map(([l,v])=>`<div class="metric"><div class="metric-label">${l}</div><div class="metric-value">${esc(v)}</div></div>`).join('');
    $('salesTableBody').innerHTML=state.sales.length?state.sales.slice(0,100).map(s=>`<tr><td>${esc(s.datetime)}</td><td>${esc(s.id_venta)}</td><td>${esc(formatDetail(s.items_detalle))}</td><td>${esc(s.metodo_pago)}</td><td><strong>${money(s.total)}</strong></td><td><span class="badge ${s.estado==='PAGADA'?'badge-ok':'badge-off'}">${esc(s.estado)}</span></td></tr>`).join(''):'<tr><td colspan="6" class="empty-cell">Todavía no hay ventas.</td></tr>';
  }
  const formatDetail=(s)=>{try{const a=JSON.parse(s);return a.map(x=>`${x.cantidad}× ${x.nombre}`).join(', ')}catch{return String(s||'')}};

  function renderItems(){
    $('itemsTableBody').innerHTML=state.items.length?state.items.map(p=>`<tr><td><strong>${esc(p.nombre)}</strong><div class="fine-print">${esc(p.id)}</div></td><td>${esc(p.categoria)}</td><td>${esc(p.descripcion||'')}</td><td><strong>${money(p.precio)}</strong></td><td><span class="badge ${String(p.activo).toLowerCase()!=='false'?'badge-ok':'badge-off'}">${String(p.activo).toLowerCase()!=='false'?'ACTIVO':'INACTIVO'}</span></td><td><div class="row-actions"><button data-edit-item="${esc(p.id)}">Editar</button><button data-toggle-item="${esc(p.id)}">${String(p.activo).toLowerCase()!=='false'?'Desactivar':'Activar'}</button></div></td></tr>`).join(''):'<tr><td colspan="6" class="empty-cell">No hay productos en el catálogo.</td></tr>';
  }

  function renderClosing(){
    const s=state.shift||{total_turno:0,total_efectivo:0,total_transferencia:0,cantidad_pedidos:0,desde:null};
    $('shiftOrders').textContent=s.cantidad_pedidos||0; $('shiftTotal').textContent=money(s.total_turno);
    $('shiftPeriod').textContent=s.desde?`Desde ${s.desde}`:'Desde el inicio del registro';
    $('closingMetrics').innerHTML=[['Efectivo',money(s.total_efectivo)],['Transferencia',money(s.total_transferencia)]].map(([l,v])=>`<div class="metric"><div class="metric-label">${l}</div><div class="metric-value">${esc(v)}</div></div>`).join('');
    $('closuresList').innerHTML=state.closures.length?state.closures.map(c=>`<div class="closure"><div class="closure-top"><span>${esc(c.datetime)}</span><span>${money(c.total_turno)}</span></div><div class="closure-meta"><span>${c.cantidad_pedidos||0} pedidos</span><span>Efectivo ${money(c.total_efectivo)}</span><span>Transf. ${money(c.total_transferencia)}</span></div></div>`).join(''):'<div class="empty-state compact">No hay cierres registrados.</div>';
    $('closeShift').disabled=Number(s.cantidad_pedidos||0)<=0;
  }

  function renderAll(){renderProducts();renderCart();renderSales();renderItems();renderClosing();}

  function goView(name){state.view=name;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));document.querySelectorAll('.nav-btn').forEach(v=>v.classList.toggle('active',v.dataset.view===name));}

  async function saveSale(){
    if(!state.cart.length)return; const total=cartTotal(), received=state.payment==='Efectivo'?safeNumber($('cashReceived').value):0;
    if(state.payment==='Efectivo'&&received<total){toast('El dinero entregado no alcanza para completar la venta.',true);return;}
    const payload={items:state.cart.map(x=>({id:x.id,cantidad:x.cantidad})),metodo_pago:state.payment,dinero_entregado:received};
    try{ $('completeSale').disabled=true; await formPost('sale',payload); toast(`Venta registrada · ${money(total)}`); state.cart=[];$('cashReceived').value=''; await loadAll(); goView('sale'); }
    catch(e){toast(e.message,true);} finally{renderCart();}
  }

  function openItem(item=null){
    $('itemDialogTitle').textContent=item?'Editar producto':'Nuevo producto';
    $('itemId').value=item?.id||'';$('itemName').value=item?.nombre||'';$('itemCategory').value=item?.categoria||'';$('itemDescription').value=item?.descripcion||'';$('itemPrice').value=item?String(item.precio||''):'';$('itemImage').value=item?.imagen||'';$('itemActive').checked=item?String(item.activo).toLowerCase()!=='false':true;$('itemDialog').showModal();
  }

  async function saveItem(){
    const payload={id:$('itemId').value.trim(),nombre:$('itemName').value.trim(),categoria:$('itemCategory').value.trim(),descripcion:$('itemDescription').value.trim(),precio:safeNumber($('itemPrice').value),imagen:$('itemImage').value.trim(),activo:$('itemActive').checked};
    if(!payload.nombre||!payload.categoria||payload.precio<=0){toast('Completa nombre, categoría y precio.',true);return;}
    try{await formPost('saveItem',payload);$('itemDialog').close();toast('Producto guardado');await loadAll();goView('items');}catch(e){toast(e.message,true)}
  }

  async function toggleItem(id){const p=state.items.find(x=>x.id===id);if(!p)return;try{await formPost('toggleItem',{id,activo:!(String(p.activo).toLowerCase()!=='false')});toast('Estado actualizado');await loadAll();}catch(e){toast(e.message,true)}}

  async function closeShift(){
    $('confirmTitle').textContent='¿Registrar cierre de turno?'; $('confirmBody').textContent=`Se registrarán ${state.shift?.cantidad_pedidos||0} pedidos por ${money(state.shift?.total_turno||0)} y el período quedará cerrado.`; $('confirmDialog').classList.remove('hidden');
  }
  async function doClose(){
    $('confirmDialog').classList.add('hidden'); try{await formPost('close',{});toast('Cierre registrado correctamente');await loadAll();}catch(e){toast(e.message,true)}}

  document.addEventListener('click',e=>{
    const nav=e.target.closest('.nav-btn'); if(nav){goView(nav.dataset.view);return;}
    const cat=e.target.closest('[data-cat]'); if(cat){state.category=cat.dataset.cat;renderProducts();return;}
    const add=e.target.closest('[data-add]'); if(add){addCart(add.dataset.add);return;}
    const qty=e.target.closest('[data-qty]'); if(qty){changeQty(qty.dataset.id,qty.dataset.qty==='plus'?1:-1);return;}
    const rm=e.target.closest('[data-remove]'); if(rm){state.cart=state.cart.filter(x=>x.id!==rm.dataset.remove);renderCart();return;}
    const pay=e.target.closest('[data-payment]'); if(pay){state.payment=pay.dataset.payment;document.querySelectorAll('.pay-btn').forEach(b=>b.classList.toggle('active',b.dataset.payment===state.payment));updateCash();return;}
    const edit=e.target.closest('[data-edit-item]'); if(edit){openItem(state.items.find(p=>p.id===edit.dataset.editItem));return;}
    const tog=e.target.closest('[data-toggle-item]'); if(tog){toggleItem(tog.dataset.toggleItem);return;}
    if(e.target.id==='clearCart'){state.cart=[];$('cashReceived').value='';renderCart();}
    if(e.target.id==='completeSale')saveSale();
    if(e.target.id==='newItem')openItem();
    if(e.target.id==='saveItem')saveItem();
    if(e.target.dataset.closeDialog){$(e.target.dataset.closeDialog).close();}
    if(e.target.id==='refreshSale'||e.target.id==='refreshSales'||e.target.id==='refreshClosing')loadAll();
    if(e.target.id==='closeShift')closeShift(); if(e.target.id==='confirmOk')doClose(); if(e.target.id==='confirmCancel')$('confirmDialog').classList.add('hidden');
  });
  $('productSearch').addEventListener('input',e=>{state.search=e.target.value;renderProducts()});
  $('cashReceived').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'');updateCash()});
  loadAll();
})();
