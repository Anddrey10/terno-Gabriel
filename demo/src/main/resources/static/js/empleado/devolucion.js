// Devolución: busca el alquiler real en la base de datos, cobra las penalizaciones que definió el admin,
// libera la prenda y deja calificar al cliente.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
  const $ = id => document.getElementById(id);
  const inputBusqueda = $("inputBusqueda"), detalle = $("detalleResultado"), noEncontrado = $("mensajeNoEncontrado");
  let config = { demora: 10, malEstado: 50 }, boleta = null, estadoActual = "bueno", dias = 0, terminado = false;
  try { const c = await TG.configuracion(); config = { demora: c.penalidadDemora.valor, malEstado: c.penalidadMalEstado.valor }; } catch (e) { TG.toast(e.message); }
  $("lblPrecioDia").textContent = TG.money(config.demora);
  $("lblPrecioDaño").textContent = TG.money(config.malEstado);
  const u = TG.usuario(); if (u && $("bEmpleado")) $("bEmpleado").textContent = u.nombre;
  if ($("bFecha")) $("bFecha").textContent = TG.fechaHora();

  inputBusqueda?.addEventListener("input", e => {
    const v = e.target.value; if (!v) return;
    if (/^[a-zA-Z]/.test(v)) {
      const prefix = v.toUpperCase().startsWith("D") ? "D" : "B";
      const n = v.slice(1).replace(/\D/g, "").slice(0, 7);
      e.target.value = prefix + (n.length > 3 ? n.slice(0, 3) + "-" + n.slice(3) : n); e.target.setAttribute("maxlength", "9");
    } else { e.target.value = v.replace(/\D/g, "").slice(0, 8); e.target.setAttribute("maxlength", "8"); }
  });

  const totales = () => {
    const sub = dias * config.demora, dano = estadoActual === "observaciones" ? config.malEstado : 0, total = sub + dano;
    const metodo = document.querySelector(".metodo-btn.active")?.dataset.metodo || "Efectivo";
    $("lblCantDias").textContent = dias; $("txtSubtotalRetraso").textContent = TG.money(sub);
    $("txtConceptoDaño").textContent = estadoActual === "observaciones" ? "Estado de prenda: Con observaciones (dañado)" : "Estado de prenda: Buen estado";
    $("lblCantDaño").textContent = estadoActual === "observaciones" ? 1 : 0; $("txtCargoDaño").textContent = TG.money(dano);
    $("lblTipoPagoFila").textContent = metodo; $("txtTotalPenalizacion").textContent = TG.money(total);
    $("pagoTotalCobrar").value = TG.money(total);
    if (metodo === "Efectivo") $("inputTercerCampo").value = TG.money(Math.max(0, (parseFloat($("pagoEntregado").value) || 0) - total));
    $("bResumenRetraso").textContent = dias + " días (" + TG.money(sub) + ")";
    $("bResumenEstado").textContent = (estadoActual === "observaciones" ? "Con observaciones (Daño)" : "Buen estado") + " (" + TG.money(dano) + ")";
    $("bResumenPago").textContent = metodo; $("bTotalCobrado").textContent = TG.money(total);
    return { sub, dano, total, metodo };
  };

  const buscar = async () => {
    const val = inputBusqueda.value.trim(); terminado = false; boleta = null;
    try {
      const boletas = (await TG.boletas()).filter(b => b.tipo === "Alquiler" && b.estado === "Vigente");
      if (/^\d{8}$/.test(val)) boleta = boletas.filter(b => b.cliente.dni === val).sort((a, b) => b.id - a.id)[0];
      else if (/^[BD]\d{3}-\d{1,4}$/i.test(val)) {
        /* B001-5 → B001-0005; la D es solo la forma en que el panel admin muestra las devoluciones */
        const numero = "B" + val.slice(1, 4) + "-" + val.split("-")[1].padStart(4, "0");
        boleta = boletas.find(b => String(b.numero || "").toUpperCase() === numero);
      }
    } catch (e) { TG.toast(e.message); return; }
    if (!boleta) { detalle.style.display = "none"; noEncontrado.style.display = "block"; boleta = null; return; }
    detalle.style.display = "block"; noEncontrado.style.display = "none";
    $("lblCliente").textContent = TG.nombre(boleta.cliente); $("lblPrenda").textContent = TG.descripcionPrenda(boleta.prenda);
    $("lblFechaPactada").textContent = TG.fecha(boleta.fechaDevolucion); $("lblEstadoAlquiler").textContent = "Alquiler activo";
    $("lblFechaHoraOp").textContent = TG.fecha(boleta.fecha); $("lblMetodoPagoOp").textContent = boleta.metodoPago || "—";
    $("lblMontoPagadoOp").textContent = TG.money(boleta.monto); const re = $("rowEfectivoDetalle"); if (re) re.style.display = "none";
    $("bCodigoBoleta").textContent = "Código: " + boleta.numero; $("bDni").textContent = boleta.cliente.dni; $("bPrenda").textContent = TG.descripcionPrenda(boleta.prenda);
    $("bCliente").textContent = TG.nombre(boleta.cliente); $("bFechaPactada").textContent = TG.fecha(boleta.fechaDevolucion);
    dias = boleta.fechaDevolucion ? Math.max(0, TG.diasEntre(boleta.fechaDevolucion, TG.hoyISO())) : 0;
    $("inputDiasRetraso").value = dias; totales();
  };
  document.querySelectorAll("[data-print-receipt]").forEach(btn => btn.addEventListener("click", () => window.print()));
  $("btnBuscar")?.addEventListener("click", buscar);
  inputBusqueda?.addEventListener("keydown", e => { if (e.key === "Enter") buscar(); });

  const bBueno = $("btnBuenEstado"), bMalo = $("btnMalEstado");
  bBueno?.addEventListener("click", () => { bBueno.classList.add("active"); bMalo.classList.remove("active"); estadoActual = "bueno"; totales(); });
  bMalo?.addEventListener("click", () => { bMalo.classList.add("active"); bBueno.classList.remove("active"); estadoActual = "observaciones"; totales(); });

  const entregado = $("pagoEntregado");
  TG.vincular(entregado, { ok: v => (document.querySelector(".metodo-btn.active")?.dataset.metodo || "Efectivo") !== "Efectivo" || Number(v) >= totales().total, msg: "Monto inválido: no cubre el total a cobrar" });
  entregado?.addEventListener("focus", function () { this.select(); });
  entregado?.addEventListener("input", totales);
  const metodos = document.querySelectorAll(".metodo-btn"), tercero = $("campoDinamicoTercero"), grid = $("pagoGridContainer"), yape = $("yapeAdminContainer");
  metodos.forEach(b => b.addEventListener("click", () => {
    metodos.forEach(x => x.classList.remove("active")); b.classList.add("active");
    const m = b.dataset.metodo, ef = m === "Efectivo";
    grid.classList.toggle("transferencia-layout", !ef); tercero.style.display = ef ? "flex" : "none"; yape.style.display = m === "Yape" ? "block" : "none";
    totales();
  }));

  $("btnConfirmarPago")?.addEventListener("click", async () => {
    if (!boleta) { TG.toast("Primero busca el alquiler a devolver"); return; }
    if (terminado) return;
    const t = totales();
    if (!TG.validarTodo([entregado])) return;
    try {
      const cliente = { id: boleta.cliente.id };
      /* Un solo cargo: por demora, por mal estado o por ambos */
      if (t.sub > 0 || t.dano > 0) {
        const tipo = t.sub > 0 && t.dano > 0 ? "Ambos" : t.sub > 0 ? "Demora" : "Mal estado";
        await TG.post("/api/penalidades/nuevo", { cliente, tipo, monto: t.sub + t.dano, montoDemora: t.sub, montoMalEstado: t.dano, estado: "Cobrado" });
      }
      /* Devolución normal → Lavandería; con daños → Restauración */
      await TG.put("/api/boletas/devolver/" + boleta.id + "?estadoPrenda=" + encodeURIComponent(estadoActual === "observaciones" ? "En restauración" : "En lavandería"));
      terminado = true; $("btnConfirmarPago").disabled = true;
      TG.toast("Devolución registrada correctamente");
      await TG.calificarObligatorio(boleta.cliente);
    } catch (e) { alert(e.message); }
  });
  totales();
}));
