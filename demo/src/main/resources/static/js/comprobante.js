/* Dibuja un comprobante con el mismo aspecto que ve el empleado:
   - Boletas (alquiler, compra, confección, devolución) → formato boleta de venta
   - Tickets de confección → formato ticket térmico
   Uso: TG.comprobanteHTML(tipo, datos)  con tipo = 'Alquiler' | 'Venta' | 'Confección' | 'Devolución' | 'Tickets' */
(() => {
  const E = TG.esc, M = TG.money, F = TG.fecha;
  const dash = v => (v === undefined || v === null || v === '') ? '—' : E(v);

  const cabecera = (tipoTxt, numero) =>
    '<div class="cp-cab"><div class="cp-marca"><div class="cp-logo">TG</div><div><h2>TERNO GABRIEL</h2>' +
    '<p>Alquiler, venta y confección de ternos<br>Trujillo, La Libertad · Perú</p></div></div>' +
    '<div class="cp-ruc"><div class="ruc">R.U.C. 20601234567</div><div class="tipo">' + E(tipoTxt) + '</div><div class="num">' + E(numero) + '</div></div></div>';

  const datos = pares => '<div class="cp-datos">' + pares.map(([k, v]) => '<div><span>' + E(k) + '</span><strong>' + dash(v) + '</strong></div>').join('') + '</div>';

  const pieBoleta = (letras, aviso, totales) =>
    '<div class="cp-pie"><div><p class="cp-son">' + E(letras) + '</p>' + (aviso || '') + '</div><div class="cp-totales">' + totales + '</div></div>';

  const cierre = leyenda =>
    '<div class="cp-firmas"><div>Firma del cliente</div><div>Terno Gabriel · Atención</div></div>' +
    '<p class="cp-legal">' + leyenda + '<br>¡Gracias por su preferencia!</p>';

  const aviso = (estado, motivo) => {
    if (estado === 'Anulada') return '<div class="cp-aviso"><strong>Comprobante anulado</strong>Motivo: ' + dash(motivo) + '</div>';
    if (estado === 'Devuelta') return '<div class="cp-aviso"><strong>Prenda devuelta</strong>El alquiler ya fue devuelto por el cliente.</div>';
    return '';
  };
  const sello = estado => estado === 'Anulada' ? '<div class="cp-sello">Anulada</div>' : '';

  /* Boleta de alquiler o de compra */
  const boletaPrenda = (b, esAlquiler) => {
    const monto = Number(b.monto) || 0, p = b.prenda || {};
    return '<article class="cp cp-boleta">' + sello(b.estado) +
      cabecera(esAlquiler ? 'BOLETA DE ALQUILER' : 'BOLETA DE COMPRA', 'N.° ' + (b.numero || '—')) +
      datos([['Cliente', b.cliente ? TG.nombre(b.cliente) : ''], ['DNI', b.cliente && b.cliente.dni], ['Fecha de emisión', F(b.fecha)], ['Atendido por', b.empleado], ['Forma de pago', b.metodoPago], ['Estado', b.estado]]) +
      '<table class="cp-tabla"><thead><tr><th class="cant">Cant.</th><th>Código</th><th>Descripción</th><th class="num">P. unit.</th><th class="num">Importe</th></tr></thead><tbody><tr>' +
      '<td class="cant">1</td><td>' + dash(p.codigo) + '</td><td>' + (esAlquiler ? 'Alquiler' : 'Compra') + ' de ' + E(TG.descripcionPrenda(p) || '—') +
      (esAlquiler ? '<small>Devolución pactada: ' + F(b.fechaDevolucion) + '</small>' : '') + '</td>' +
      '<td class="num">' + M(monto) + '</td><td class="num">' + M(monto) + '</td></tr></tbody></table>' +
      pieBoleta(TG.montoLetras(monto), aviso(b.estado, b.motivoAnulacion),
        '<div class="total"><span>IMPORTE TOTAL</span><strong>' + M(monto) + '</strong></div><div><span>Forma de pago</span><strong>' + dash(b.metodoPago) + '</strong></div>') +
      cierre('Representación impresa de la boleta de venta. Conserve este comprobante para la devolución o cualquier reclamo.') + '</article>';
  };

  /* Boleta de confección (entrega de la prenda y cobro del saldo) */
  const boletaConfeccion = b => {
    const c = b.confeccion || {}, costo = Number(b.monto) || Number(c.costoTotal) || 0, adelanto = Number(c.adelanto) || 0, saldo = Math.max(0, costo - adelanto);
    let d = {}; try { d = JSON.parse(c.detalle || '{}'); } catch (e) { d = {}; }
    const det = [d.diseno && 'Modelo: ' + d.diseno, d.tela && 'Tela: ' + d.tela].filter(Boolean).join(' · ');
    return '<article class="cp cp-boleta">' + sello(b.estado) +
      cabecera('BOLETA DE CONFECCIÓN', 'N.° ' + (b.numero || '—')) +
      datos([['Cliente', b.cliente ? TG.nombre(b.cliente) : ''], ['DNI', b.cliente && b.cliente.dni], ['Fecha de emisión', F(b.fecha)], ['Atendido por', b.empleado], ['Forma de pago', b.metodoPago], ['Ticket de origen', c.ticket]]) +
      '<table class="cp-tabla"><thead><tr><th class="cant">Cant.</th><th>Código</th><th>Descripción</th><th class="num">P. unit.</th><th class="num">Importe</th></tr></thead><tbody>' +
      '<tr><td class="cant">1</td><td>' + dash(c.ticket) + '</td><td>Confección de terno a medida' + (det ? '<small>' + E(det) + '</small>' : '') + '</td><td class="num">' + M(costo) + '</td><td class="num">' + M(costo) + '</td></tr>' +
      '<tr class="resta"><td class="cant"></td><td></td><td>Adelanto cancelado con el ticket</td><td class="num"></td><td class="num">- ' + M(adelanto) + '</td></tr></tbody></table>' +
      pieBoleta(TG.montoLetras(saldo), aviso(b.estado, b.motivoAnulacion),
        '<div><span>Costo de la confección</span><strong>' + M(costo) + '</strong></div><div><span>Adelanto previo</span><strong>- ' + M(adelanto) + '</strong></div>' +
        '<div class="total"><span>SALDO PAGADO</span><strong>' + M(saldo) + '</strong></div>') +
      cierre('Representación impresa de la boleta de venta. Conserve este comprobante.') + '</article>';
  };

  /* Boleta de devolución: retraso y estado de la prenda (penalidad registrada, si hubo) */
  const boletaDevolucion = b => {
    const pen = b._pen, demora = pen ? Number(pen.montoDemora) || (pen.tipo === 'Demora' ? Number(pen.monto) || 0 : 0) : 0;
    const malEstado = pen ? Number(pen.montoMalEstado) || (pen.tipo === 'Mal estado' ? Number(pen.monto) || 0 : 0) : 0, total = demora + malEstado;
    const original = 'B' + String(b.numero || '').slice(1);
    return '<article class="cp cp-boleta">' +
      cabecera('BOLETA DE DEVOLUCIÓN', 'N.° ' + (b.numero || '—')) +
      datos([['Cliente', b.cliente ? TG.nombre(b.cliente) : ''], ['DNI', b.cliente && b.cliente.dni], ['Fecha de devolución', pen ? F(pen.fecha) : '—'], ['Atendido por', b.empleado], ['Prenda alquilada', TG.descripcionPrenda(b.prenda)], ['Devolución pactada', F(b.fechaDevolucion)], ['Boleta de alquiler', original], ['Código de prenda', b.prenda && b.prenda.codigo]]) +
      '<table class="cp-tabla"><thead><tr><th>Concepto</th><th class="num">Detalle</th></tr></thead><tbody>' +
      '<tr><td>Penalidad por retraso</td><td class="num">' + M(demora) + '</td></tr>' +
      '<tr><td>Penalidad por mal estado de la prenda</td><td class="num">' + M(malEstado) + '</td></tr></tbody></table>' +
      pieBoleta(TG.montoLetras(total), pen ? '' : '<div class="cp-aviso"><strong>Sin penalidades</strong>No se registraron cobros por demora ni por mal estado.</div>',
        '<div class="total"><span>TOTAL COBRADO</span><strong>' + M(total) + '</strong></div>') +
      cierre('Representación impresa de la boleta de devolución. Conserve este comprobante.') + '</article>';
  };

  /* Ticket de confección (papel térmico) */
  const ticket = c => {
    let d = {}; try { d = JSON.parse(c.detalle || '{}'); } catch (e) { d = {}; }
    const costo = Number(c.costoTotal) || 0, adelanto = Number(c.adelanto) || 0, saldo = Math.max(0, costo - adelanto), m = d.medidas || {};
    const fila = (k, v) => '<div class="t-fila"><span>' + E(k) + '</span><strong>' + dash(v) + '</strong></div>';
    const medidas = [['Cuello', 'cuello'], ['Talle', 'talle'], ['Pecho', 'pecho'], ['Cintura', 'cintura'], ['Cadera', 'cadera'], ['Manga', 'manga'], ['L. pantalón', 'largo'], ['Bota', 'bota'], ['Espalda', 'espalda']]
      .map(([k, key]) => '<div><span>' + k + '</span><strong>' + dash(m[key] !== undefined ? m[key] : 0) + '</strong></div>').join('');
    return '<article class="cp cp-ticket"><div class="t-centro"><div class="t-logo">TG</div><h2>Terno Gabriel</h2><p class="t-sub">Confección a medida · Trujillo</p></div>' +
      '<div class="t-tipo">TICKET DE CONFECCIÓN</div><div class="t-codigo">' + dash(c.ticket) + '</div><p class="t-aviso">NO ES COMPROBANTE DE PAGO</p><hr>' +
      fila('Fecha', F(c.fecha)) + fila('Cliente', c.cliente ? TG.nombre(c.cliente) : '') + fila('DNI', c.cliente && c.cliente.dni) + fila('Atendió', c.empleado) +
      fila('Primera prueba', F(c.primeraPrueba)) + fila('Entrega final', F(c.entregaFinal)) + fila('Pago', c.metodoPago) + fila('Estado', c.estado) +
      (c.boleta ? fila('Boleta', c.boleta) : '') + '<hr><p class="t-tit">Diseño y acabados</p>' +
      fila('Modelo', d.diseno) + fila('Tela', d.tela) + fila('Solapa', d.solapa) + fila('Saco', d.saco) + fila('Pantalón', d.pantalon) + fila('Chaleco', d.chaleco) + fila('Camisa', d.camisa) + fila('Corbata', d.corbata) +
      '<hr><p class="t-tit">Medidas (cm)</p><div class="t-medidas">' + medidas + '</div><hr><p class="t-tit">Caja y pagos</p>' +
      fila('Costo total', M(costo)) + fila('Adelanto', M(adelanto)) + '<div class="t-fila t-total"><span>SALDO</span><strong>' + M(saldo) + '</strong></div>' +
      '<div class="t-barras"></div><p class="t-pie">Presente este ticket para recoger su pedido.<br>La boleta se emite al cancelar el saldo.<br>¡Gracias por su preferencia!</p></article>';
  };

  TG.comprobanteHTML = (tipo, o) => {
    if (tipo === 'Tickets') return ticket(o);
    if (tipo === 'Devolución') return boletaDevolucion(o);
    if (tipo === 'Confección') return boletaConfeccion(o);
    return boletaPrenda(o, tipo === 'Alquiler');
  };
})();
