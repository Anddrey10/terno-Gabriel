// Inicio del administrador: cifras calculadas con lo que registran los empleados.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
  try {
    const [boletas, prendas, pens] = await Promise.all([TG.boletas(), TG.prendas(), TG.penalidades()]);
    const hoy = TG.hoyISO(), mes = hoy.slice(0, 7);
    const vig = boletas.filter(b => b.estado !== "Anulada" && (b.fecha || "").startsWith(mes));
    const enInv = prendas.filter(p => p.estado !== "Vendido"), disp = prendas.filter(p => p.estado === "Disponible").length;
    const pct = n => (enInv.length ? Math.round(n * 100 / enInv.length) : 0) + "% del inventario";
    TG.kpi("Ventas del mes", TG.money(vig.reduce((s, b) => s + b.monto, 0)), vig.length + " boletas");
    TG.kpi("Alquileres del mes", vig.filter(b => b.tipo === "Alquiler").length, "Boletas de alquiler");
    TG.kpi("Prendas disponibles", disp, pct(disp));
    TG.kpi("No disponibles", enInv.length - disp, pct(enInv.length - disp));
    const cobradas = pens.filter(p => p.estado === "Cobrado");
    TG.kpi("Penalizaciones cobradas", TG.money(cobradas.reduce((s, p) => s + p.monto, 0)), cobradas.length + " operaciones");
    TG.kpi("Alquileres vencidos", boletas.filter(b => b.tipo === "Alquiler" && b.estado === "Vigente" && b.fechaDevolucion && b.fechaDevolucion < hoy).length, "Requieren seguimiento");
    TG.kpi("En restauración", prendas.filter(p => p.estado === "En restauración").length, "En proceso");

    /* Calificaciones: promedio de lo que los empleados califican al terminar cada boleta */
    const clientes = await TG.clientes();
    const calif = clientes.filter(c => c.calificacion);
    const prom = calif.length ? calif.reduce((s, c) => s + Number(c.promedio || c.calificacion), 0) / calif.length : 0;
    TG.kpi("Calificaciones", calif.length ? prom.toFixed(1) : "—", calif.length + (calif.length === 1 ? " cliente calificado" : " clientes calificados"));

    /* Ingresos de los últimos 7 meses (boletas no anuladas), igual que las ventas del mes */
    const MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const [ya, ma] = mes.split("-").map(Number);
    const meses = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(ya, ma - 1 - i, 1); meses.push({ clave: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"), nombre: MES[d.getMonth()], total: 0 }); }
    boletas.filter(b => b.estado !== "Anulada").forEach(b => { const m = meses.find(x => (b.fecha || "").startsWith(x.clave)); if (m) m.total += Number(b.monto) || 0; });
    const maxReal = Math.max(...meses.map(m => m.total), 0);
    const paso = maxReal <= 0 ? 1000 : Math.pow(10, Math.floor(Math.log10(maxReal))) / 2;
    const tope = Math.max(paso * 3, Math.ceil(maxReal / paso / 3) * paso * 3);
    const etiqueta = n => n >= 1000 ? (Math.round(n / 100) / 10) + "k" : String(Math.round(n));
    const totalIng = document.querySelector(".total-ingresos");
    if (totalIng) totalIng.textContent = TG.money(meses.reduce((s, m) => s + m.total, 0));
    const ys = document.querySelectorAll(".chart .y-labels span");
    [tope, tope * 2 / 3, tope / 3, 0].forEach((v, i) => { if (ys[i]) ys[i].textContent = etiqueta(v); });
    const xs = document.querySelectorAll(".chart .x-labels span");
    meses.forEach((m, i) => { if (xs[i]) xs[i].textContent = m.nombre; });
    const pts = meses.map((m, i) => [i * 500 / 6, 170 - (m.total / tope) * 150]);
    let linea = "M" + pts[0][0] + "," + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], dx = (x1 - x0) / 2; linea += " C" + (x0 + dx).toFixed(1) + "," + y0.toFixed(1) + " " + (x1 - dx).toFixed(1) + "," + y1.toFixed(1) + " " + x1.toFixed(1) + "," + y1.toFixed(1); }
    const trazos = document.querySelectorAll(".chart svg path");
    if (trazos.length >= 2) { trazos[0].setAttribute("d", linea + " L500,180 L0,180 Z"); trazos[1].setAttribute("d", linea); }

    /* Movimientos recientes: lo último que registraron los empleados (boletas, anulaciones y penalizaciones cobradas) */
    const lista = document.querySelector(".activity-list");
    const items = [...lista.querySelectorAll(".activity-item")];
    const icono = i => items[i]?.querySelector(".activity-icon");
    const molde = (i) => ({ clase: icono(i)?.className.replace("activity-icon", "").trim() || "", svg: icono(i)?.innerHTML || "" });
    const ico = { alquiler: molde(0), venta: molde(1), devolucion: molde(2), penal: molde(3) };
    const mov = [];
    boletas.forEach(b => {
      const anulada = b.estado === "Anulada";
      const tipo = anulada ? ["Boleta anulada", ico.penal] : ({ Alquiler: ["Alquiler registrado", ico.alquiler], Venta: ["Venta completada", ico.venta], Reserva: ["Reserva registrada", ico.alquiler], "Confección": ["Confección entregada", ico.venta] }[b.tipo] || ["Operación registrada", ico.venta]);
      mov.push({ fecha: b.fecha || "", id: b.id, titulo: tipo[0], ico: tipo[1], detalle: TG.nombre(b.cliente) + " · " + (b.numero || ""), monto: anulada ? 0 : b.monto });
    });
    pens.filter(p => p.estado === "Cobrado").forEach(p => mov.push({ fecha: p.fecha || "", id: p.id, titulo: "Penalización cobrada", ico: ico.penal, detalle: TG.nombre(p.cliente) + " · " + TG.etiquetaPenalidad(p.tipo), monto: p.monto }));
    mov.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    lista.innerHTML = mov.length ? mov.slice(0, 4).map(m =>
      '<div class="activity-item"><div class="activity-left"><span class="activity-icon ' + m.ico.clase + '">' + m.ico.svg + "</span><div><b>" + TG.esc(m.titulo) + "</b><span>" + TG.esc(m.detalle) +
      '</span></div></div><strong class="activity-amount">' + TG.money(m.monto) + "</strong></div>").join("")
      : '<div class="activity-item"><div class="activity-left"><div><b>Sin movimientos</b><span>Aún no hay operaciones registradas</span></div></div></div>';
  } catch (e) { TG.toast(e.message); }
}));
