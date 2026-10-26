(() => {
  const init = () => {
    document.querySelectorAll('[data-action="collapse"]').forEach(el => el.addEventListener('click', () => document.querySelector('.app-shell')?.classList.toggle('is-collapsed')));
    document.querySelectorAll('[data-action="mobile-menu"]').forEach(el => el.addEventListener('click', () => document.body.classList.toggle('mobile-menu-open')));
    document.querySelectorAll('.sidebar nav a, .logout-link').forEach(link => link.addEventListener('click', () => document.body.classList.remove('mobile-menu-open')));
    /* Responsivo: el menú tipo cajón se cierra al tocar fuera, con Esc o al pasar a pantalla ancha */
    const cerrarMenuMovil = () => document.body.classList.remove('mobile-menu-open');
    document.addEventListener('click', e => {
      if (!document.body.classList.contains('mobile-menu-open')) return;
      if (!e.target.closest('.sidebar') && !e.target.closest('[data-action="mobile-menu"]')) cerrarMenuMovil();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenuMovil(); });
    const mqMovil = window.matchMedia('(max-width: 820px)');
    const alCambiarPantalla = () => {
      cerrarMenuMovil();
      if (mqMovil.matches) document.querySelector('.app-shell')?.classList.remove('is-collapsed');
    };
    mqMovil.addEventListener ? mqMovil.addEventListener('change', alCambiarPantalla) : mqMovil.addListener(alCambiarPantalla);
    alCambiarPantalla();
    const syncActiveNav = () => {
      const path = location.pathname.replace(/\/$/, '') || '/';
      document.querySelectorAll('.sidebar nav a').forEach(link => {
        const href = new URL(link.href, location.origin).pathname.replace(/\/$/, '') || '/';
        link.classList.toggle('active', href === path || (path.startsWith(href + '/') && href !== '/'));
      });
    };
    syncActiveNav();
    window.addEventListener('pageshow', syncActiveNav);
    window.addEventListener('popstate', syncActiveNav);
    document.querySelectorAll('[data-action="notify"]').forEach(el => el.addEventListener('click', openNotifications));
    document.querySelectorAll('[data-current-date]').forEach(el => { el.textContent = TGDateLabel(); });
    document.querySelectorAll('[data-toggle-active]').forEach(el => el.addEventListener('click', () => { const parent=el.parentElement; parent?.querySelectorAll('[data-toggle-active]').forEach(b=>b.classList.remove('active')); el.classList.add('active'); }));
    document.querySelectorAll('[data-table-search]').forEach(input => input.addEventListener('input', () => { const q=input.value.toLowerCase(); const table=input.closest('.card')?.querySelector('tbody')||document.querySelector('tbody'); table?.querySelectorAll('tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q)); }));
    document.querySelectorAll('[data-product-search]').forEach(input => input.addEventListener('input', () => { const q=input.value.toLowerCase(); document.querySelectorAll('.product-card').forEach(p=>p.hidden=!p.textContent.toLowerCase().includes(q)); }));
    document.querySelectorAll('[data-report]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-report]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
    document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-category]').forEach(x=>x.classList.remove('active'));b.classList.add('active');const c=b.dataset.category;document.querySelectorAll('[data-product-category]').forEach(p=>p.hidden=c!=='Todos'&&p.dataset.productCategory.toLowerCase()!==c.toLowerCase());}));
  };
  function TGDateLabel(){const d=new Date(),m=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];return String(d.getDate()).padStart(2,'0')+' '+m[d.getMonth()]+' '+d.getFullYear();}
  function safeName(c){return window.TG?.nombre?TG.esc(TG.nombre(c)||'Cliente sin nombre'):((c?.nombres||'')+' '+(c?.apellidos||'')).trim()||'Cliente sin nombre';}
  function dayDiff(iso){if(!iso)return null;const a=new Date(TG.hoyISO()+'T00:00:00'),b=new Date(String(iso).slice(0,10)+'T00:00:00');return Math.round((b-a)/86400000);}
  function dueLabel(iso){const n=dayDiff(iso);if(n===null)return 'Sin fecha registrada';if(n<0)return '<span class="tg-overdue">Vencido hace '+Math.abs(n)+' día'+(Math.abs(n)===1?'':'s')+'</span>';if(n===0)return '<span class="tg-alert">Termina hoy</span>';return '<span class="tg-alert">Faltan '+n+' día'+(n===1?'':'s')+'</span>';}
  let cerrarNotificaciones=null;
  async function openNotifications(){
    if(cerrarNotificaciones)cerrarNotificaciones();
    document.querySelector('.tg-notify-backdrop')?.remove();document.querySelector('.tg-notify-panel')?.remove();
    const isAdmin=location.pathname.startsWith('/admin');
    const backdrop=document.createElement('div');backdrop.className='tg-notify-backdrop';
    const panel=document.createElement('section');panel.className='tg-notify-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    panel.innerHTML='<div class="tg-notify-head"><div><h2>Notificaciones</h2><p class="tg-notify-sub">Plazos que requieren atención · '+TGDateLabel()+'</p></div><button type="button" class="tg-notify-close" aria-label="Cerrar notificaciones">×</button></div><div class="tg-notify-body">Cargando información…</div>';
    document.body.append(backdrop,panel);
    /* En pantallas pequeñas el panel ocupa casi todo el ancho: se bloquea el scroll de fondo y se cierra con ×, tocando fuera o con Esc */
    const bloquear=window.matchMedia('(max-width: 820px)').matches,overflowPrevio=document.body.style.overflow;
    if(bloquear)document.body.style.overflow='hidden';
    const alTecla=e=>{if(e.key==='Escape')close()};
    const close=()=>{backdrop.remove();panel.remove();document.removeEventListener('keydown',alTecla);document.body.style.overflow=overflowPrevio;if(cerrarNotificaciones===close)cerrarNotificaciones=null};
    cerrarNotificaciones=close;document.addEventListener('keydown',alTecla);
    backdrop.addEventListener('click',close);const botonX=panel.querySelector('.tg-notify-close');botonX.addEventListener('click',close);botonX.focus({preventScroll:true});
    try{
      const [boletas,confs]=await Promise.all([TG.boletas(),TG.get('/api/confecciones')]);
      const body=panel.querySelector('.tg-notify-body');
      if(isAdmin){
        const active=boletas.filter(b=>b.estado!=='Anulada');
        const groups=[{name:'Compra',types:['Venta','Compra']},{name:'Confección',types:['Confección']},{name:'Alquiler',types:['Alquiler']}].map(g=>({name:g.name,count:active.filter(b=>g.types.includes(b.tipo)).length,total:active.filter(b=>g.types.includes(b.tipo)).reduce((s,b)=>s+(Number(b.monto)||0),0)})).sort((a,b)=>b.count-a.count||b.total-a.total).slice(0,3);
        body.innerHTML='<h3>Top 3 de operaciones</h3>'+groups.map((g,i)=>'<div class="tg-rank-row"><span><strong>#'+(i+1)+'</strong> &nbsp;'+TG.esc(g.name)+'</span><span>'+g.count+' operación'+(g.count===1?'':'es')+'<br><span class="tg-meta">'+TG.money(g.total)+'</span></span></div>').join('')+'<p class="tg-notify-sub">Ordenado por cantidad de boletas vigentes; el importe se muestra como referencia.</p>';
        return;
      }
      const hoy=TG.hoyISO();
      const rent=boletas.filter(b=>b.tipo==='Alquiler'&&b.estado==='Vigente'&&b.fechaDevolucion).map(b=>({...b,_date:b.fechaDevolucion})).sort((a,b)=>dayDiff(a._date)-dayDiff(b._date)).slice(0,4);
      const fitting=confs.filter(c=>c.estado!=='Entregada'&&c.primeraPrueba).map(c=>({...c,_date:c.primeraPrueba})).sort((a,b)=>dayDiff(a._date)-dayDiff(b._date)).slice(0,4);
      const delivery=confs.filter(c=>c.estado!=='Entregada'&&c.entregaFinal).map(c=>({...c,_date:c.entregaFinal})).sort((a,b)=>dayDiff(a._date)-dayDiff(b._date)).slice(0,4);
      const block=(title,items,kind)=>'<h3>'+title+'</h3>'+(items.length?items.map(x=>{const client=safeName(x.cliente),code=kind==='rent'?(x.numero||('Boleta #'+x.id)):(x.ticket||('Ticket #'+x.id));const garment=kind==='rent'&&x.prenda?'<div class="tg-meta">Prenda: '+TG.esc(x.prenda.diseno||x.prenda.codigo||'—')+'</div>':'';return '<div class="tg-notify-item"><strong>'+client+'</strong><div class="tg-meta">'+(kind==='rent'?'Boleta: ':'Ticket: ')+TG.esc(code)+'</div>'+garment+'<div>'+dueLabel(x._date)+'</div><div class="tg-meta">Fecha límite: '+TG.fecha(x._date)+'</div></div>'}).join(''):'<div class="tg-notify-empty">No hay plazos próximos ni vencidos.</div>');
      body.innerHTML=block('Alquileres · devolución',rent,'rent')+block('Confección · primera prueba',fitting,'fit')+block('Confección · entrega final',delivery,'delivery');
    }catch(e){panel.querySelector('.tg-notify-body').innerHTML='<div class="tg-notify-empty">No se pudieron cargar las notificaciones. '+TG.esc(e.message||'')+'</div>'}
  }
  function showToast(message){const box=document.getElementById('toast'),label=document.getElementById('toastMessage');if(box){if(label)label.textContent=message;box.hidden=false;window.setTimeout(()=>{box.hidden=true},2800);}else alert(message);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
