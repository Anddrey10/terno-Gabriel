// Inicio del empleado: resumen calculado con las boletas y prendas reales.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
  try {
    const [boletas, confecciones] = await Promise.all([TG.boletas(), TG.get("/api/confecciones")]);
    const hoy = TG.hoyISO(), vig = boletas.filter(b => b.estado !== "Anulada");
    const delDia = vig.filter(b => b.fecha === hoy);
    const alq = vig.filter(b => b.tipo === "Alquiler" && b.estado === "Vigente");
    const vencidas = alq.filter(b => b.fechaDevolucion && b.fechaDevolucion < hoy);
    TG.kpi("Alquileres del día", delDia.filter(b => b.tipo === "Alquiler").length, "Registrados hoy");
    TG.kpi("Ventas del día", TG.money(delDia.reduce((s, b) => s + b.monto, 0)), delDia.length + " boletas hoy");
    const tbody = document.querySelector(".data-table tbody");
    const pend = confecciones.filter(c => c.estado === "En confección");
    TG.kpi("Confecciones pendientes", pend.length, pend.length ? pend.filter(c => c.entregaFinal < hoy).length + " vencidas" : "Sin pendientes");
    TG.kpi("Devoluciones pendientes", alq.length, vencidas.length + " vencidas");
    /* Próximas entregas: alquileres por devolver y confecciones por entregar, ordenados por fecha */
    const filas = alq.map(b => ({ fecha: b.fechaDevolucion || "", dni: b.cliente.dni, cliente: TG.nombre(b.cliente), prenda: b.prenda ? b.prenda.diseno : "—", tipo: "alq" }))
      .concat(pend.map(c => ({ fecha: c.entregaFinal || "", dni: c.cliente.dni, cliente: TG.nombre(c.cliente), prenda: "Confección " + (c.ticket || ""), tipo: "conf" })))
      .sort((x, y) => x.fecha.localeCompare(y.fecha));
    tbody.innerHTML = filas.length ? filas.map(f => {
      const venc = f.fecha && f.fecha < hoy, esHoy = f.fecha === hoy;
      const texto = f.tipo === "conf" ? (venc ? "Entrega vencida" : esHoy ? "Entrega hoy" : "En confección") : (venc ? "En demora" : esHoy ? "Devuelve hoy" : "En alquiler");
      return "<tr><td>" + TG.esc(f.dni) + "</td><td>" + TG.esc(f.cliente) + "</td><td>" + TG.esc(f.prenda) + "</td><td>" + TG.fecha(f.fecha) +
        '</td><td><span class="badge ' + (venc ? "danger" : esHoy ? "warning" : "success") + '"><span class="dot"></span>' + texto + "</span></td></tr>";
    }).join("") : '<tr><td colspan="5" style="text-align:center;color:#667085;padding:20px;">No hay entregas ni devoluciones pendientes.</td></tr>';
  } catch (e) { TG.toast(e.message); }
}));
