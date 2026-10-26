document.addEventListener('DOMContentLoaded', () => TG.listo(async () => {
  const $ = id => document.getElementById(id);
  let boletas = [], confecciones = [], penalidades = [], kind = 'Alquiler', vistaAnuladas = false, filasVisibles = [];
  const money = n => 'S/ ' + (Number(n) || 0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const nombre = c => c ? TG.nombre(c) : '—';
  const fecha = b => b.fecha || b.fechaRegistro || '';
  const esDevolucion = b => b.tipo === 'Alquiler' && b.estado === 'Devuelta';
  const codigo = b => {
    const n = b.numero || b.ticket || '—';
    return kind === 'Devolución' && n !== '—' ? 'D' + n.slice(1) : n;
  };
  const normalize = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const filtrarTipo = () => {
    if (kind === 'Tickets') return confecciones.map(c => ({...c, _ticket:true, numero:c.ticket, fecha:c.fecha, monto:c.costoTotal, estado:c.estado, cliente:c.cliente, detalle:'Orden de confección'}));
    if (kind === 'Devolución') return boletas.filter(esDevolucion).map(b => ({...b, _devolucion:true, numero:'D'+String(b.numero||'').slice(1)}));
    if (kind === 'Confección') return boletas.filter(b => b.tipo === 'Confección');
    return boletas.filter(b => b.tipo === kind);
  };
  const TIPOS = ['Alquiler','Venta','Confección','Devolución','Tickets'];
  const TIPO_TXT = {Alquiler:'Alquiler', Venta:'Compra', 'Confección':'Boleta de confección', 'Devolución':'Devolución', Tickets:'Ticket'};
  const TIPO_CLASE = {Alquiler:'alq', Venta:'com', 'Confección':'con', 'Devolución':'dev', Tickets:'tic'};
  const EST_CLASE = {Vigente:'est-disponible', Devuelta:'est-vendido', Anulada:'est-restauracion', Entregada:'est-confeccion', 'En confección':'est-alquilado'};
  const filasDe = k => { const prev = kind; kind = k; const r = filtrarTipo().map(x => ({...x, _k:k})); kind = prev; return r; };
  const todas = () => TIPOS.flatMap(filasDe);
  /* Cada penalidad se asigna a la devolución del mismo cliente (no se reparte dos veces) */
  const asignarPenalidades = () => {
    const usadas = new Set();
    boletas.filter(esDevolucion).sort((x,y)=>(x.id||0)-(y.id||0)).forEach(b => {
      const p = penalidades.filter(q => !usadas.has(q.id) && q.cliente?.id === b.cliente?.id && String(q.fecha||'') >= String(b.fecha||''))
        .sort((x,y)=>String(x.fecha).localeCompare(String(y.fecha)) || (x.id||0)-(y.id||0))[0];
      if (p) { usadas.add(p.id); b._pen = p; }
    });
  };

  /* Buscador: mismas restricciones que el resto del sistema.
     - Empieza con número  → DNI: solo números, máximo 8
     - B / D / T + número  → código de comprobante: B001-0001, D001-0001, T001-0001 (guion automático)
     - Otro texto          → cliente, prenda o palabra clave (alquiler, compra, ticket, vigente, anulada…) */
  const esModoCodigo = v => /^[BDTbdt]$/.test(v) || /^[BDTbdt][\d-]/.test(v);
  const filtroBusqueda = v => {
    v = v.replace(/^\s+/, '');
    if (/^\d/.test(v)) return v.replace(/\D/g, '').slice(0, 8);
    if (esModoCodigo(v)) {
      const n = v.slice(1).replace(/\D/g, '').slice(0, 7);
      return v[0].toUpperCase() + (n.length > 3 ? n.slice(0, 3) + '-' + n.slice(3) : (v.includes('-') && n.length === 3 ? n + '-' : n));
    }
    return v.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s'-]/g, '').replace(/\s{2,}/g, ' ').slice(0, 40);
  };
  const reglaBusqueda = {
    filtro: filtroBusqueda,
    ok: v => {
      if (/^\d+$/.test(v)) return v.length === 8;
      if (esModoCodigo(v)) return /^[BDT]\d{3}-\d{1,4}$/.test(v);
      return v.trim().length >= 2;
    },
    msg: 'Búsqueda incompleta: DNI de 8 números, código completo (ej. B001-0001) o al menos 2 letras'
  };
  const sinTildes = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  /* Palabras que reconocen el tipo de comprobante */
  const PALABRAS_TIPO = {
    alquiler:['Alquiler'], alquileres:['Alquiler'], compra:['Venta'], compras:['Venta'], venta:['Venta'], ventas:['Venta'],
    confeccion:['Confección','Tickets'], confecciones:['Confección','Tickets'], ticket:['Tickets'], tickets:['Tickets'],
    devolucion:['Devolución'], devoluciones:['Devolución'], boleta:['Alquiler','Venta','Confección','Devolución'], boletas:['Alquiler','Venta','Confección','Devolución']
  };
  const coincideToken = (b, tok) => {
    const t = sinTildes(tok).trim(); if (!t) return true;
    if (/^\d+$/.test(t)) return String(b.cliente?.dni || '').startsWith(t);
    if (/^[bdt]\d*-?\d*$/.test(t)) {
      const n = normalize(t);
      return [b.numero, b.ticket, b.confeccion?.ticket, b._devolucion ? 'B' + String(b.numero || '').slice(1) : ''].some(c => c && normalize(c).startsWith(n));
    }
    if (t.length >= 3) {
      const tipos = new Set(); Object.entries(PALABRAS_TIPO).forEach(([k, v]) => { if (k.startsWith(t)) v.forEach(x => tipos.add(x)); });
      if (tipos.has(b._k) || sinTildes(b.estado).includes(t)) return true;
    }
    const n = normalize(tok);
    return [nombre(b.cliente), b.prenda?.diseno, b.detalle, b.motivoAnulacion, b.metodoPago, b.empleado].some(x => sinTildes(x).includes(t)) || (!!n && normalize(b.prenda?.codigo).includes(n));
  };
  const coincideBusqueda = (b, q) => q.split(/\s+/).filter(Boolean).every(tok => coincideToken(b, tok));
  function pintar(){
    const qTexto = $('buscarBoleta').value.trim(), buscando = qTexto.length > 0;
    const desde=$('fechaDesde').value, hasta=$('fechaHasta').value, estado=$('estadoBoleta').value;
    /* Con texto en el buscador se revisan todos los comprobantes y cada resultado indica su tipo */
    let rows = buscando ? todas() : filtrarTipo().map(r => ({...r, _k:kind}));
    if (!buscando && vistaAnuladas && kind !== 'Devolución' && kind !== 'Tickets') rows = rows.filter(b => b.estado === 'Anulada');
    rows = rows.filter(b => (!desde || fecha(b) >= desde) && (!hasta || fecha(b) <= hasta) && (estado === 'Todos' || b.estado === estado) && (!buscando || coincideBusqueda(b, qTexto)));
    const base = filtrarTipo();
    const activas = base.filter(b => b.estado !== 'Anulada');
    const totalActual = base.length;
    const suma = arr => arr.reduce((s,b)=>s+(Number(b.monto ?? b.costoTotal)||0),0);
    const sumaTipo = tipo => suma(boletas.filter(b=>b.tipo===tipo && b.estado!=='Anulada'));
    const gananciaAlquiler = sumaTipo('Alquiler');
    const gananciaCompra = sumaTipo('Venta');
    const gananciaConfeccion = sumaTipo('Confección');
    const penalidadDemora = penalidades.reduce((s,p)=>s+(Number(p.montoDemora)||((p.tipo==='Demora')?Number(p.monto)||0:0)),0);
    const penalidadMalEstado = penalidades.reduce((s,p)=>s+(Number(p.montoMalEstado)||((p.tipo==='Mal estado')?Number(p.monto)||0:0)),0);
    const gananciaDevolucion = penalidadDemora + penalidadMalEstado;
    const totalGanancias = gananciaAlquiler + gananciaCompra + gananciaConfeccion + gananciaDevolucion;
    const gananciaActual = ({Alquiler:gananciaAlquiler,Venta:gananciaCompra,Confección:gananciaConfeccion,Devolución:gananciaDevolucion,Tickets:0})[kind] || 0;
    const tituloTipo = ({Alquiler:'boletas de alquiler',Venta:'boletas de compra',Confección:'boletas de ticket de confección',Devolución:'devoluciones de alquiler',Tickets:'tickets de confección'})[kind];
    const esVistaEspecial = kind === 'Devolución';
    const admitePerdidas = ['Alquiler','Venta','Confección'].includes(kind);
    const anuladasActual = base.filter(b=>b.estado==='Anulada');
    const perdidaTotalActual = suma(anuladasActual);
    const perdidasGlobales = suma(boletas.filter(b=>['Alquiler','Venta','Confección'].includes(b.tipo) && b.estado==='Anulada'));
    const importeCategoria = ({Alquiler:gananciaAlquiler,Venta:gananciaCompra,Confección:gananciaConfeccion,Devolución:gananciaDevolucion,Tickets:0})[kind] || 0;
    $('boletaKpis').hidden = kind === 'Tickets';
    $('labelTotal').textContent = 'Total de ' + tituloTipo;
    $('kpiTotal').textContent = totalActual;
    $('labelGanancia').textContent = (vistaAnuladas && admitePerdidas) ? 'Pérdida total' : 'Ganancia total';
    $('kpiGanado').textContent = money((vistaAnuladas && admitePerdidas) ? perdidaTotalActual : gananciaActual);
    $('labelPorcentaje').textContent = (vistaAnuladas && admitePerdidas) ? 'Porcentaje de pérdida' : 'Porcentaje de ganancia';
    $('kpiPorcentaje').textContent = (vistaAnuladas && admitePerdidas ? (totalActual ? (anuladasActual.length / totalActual * 100).toFixed(1) : '0') : (totalGanancias ? (gananciaActual / totalGanancias * 100).toFixed(1) : '0')) + '%';
    $('kpiComparativo').textContent = 'Participación sobre las ganancias de las 4 categorías';
    const cardPerdidas = $('kpiPerdidasCard');
    const tarjetaSalidaConfeccion = kind === 'Confección';
    cardPerdidas.classList.toggle('clickable', admitePerdidas && !tarjetaSalidaConfeccion);
    cardPerdidas.classList.toggle('loss', !esVistaEspecial && !tarjetaSalidaConfeccion);
    cardPerdidas.classList.toggle('cream', esVistaEspecial || tarjetaSalidaConfeccion);
    if (tarjetaSalidaConfeccion) {
      cardPerdidas.removeAttribute('role');
      cardPerdidas.removeAttribute('tabindex');
      cardPerdidas.setAttribute('aria-disabled', 'true');
      cardPerdidas.removeAttribute('aria-pressed');
    } else {
      cardPerdidas.setAttribute('role', 'button');
      cardPerdidas.setAttribute('tabindex', '0');
      cardPerdidas.removeAttribute('aria-disabled');
    }
    cardPerdidas.classList.toggle('selected-mode', admitePerdidas && !tarjetaSalidaConfeccion && vistaAnuladas);
    $('labelPerdidas').textContent = esVistaEspecial ? 'Ganancia por demora y mal estado' : (tarjetaSalidaConfeccion ? 'Porcentaje de salida' : 'Boletas anuladas');
    if (tarjetaSalidaConfeccion) {
      const porcentajeSalida = totalActual ? (anuladasActual.length / totalActual * 100) : 0;
      $('kpiPerdidas').textContent = porcentajeSalida.toFixed(1) + '%';
      $('subPerdidas').textContent = 'Boletas anuladas respecto al total de confección';
      $('desglosePenalidades').hidden = true;
    } else if (esVistaEspecial) {
      $('kpiPerdidas').textContent = money(gananciaDevolucion);
      $('subPerdidas').textContent = 'Total de penalidades cobradas';
      $('desglosePenalidades').hidden = false;
      $('kpiDemora').textContent = money(penalidadDemora);
      $('kpiMalEstado').textContent = money(penalidadMalEstado);
      $('kpiPenalidadesTotal').textContent = money(gananciaDevolucion);
      $('labelPorcentaje').textContent = 'Porcentaje de ganancia';
      cardPerdidas.setAttribute('aria-disabled','true');
    } else {
      $('desglosePenalidades').hidden = true;
      $('subPerdidas').textContent = vistaAnuladas ? 'Participación de pérdidas sobre el total anulado' : 'Seleccionar para ver anulaciones';
      const anuladas = base.filter(b=>b.estado==='Anulada');
      $('kpiPerdidas').textContent = String(anuladas.length);
      $('kpiPerdidasCard').setAttribute('aria-pressed', String(vistaAnuladas));
      $('kpiTotalCard').setAttribute('aria-pressed', String(!vistaAnuladas));
      cardPerdidas.removeAttribute('aria-disabled');
    }
    $('boletaKpis').querySelectorAll('.boleta-kpi').forEach((el,i)=>{
      el.classList.toggle('cream', i===1 || i===2 || (i===3 && (esVistaEspecial || tarjetaSalidaConfeccion)));
      if(i===1 || i===2) el.classList.toggle('loss', false);
      if(i===1 || i===2) el.classList.toggle('cream-dark', vistaAnuladas && admitePerdidas);
      if(i===1 || i===2) el.classList.toggle('cream', !(vistaAnuladas && admitePerdidas));
    });
    $('tablaTitulo').textContent = buscando ? 'Resultados de la búsqueda' : ({Alquiler:'Boletas de alquiler',Venta:'Boletas de compra','Devolución':'Devoluciones de alquiler',Tickets:'Tickets de confección',Confección:'Boletas de ticket de confección'}[kind]);
    $('boletaNota').textContent = buscando ? rows.length + ' resultado' + (rows.length === 1 ? '' : 's') + ' · se busca en todos los tipos de comprobante y estados' : 'Los motivos de anulación se muestran junto a cada comprobante anulado.';
    filasVisibles = rows.sort((a,b)=>fecha(b).localeCompare(fecha(a)));
    $('boletasBody').innerHTML = rows.length ? filasVisibles.map((b,i)=>'<tr><td><strong>'+TG.esc(b.numero||b.ticket||'—')+'</strong></td>'+
      '<td><span class="boleta-tipo '+TIPO_CLASE[b._k]+'">'+TG.esc(TIPO_TXT[b._k])+'</span></td>'+
      '<td>'+TG.esc(TG.fecha(fecha(b)))+'</td><td>'+TG.esc(nombre(b.cliente))+(b.cliente?.dni?'<br><small>'+TG.esc(b.cliente.dni)+'</small>':'')+'</td>'+
      '<td>'+TG.esc(b.prenda?.diseno||(b._ticket?'Orden de confección':b.confeccion?.ticket||'—'))+'</td>'+
      '<td><span class="badge-estado '+(EST_CLASE[b.estado]||'est-vendido')+'"><i></i>'+TG.esc(b.estado||'—')+'</span></td>'+
      '<td>'+TG.esc(b.motivoAnulacion||'—')+'</td><td>'+money(b.monto)+(b._ticket?' <small>(costo de la orden; el ingreso se registra en la boleta)</small>':'')+'</td>'+
      '<td><button type="button" class="btn secondary boleta-ver" data-ver="'+i+'">Ver</button></td></tr>').join('')
      : '<tr><td colspan="9" style="text-align:center;padding:24px;color:#777">'+(buscando?'No se encontró ningún comprobante con esa búsqueda.':'No hay comprobantes que coincidan con los filtros.')+'</td></tr>';
  }
  document.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('[data-kind]').forEach(x=>x.classList.toggle('active',x===b));
    kind=b.dataset.kind; vistaAnuladas=false; pintar();
  }));
  const activarAnuladas = () => { if (!['Alquiler','Venta','Confección'].includes(kind) || kind === 'Confección') return; vistaAnuladas = !vistaAnuladas; pintar(); };
  $('kpiPerdidasCard').addEventListener('click', activarAnuladas);
  const activarGanancias = () => { if (!['Alquiler','Venta','Confección'].includes(kind)) return; vistaAnuladas = false; pintar(); };
  $('kpiTotalCard').addEventListener('click', activarGanancias);
  $('kpiPerdidasCard').addEventListener('keydown', e => { if(e.key==='Enter' || e.key===' '){e.preventDefault();activarAnuladas();} });
  $('kpiTotalCard').addEventListener('keydown', e => { if(e.key==='Enter' || e.key===' '){e.preventDefault();activarGanancias();} });
  /* Vista del comprobante como boleta o ticket real */
  const abrirComprobante = r => {
    document.getElementById('cpModal')?.remove();
    const titulo = (r._k === 'Tickets' ? 'Ticket ' : 'Boleta ') + (r.numero || r.ticket || '') + ' · ' + TIPO_TXT[r._k];
    const fondo = document.createElement('div'); fondo.className = 'modal-backdrop'; fondo.id = 'cpModal';
    fondo.innerHTML = '<div class="modal modal-comprobante" role="dialog" aria-modal="true"><div class="modal-head"><h2>' + TG.esc(titulo) + '</h2><button type="button" class="btn secondary" data-cerrar>Cerrar</button></div>' +
      TG.comprobanteHTML(r._k, r) + '<div class="cp-acciones"><button type="button" class="btn primary" data-imprimir>🖨 Imprimir</button></div></div>';
    const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', alTeclear); };
    const alTeclear = e => { if (e.key === 'Escape') cerrar(); };
    fondo.addEventListener('click', e => { if (e.target === fondo || e.target.closest('[data-cerrar]')) cerrar(); if (e.target.closest('[data-imprimir]')) window.print(); });
    document.addEventListener('keydown', alTeclear);
    document.body.appendChild(fondo);
  };
  $('boletasBody').addEventListener('click', e => { const btn = e.target.closest('[data-ver]'); if (btn) { const r = filasVisibles[Number(btn.dataset.ver)]; if (r) abrirComprobante(r); } });
  TG.vincular($('buscarBoleta'), reglaBusqueda, { requerido: false });
  ['buscarBoleta','fechaDesde','fechaHasta','estadoBoleta'].forEach(id=>$(id).addEventListener('input',pintar));
  try{[boletas,confecciones,penalidades]=await Promise.all([TG.boletas(),TG.get('/api/confecciones'),TG.penalidades()]);asignarPenalidades();pintar()}
  catch(e){$('boletasBody').innerHTML='<tr><td colspan="9">No se pudieron cargar los comprobantes: '+TG.esc(e.message)+'</td></tr>';}
}));
