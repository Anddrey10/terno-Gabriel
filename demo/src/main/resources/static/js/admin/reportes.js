// Informes construidos desde los datos reales del sistema (API Spring Boot), no desde datos de demostración.
document.addEventListener('DOMContentLoaded', () => TG.listo(async () => {
  const $ = s => document.querySelector(s); const $$ = s => [...document.querySelectorAll(s)];
  const inputs = {desde: $$('input[type="date"]')[0], hasta: $$('input[type="date"]')[1], tipo: $$('.select-input')[0], estado: $$('.select-input')[1], generar: $('[data-action="generate-report"]'), tabs: $$('[data-report]')};
  let boletas=[], prendas=[], clientes=[], confecciones=[], tipoReporte='Ventas';
  const nombre = c => c ? TG.nombre(c) : '—';
  const mapBoleta = b => ({fecha:b.fecha||'',doc:b.numero||'—',cliente:nombre(b.cliente),prod:b.prenda?.diseno||(b.confeccion?.ticket?'Confección '+b.confeccion.ticket:'Servicio de confección'),tipo:b.tipo,estado:b.estado,emp:b.empleado||'—',total:Number(b.monto)||0});
  const dataset = () => {
    if(tipoReporte==='Confecciones') return confecciones.map(c=>({fecha:c.fecha||'',doc:c.ticket||'—',cliente:nombre(c.cliente),prod:'Confección a medida',tipo:'Confección',estado:c.estado,emp:c.empleado||'—',total:Number(c.costoTotal)||0}));
    if(tipoReporte==='Devoluciones') return boletas.filter(b=>b.tipo==='Alquiler'&&b.estado==='Devuelta').map(mapBoleta);
    if(tipoReporte==='Inventario') return prendas.map(p=>({fecha:'',doc:p.codigo,cliente:'Inventario',prod:p.diseno,tipo:p.tipo,estado:p.estado,emp:'—',total:1}));
    if(tipoReporte==='Clientes') return clientes.filter(c=>c.calificacion).map(c=>({fecha:c.fechaCalificacion||c.registro||'',doc:c.dni,cliente:nombre(c),prod:'Calificación de cliente',tipo:'Calificación',estado:'Registrado',emp:'—',total:Number(c.promedio||c.calificacion)||0}));
    return boletas.filter(b=>tipoReporte==='Ventas'?b.tipo==='Venta':b.tipo==='Alquiler').map(mapBoleta);
  };
  const fechaFmt=f=>f?f.split('-').reverse().join('/'):'—';
  const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
  function generar(){
    const desde=inputs.desde?.value||'',hasta=inputs.hasta?.value||'',tipo=inputs.tipo?.value||'Todos',estado=inputs.estado?.value||'Todos',cliente=($('#filtroCliente')?.value||'').toLowerCase().trim(),empleado=($('#filtroEmpleado')?.value||'').toLowerCase().trim();
    const datos=dataset().filter(x=>(!desde||!x.fecha||x.fecha>=desde)&&(!hasta||!x.fecha||x.fecha<=hasta)&&(tipo==='Todos'||x.tipo.toLowerCase()===tipo.toLowerCase()||x.prod.toLowerCase().includes(tipo.toLowerCase()))&&(estado==='Todos'||x.estado.toLowerCase()===estado.toLowerCase())&&(!cliente||(x.cliente+' '+x.doc).toLowerCase().includes(cliente))&&(!empleado||x.emp.toLowerCase().includes(empleado)));
    const titulo=$('.card-head h2'),sub=$('.card-head p'); if(titulo)titulo.textContent='Resultados · '+tipoReporte;if(sub)sub.textContent=fechaFmt(desde)+' — '+fechaFmt(hasta)+' · '+datos.length+' registros';
    const suma=datos.reduce((s,x)=>s+x.total,0), promedio=datos.length?suma/datos.length:0, kpis=$$('.kpi-card');
    if(kpis[0]){kpis[0].querySelector('.kpi-value').textContent=tipoReporte==='Inventario'?datos.length+' prendas':tipoReporte==='Clientes'?promedio.toFixed(1)+' ★':money(suma);kpis[0].querySelector('.kpi-sub').textContent=datos.length+' registros';}
    if(kpis[1]){kpis[1].querySelector('.kpi-value').textContent=tipoReporte==='Inventario'? '—':tipoReporte==='Clientes'?promedio.toFixed(1)+' promedio':money(promedio);kpis[1].querySelector('.kpi-sub').textContent='Promedio según filtros';}
    if(kpis[2]){kpis[2].querySelector('.kpi-value').textContent=datos.length?datos.slice().sort((a,b)=>b.total-a.total)[0].prod:'Sin datos';kpis[2].querySelector('.kpi-sub').textContent='Registro destacado';}
    const groups={};datos.forEach(x=>{const k=x.prod;groups[k]??={cantidad:0,total:0};groups[k].cantidad++;groups[k].total+=x.total;});const ranked=Object.entries(groups).map(([producto,v])=>({producto,...v})).sort((a,b)=>b.total-a.total);
    const chart=$('.chart-bars-visual'),rank=$('.ranking-list');
    if(chart)chart.innerHTML=ranked.length?ranked.slice(0,8).map((x,i)=>'<div class="bar-group"><div class="bar '+(!i?'active-bar':'')+'" style="height:'+Math.max(6,Math.round(x.total/Math.max(1,...ranked.map(y=>y.total))*100))+'%" title="'+TG.esc(String(x.total))+'"><span>'+TG.esc(tipoReporte==='Inventario'?String(x.cantidad):money(x.total))+'</span></div><label>'+TG.esc(x.producto.split(' ').slice(0,2).join(' '))+'</label></div>').join(''):'<p style="margin:auto;color:#94a3b8">Sin registros</p>';
    if(rank)rank.innerHTML=ranked.length?ranked.slice(0,3).map((x,i)=>'<li><div class="rank-info"><span class="badge-rank '+(['gold','silver','bronze'][i])+'">'+(i+1)+'</span><div><strong>'+TG.esc(x.producto)+'</strong><small>'+x.cantidad+' registro(s)</small></div></div><span class="rank-value">'+(tipoReporte==='Inventario'?x.cantidad+' unid.':money(x.total))+'</span></li>').join(''):'<li style="justify-content:center">Sin registros</li>';
    const tbody=$('.data-table tbody');if(tbody)tbody.innerHTML=datos.length?datos.map(x=>'<tr><td>'+fechaFmt(x.fecha)+'</td><td>'+TG.esc(x.doc)+'</td><td>'+TG.esc(x.cliente)+'</td><td>'+TG.esc(x.prod)+'</td><td>'+TG.esc(x.emp)+'</td><td>'+ (tipoReporte==='Inventario'?x.total+' unid.':tipoReporte==='Clientes'?x.total.toFixed(1)+' ★':money(x.total))+'</td></tr>').join(''):'<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">No se encontraron resultados para los filtros seleccionados.</td></tr>';
  }
  inputs.tabs.forEach(tab=>tab.addEventListener('click',()=>{inputs.tabs.forEach(t=>t.classList.toggle('active',t===tab));tipoReporte=tab.dataset.report;generar();}));
  inputs.generar?.addEventListener('click',()=>{generar();TG.toast('Informe actualizado con los datos del sistema');});
  [inputs.desde,inputs.hasta,inputs.tipo,inputs.estado,$('#filtroCliente'),$('#filtroEmpleado')].filter(Boolean).forEach(el=>el.addEventListener(el.type==='search'?'input':'change',generar));
  try{[boletas,prendas,clientes,confecciones]=await Promise.all([TG.boletas(),TG.prendas(),TG.clientes(),TG.get('/api/confecciones')]);}catch(e){TG.toast('No se pudieron cargar los datos de los informes: '+e.message)}
  generar();
}));
