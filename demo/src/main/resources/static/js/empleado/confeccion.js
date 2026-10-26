// Confección: al registrar una orden se emite un TICKET (T001-0001) y se cobra el adelanto.
// Al entregarla (buscando el ticket o el DNI) se muestra la BOLETA de ese ticket: se cobra el saldo y se emite (B001-0001), y se exige calificar al cliente.
// Si el ticket ya fue pagado completo no se pide forma de pago: se usa la del ticket y la boleta se genera sola.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
  const $ = id => document.getElementById(id);
  const u = TG.usuario(), hoy = TG.hoyISO();
  const sumarDias = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

  // ---------- Buscador de órdenes (DNI o ticket T000-0000) ----------
  const inputBusquedaOrden = $("inputBusquedaOrden");
  inputBusquedaOrden?.addEventListener("input", e => {
    const val = e.target.value.trim(); if (val === "") return;
    const p = val.charAt(0).toUpperCase();
    if (p === "T") {
      const nums = val.slice(1).replace(/[^0-9]/g, "").slice(0, 7);
      e.target.value = "T" + (nums.length > 3 ? nums.slice(0, 3) + "-" + nums.slice(3) : nums);
    } else if (!isNaN(p)) e.target.value = val.replace(/[^0-9]/g, "").slice(0, 8);
    else e.target.value = "";
  });

  // ---------- Referencias ----------
  const inpDni = $("inputDni"), inpNombres = $("inputNombres"), inpApellidos = $("inputApellidos"), inpDireccion = $("inputDireccion"), inpTelefono = $("inputTelefono"), inpCorreo = $("inputCorreo");
  const inpPrueba = $("inputPrimeraPrueba"), inpEntrega = $("inputEntregaFinal");
  const inputCostoTotal = $("pagoCostoTotal"), labelCostoTotal = $("labelCostoTotal"), campoAdelantoContainer = $("campoAdelantoContainer"), inputAdelantoFijo = $("pagoAdelantoFijo");
  const inputEntregado = $("pagoEntregado"), inputTercerCampo = $("inputTercerCampo"), labelTercerCampo = $("labelTercerCampo"), pagoGridContainer = $("pagoGridContainer");
  const ticketCodigo = $("ticketCodigo"), ticketCliente = $("ticketCliente"), ticketDni = $("ticketDni"), ticketEntrega = $("ticketEntrega"), ticketMetodoPago = $("ticketMetodoPago");
  const ticketTotal = $("ticketTotal"), ticketAdelantoPrevio = $("ticketAdelantoPrevio"), ticketSaldoPendiente = $("ticketSaldoPendiente"), ticketMontoPagado = $("ticketMontoPagado");
  const ticketVuelto = $("ticketVuelto"), ticketContenedorVuelto = $("ticketContenedorVuelto");
  const seccionDatosCliente = $("seccionDatosCliente"), seccionMedidas = $("seccionMedidasPersonalizacion"), seccionPlazos = $("seccionPlazos");
  const lista = $("listaOrdenesProximas"), btnConfirmar = $("btnConfirmarPago");
  const datos = [inpNombres, inpApellidos, inpDireccion, inpTelefono, inpCorreo];

  const SELECTS = { diseno: "pDiseno", tela: "pTela", saco: "pColorSaco", pantalon: "pColorPantalon", chaleco: "pColorChaleco", solapa: "pSolapa", camisa: "pColorCamisa", corbata: "pColorCorbata" };
  const SALIDAS = { diseno: "tDiseno", tela: "tTela", saco: "tSaco", pantalon: "tPantalon", chaleco: "tChaleco", solapa: "tSolapa", camisa: "tCamisa", corbata: "tCorbata" };
  const MEDIDAS = { cuello: ["mCuello", "mOutCuello"], talle: ["mTalle", "mOutTalle"], pecho: ["mPecho", "mOutPecho"], cintura: ["mCintura", "mOutCintura"], cadera: ["mCadera", "mOutCadera"], manga: ["mManga", "mOutManga"], largo: ["mLargo", "mOutLargo"], bota: ["mBota", "mOutBota"], espalda: ["mEspalda", "mOutEspalda"] };

  let orden = null, clienteExistente = null, terminado = false, emitiendo = false, ordenes = [];
  const redondear = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const metodoActual = () => document.querySelector(".metodo-btn.active")?.dataset.metodo || "Efectivo";
  const saldoFijo = () => Math.max(0, redondear(orden ? orden.costoTotal - orden.adelanto : parseFloat(inputCostoTotal.value) || 0));
  /* Ticket pagado por completo al generarlo: no queda saldo, así que no se pide forma de pago */
  const ordenPagada = () => !!orden && saldoFijo() <= 0;

  // ---------- Validaciones ----------
  TG.vincular(inpDni, "dni"); TG.vincular(inpNombres, "nombre"); TG.vincular(inpApellidos, "nombre"); TG.vincular(inpDireccion, "direccion");
  TG.vincular(inpTelefono, "celular"); TG.vincular(inpCorreo, "correo");
  inpTelefono.removeAttribute("type"); inpTelefono.setAttribute("inputmode", "numeric"); inpDni.setAttribute("inputmode", "numeric");
  TG.vincular(inpPrueba, "fechaHoy");
  TG.vincular(inpEntrega, { ok: v => v >= hoy && v >= (inpPrueba.value || hoy), msg: "Fecha inválida: no puede ser anterior a hoy ni a la primera prueba" });
  TG.vincular(inputCostoTotal, "monto");
  const reglaAdelanto = { ok: v => Number(v) > 0, msg: "Monto inválido: debe ser mayor a 0" };
  const reglaSaldo = {
    ok: v => redondear(v) >= saldoFijo(),
    get msg() { return "Monto insuficiente: faltan " + TG.money(Math.max(0, saldoFijo() - redondear(inputEntregado.value))) + " para cubrir el saldo de " + TG.money(saldoFijo()); }
  };
  TG.vincular(inputEntregado, reglaAdelanto);
  inpPrueba.value = sumarDias(3); inpEntrega.value = sumarDias(7); inpPrueba.min = hoy; inpEntrega.min = hoy;
  inpPrueba.addEventListener("change", () => { inpEntrega.min = inpPrueba.value > hoy ? inpPrueba.value : hoy; if (inpEntrega.value) { inpEntrega._tocado = true; TG.validarCampo(inpEntrega); } ticketEntrega.textContent = TG.fecha(inpEntrega.value); });
  ticketEntrega.textContent = TG.fecha(inpEntrega.value);
  $("ticketFecha").textContent = TG.fechaHora(); $("ticketEmpleado").textContent = u ? u.nombre : "";

  // ---------- Datos del cliente: búsqueda automática al completar el DNI ----------
  const bloquear = b => datos.forEach(el => { el.readOnly = b; el.style.background = b ? "#f2f4f7" : ""; });
  const vaciar = () => datos.forEach(el => { el.value = ""; el._tocado = false; TG.marcar(el, null); });
  const buscarCliente = async avisar => {
    const d = inpDni.value; ticketDni.textContent = d || "---";
    if (d.length !== 8) { if (clienteExistente) { clienteExistente = null; bloquear(false); vaciar(); ticketCliente.textContent = "---"; } return; }
    const c = (await TG.clientes()).find(x => x.dni === d);
    if (c) {
      clienteExistente = c; bloquear(true);
      inpNombres.value = c.nombres; inpApellidos.value = c.apellidos; inpDireccion.value = c.direccion; inpTelefono.value = c.celular; inpCorreo.value = c.correo || "";
      datos.forEach(el => TG.marcar(el, null)); ticketCliente.textContent = TG.nombre(c);
    } else {
      if (clienteExistente) vaciar();
      clienteExistente = null; bloquear(false); ticketCliente.textContent = "---";
      if (avisar) TG.toast("Cliente nuevo: completa sus datos", "info");
    }
  };
  inpDni.addEventListener("input", () => buscarCliente(true).catch(e => TG.toast(e.message, "error")));
  [inpNombres, inpApellidos].forEach(el => el.addEventListener("input", () => { if (!clienteExistente) ticketCliente.textContent = (inpNombres.value + " " + inpApellidos.value).trim() || "---"; }));

  // ---------- Ficha y diseño reflejados en el ticket ----------
  Object.keys(SELECTS).forEach(k => { const s = $(SELECTS[k]), o = $(SALIDAS[k]); if (s && o) { o.textContent = s.value; s.addEventListener("change", () => { o.textContent = s.value; }); } });
  Object.values(MEDIDAS).forEach(([i, o]) => { const inp = $(i), out = $(o); if (inp && out) inp.addEventListener("input", () => { out.textContent = inp.value || "0"; }); });
  const armarDetalle = () => {
    const d = {}; Object.keys(SELECTS).forEach(k => { d[k] = $(SELECTS[k]).value; });
    d.medidas = {}; Object.keys(MEDIDAS).forEach(k => { d.medidas[k] = $(MEDIDAS[k][0]).value || "0"; });
    return JSON.stringify(d);
  };
  const mostrarDetalle = texto => {
    let d; try { d = JSON.parse(texto || "{}"); } catch { return; }
    Object.keys(SALIDAS).forEach(k => { if (d[k]) $(SALIDAS[k]).textContent = d[k]; });
    Object.keys(MEDIDAS).forEach(k => { if (d.medidas && d.medidas[k] !== undefined) $(MEDIDAS[k][1]).textContent = d.medidas[k]; });
  };

  // ---------- Finanzas ----------
  function ajustarGrid() {
    const transf = metodoActual() === "Transferencia";
    pagoGridContainer.classList.toggle("transferencia-layout", transf);
    pagoGridContainer.style.gridTemplateColumns = transf ? "1fr 1fr" : (orden ? "repeat(3, 1fr)" : "1fr 1fr");
    campoAdelantoContainer.style.display = orden ? "block" : "none";
  }
  function calcular() {
    const costo = parseFloat(inputCostoTotal.value) || 0, pagado = parseFloat(inputEntregado.value) || 0, saldo = saldoFijo();
    if (metodoActual() === "Efectivo") {
      const vuelto = Math.max(0, redondear(pagado - (orden ? saldo : costo)));
      labelTercerCampo.textContent = "Vuelto automático (Calculado)"; inputTercerCampo.value = TG.money(vuelto); inputTercerCampo.style.color = "#28a745";
      ticketContenedorVuelto.style.display = ""; ticketVuelto.textContent = TG.money(vuelto);
    } else {
      labelTercerCampo.textContent = "Saldo pendiente restante"; inputTercerCampo.value = TG.money(Math.max(0, redondear((orden ? saldo : costo) - pagado))); inputTercerCampo.style.color = "#d9534f";
      ticketContenedorVuelto.style.display = "none";
    }
    ticketTotal.textContent = TG.money(costo); ticketAdelantoPrevio.textContent = TG.money(orden ? orden.adelanto : 0);
    ticketSaldoPendiente.textContent = TG.money(saldo); ticketMontoPagado.textContent = TG.money(pagado);
    if (orden && !terminado) pintarBoleta();
  }
  inputCostoTotal.addEventListener("input", calcular); inputEntregado.addEventListener("input", calcular);
  inputsSeleccion();
  function inputsSeleccion() { document.querySelectorAll('input[type="number"]').forEach(i => i.addEventListener("focus", function () { this.select(); })); }

  const metodos = document.querySelectorAll(".metodo-btn"), yape = $("yapeAdminContainer");
  metodos.forEach(b => b.addEventListener("click", () => {
    metodos.forEach(x => x.classList.remove("active")); b.classList.add("active");
    ticketMetodoPago.textContent = b.dataset.metodo; ajustarGrid();
    yape.style.display = b.dataset.metodo === "Yape" ? "block" : "none";
    if (b.dataset.metodo === "Yape") { $("yapeAdminTitulo").innerText = "Terno Gabriel - Cuenta Oficial"; $("yapeAdminNumero").innerText = "987 654 321"; }
    calcular();
  }));

  // ---------- Órdenes pendientes de entrega (vienen de la base de datos) ----------
  const textoVence = f => {
    const d = TG.diasEntre(hoy, f);
    return d < 0 ? "🔴 Vencida (" + TG.fecha(f) + ")" : d === 0 ? "⚠️ Vence hoy (" + TG.fecha(f) + ")" : "⏳ Vence en " + d + " día" + (d === 1 ? "" : "s") + " (" + TG.fecha(f) + ")";
  };
  const pintarOrdenes = async () => {
    ordenes = (await TG.get("/api/confecciones")).filter(o => o.estado === "En confección").sort((a, b) => a.entregaFinal.localeCompare(b.entregaFinal));
    lista.innerHTML = ordenes.length ? ordenes.map(o => {
      const hoyFecha = hoy;
      const prueba = o.primeraPrueba;
      const fechaClave = prueba && prueba >= hoyFecha && (!o.entregaFinal || prueba <= o.entregaFinal) ? prueba : o.entregaFinal;
      const tipoPlazo = fechaClave === prueba ? 'Prueba' : 'Entrega';
      return '<div class="orden-item-btn" data-id="' + o.id + '">' +
        '<div class="orden-identidad"><div class="avatar">' + TG.esc(TG.iniciales(TG.nombre(o.cliente))) + '</div><div class="orden-nombre">' +
        '<span class="dato-label">Cliente</span><strong>' + TG.esc(TG.nombre(o.cliente)) + '</strong></div></div>' +
        '<div class="orden-dato"><span class="dato-label">Ticket</span><strong>' + TG.esc(o.ticket) + '</strong></div>' +
        '<div class="orden-dato"><span class="dato-label">DNI</span><strong>' + TG.esc(o.cliente.dni) + '</strong></div>' +
        '<div class="orden-dato"><span class="dato-label">Teléfono</span><strong>' + TG.esc(o.cliente.celular || '—') + '</strong></div>' +
        '<div class="orden-dato orden-direccion"><span class="dato-label">Dirección</span><strong>' + TG.esc(o.cliente.direccion || '—') + '</strong></div>' +
        '<span class="orden-vence">' + tipoPlazo + ': ' + textoVence(fechaClave) + '</span></div>';
    }).join("") : '<p style="padding:16px;color:#667085;">No hay órdenes de confección pendientes de entrega.</p>';
  };

  /* BOLETA de confección. Al elegir el ticket se muestra como vista previa (sin número, se actualiza con la forma
     de pago y el monto) y al cobrar el saldo queda como la boleta definitiva. */
  function pintarBoleta(emitida) {
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    const pagada = ordenPagada(), metodo = pagada ? (orden.metodoPago || "Efectivo") : metodoActual(), efectivo = !pagada && metodo === "Efectivo";
    const costo = orden.costoTotal, adelanto = orden.adelanto || 0, saldo = saldoFijo(), pagadoHoy = parseFloat(inputEntregado.value) || 0;
    set("cbNumero", emitida ? "N.° " + emitida.numero : "N.° por emitir"); set("cbCliente", TG.nombre(orden.cliente)); set("cbDni", orden.cliente.dni);
    set("cbFecha", TG.fechaHora()); set("cbEmpleado", u ? u.nombre : ""); set("cbPago", metodo); set("cbTicket", orden.ticket);
    set("cbCodigo", orden.ticket); set("cbDetalle", "Modelo: " + $("tDiseno").textContent + " · Tela: " + $("tTela").textContent);
    document.querySelectorAll(".cbCosto").forEach(el => { el.textContent = TG.money(costo); });
    set("cbAdelanto", "- " + TG.money(adelanto)); set("cbAdelanto2", "- " + TG.money(adelanto));
    set("cbSaldo", TG.money(saldo)); set("cbLetras", TG.montoLetras(pagada ? costo : saldo)); /* ticket pagado: el total de la confección, no "cero" */
    set("cbEtqRecibido", pagada ? "Pagado con el ticket" : efectivo ? "Efectivo recibido" : "Monto pagado");
    set("cbRecibido", TG.money(pagada ? adelanto : pagadoHoy));
    set("cbVuelto", TG.money(Math.max(0, redondear(pagadoHoy - saldo)))); $("cbFilaVuelto").style.display = efectivo ? "" : "none";
    $("cbBorrador").hidden = !!emitida;
    /* Imprimir / descargar solo cuando la boleta ya fue emitida */
    document.querySelectorAll("[data-print-receipt]").forEach(btn => { btn.disabled = !emitida; });
    $("cpTicketConf").hidden = true; $("cpBoletaConf").hidden = false;
  }
  document.querySelectorAll("[data-print-receipt]").forEach(btn => btn.addEventListener("click", () => window.print()));
  /* Ticket pagado por completo: se oculta forma de pago y montos, se usa la forma de pago del ticket y la boleta sale sola */
  function modoTicketPagado() {
    document.querySelector(".metodos-pago").style.display = "none"; pagoGridContainer.style.display = "none"; yape.style.display = "none";
    $("avisoPagadoMetodo").textContent = orden.metodoPago || "Efectivo"; $("avisoPagadoTotal").hidden = false;
    btnConfirmar.textContent = "Generar boleta >";
    emitirBoleta();
  }
  function seleccionarOrden(o, tarjeta) {
    if (orden) return; /* ya hay una orden elegida: evita emitir dos veces la boleta */
    orden = o; terminado = false; clienteExistente = o.cliente;
    ticketCliente.textContent = TG.nombre(o.cliente); ticketDni.textContent = o.cliente.dni; ticketCodigo.textContent = o.ticket;
    $("ticketTitulo").textContent = "TICKET DE CONFECCIÓN";
    ticketEntrega.textContent = TG.fecha(o.entregaFinal); mostrarDetalle(o.detalle);
    inputCostoTotal.value = o.costoTotal.toFixed(2); inputCostoTotal.readOnly = true; inputCostoTotal.style.backgroundColor = "#f5f5f5"; TG.marcar(inputCostoTotal, null);
    labelCostoTotal.textContent = "Costo total (Fijo por Ticket)"; inputAdelantoFijo.value = TG.money(o.adelanto);
    inputEntregado.value = "0.00"; inputEntregado._tg.regla = reglaSaldo; inputEntregado._tocado = false; TG.marcar(inputEntregado, null);
    ajustarGrid(); calcular(); /* calcular() dibuja la boleta de este ticket */
    seccionDatosCliente.style.display = "none"; seccionMedidas.style.display = "none"; seccionPlazos.style.display = "none";
    lista.querySelectorAll(".orden-item-btn").forEach(b => { b.style.display = "none"; });
    const accionesOrden = $("accionesOrdenSeleccionada");
    if (accionesOrden) {
      accionesOrden.hidden = false;
      accionesOrden.innerHTML = "";
      const volver = document.createElement("button");
      volver.className = "btn-volver";
      volver.type = "button";
      volver.innerHTML = "← Volver a confección";
      volver.addEventListener("click", () => location.reload());
      accionesOrden.appendChild(volver);
    }
    if (tarjeta) {
      tarjeta.style.display = "grid";
      tarjeta.classList.add("orden-seleccionada");
      tarjeta.style.border = "1px solid #e4d7bb";
      tarjeta.style.background = "#fbf7ee";
    }
    if (ordenPagada()) modoTicketPagado();
  }
  lista.addEventListener("click", e => { const t = e.target.closest(".orden-item-btn"); if (!t) return; const o = ordenes.find(x => x.id === Number(t.dataset.id)); if (o) seleccionarOrden(o, t); });
  $("btnEjecutarBusqueda")?.addEventListener("click", () => {
    const c = inputBusquedaOrden.value.trim().toUpperCase(); if (!c) return;
    const o = ordenes.find(x => x.ticket.toUpperCase() === c || (/^T\d{3}-\d{1,4}$/.test(c) && x.ticket === "T" + c.slice(1, 4) + "-" + c.slice(5).padStart(4, "0")) || x.cliente.dni === c);
    if (orden) return;
    if (!o) { TG.toast("No se encontró ninguna orden con ese DNI o Ticket.", "error"); return; }
    seleccionarOrden(o, lista.querySelector('.orden-item-btn[data-id="' + o.id + '"]'));
  });

  // ---------- Emitir la boleta de una orden ----------
  async function emitirBoleta() {
    if (emitiendo || terminado) return;
    emitiendo = true; btnConfirmar.disabled = true;
    const pagada = ordenPagada(), metodo = pagada ? (orden.metodoPago || "Efectivo") : metodoActual();
    let emitida;
    try {
      emitida = await TG.post("/api/boletas/nuevo", { tipo: "Confección", cliente: { id: orden.cliente.id }, confeccion: { id: orden.id }, monto: orden.costoTotal, empleado: u ? u.nombre : "", metodoPago: metodo });
    } catch (err) {
      emitiendo = false; btnConfirmar.disabled = false; TG.toast(err.message, "error"); if (!pagada) TG.marcar(inputEntregado, err.message); return;
    }
    terminado = true; emitiendo = false; pintarBoleta(emitida);
    btnConfirmar.disabled = false; btnConfirmar.textContent = "＋ Nueva confección";
    TG.toast("Boleta " + emitida.numero + " emitida");
    await TG.calificarObligatorio(emitida.cliente);
  }

  // ---------- Confirmar pago ----------
  btnConfirmar?.addEventListener("click", async () => {
    if (terminado) { location.reload(); return; }
    if (orden) {
      /* Entrega: se cobra el saldo (si lo hay) y se emite la BOLETA */
      if (!ordenPagada() && !TG.validarTodo([inputEntregado])) return;
      await emitirBoleta(); return;
    }
    const metodo = metodoActual(), pagado = parseFloat(inputEntregado.value) || 0, costo = parseFloat(inputCostoTotal.value) || 0;
    const medidasObligatorias = Object.values(MEDIDAS).map(([id]) => $(id));
    const campos = [inpDni, ...datos, inpPrueba, inpEntrega, ...medidasObligatorias, inputCostoTotal, inputEntregado];
    if (medidasObligatorias.some(el => !el || !el.value.trim() || Number(el.value) <= 0)) {
      TG.toast("Completa todas las medidas con valores mayores a cero antes de continuar.", "error");
      medidasObligatorias.filter(el => !el || !el.value.trim() || Number(el.value) <= 0).forEach(el => el && TG.marcar(el, "Medida obligatoria"));
      return;
    }
    if (!inpPrueba.value || !inpEntrega.value) { TG.toast("La primera prueba y el plazo de entrega son obligatorios.", "error"); return; }
    if (!TG.validarTodo(campos)) return;
    btnConfirmar.disabled = true;
    try {
      /* Orden nueva: el cliente se registra ahora (si no existía) y se emite el TICKET */
      let c = clienteExistente;
      if (!c) c = await TG.post("/api/clientes/nuevo", { dni: inpDni.value, nombres: inpNombres.value.trim(), apellidos: inpApellidos.value.trim(), celular: inpTelefono.value, direccion: inpDireccion.value.trim(), correo: inpCorreo.value.trim() });
      const detalleConfeccion = armarDetalle();
      const coloresSeleccionados = ["pColorSaco", "pColorPantalon", "pColorChaleco", "pColorCamisa", "pColorCorbata"]
        .map(id => $(id)?.value?.trim()).filter(v => v && !/^seleccione/i.test(v));
      const r = await TG.post("/api/confecciones/nuevo", { cliente: { id: c.id }, costoTotal: costo, adelanto: Math.min(pagado, costo), primeraPrueba: inpPrueba.value, entregaFinal: inpEntrega.value, metodoPago: metodo, empleado: u ? u.nombre : "", color: coloresSeleccionados.join(" / ") || "No especificado", detalle: detalleConfeccion });
      ticketCodigo.textContent = r.ticket; $("ticketTitulo").textContent = "TICKET DE CONFECCIÓN";
      ticketCliente.textContent = TG.nombre(c); ticketDni.textContent = c.dni;
      ticketAdelantoPrevio.textContent = TG.money(0); ticketSaldoPendiente.textContent = TG.money(Math.max(0, redondear(costo - pagado)));
      terminado = true; btnConfirmar.disabled = false; btnConfirmar.textContent = "＋ Nueva confección";
      TG.toast("Ticket " + r.ticket + " registrado");
    } catch (err) { btnConfirmar.disabled = false; TG.toast(err.message, "error"); TG.marcar(inpDni, err.message); }
  });

  ajustarGrid(); calcular();
  try { await pintarOrdenes(); } catch (e) { TG.toast(e.message, "error"); }
}));
