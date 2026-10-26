// Estado de prendas (empleado): el inventario sale de "Costos y Productos" del administrador (no incluye las prendas suspendidas).
// El estado cambia solo con las boletas de alquiler y devolución; a mano solo se puede pasar de Restauración o Lavandería a su siguiente paso.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
  const searchInput = document.querySelector("[data-table-search]");
  const stateSelect = document.querySelector("[data-state-filter]");
  const tbody = document.querySelector(".data-table tbody");
  /* Estados destino permitidos según el estado actual (texto mostrado → valor guardado) */
  const DESTINOS = {
    "En restauración": { "Lavandería": "En lavandería", "Disponible": "Disponible" },
    "En lavandería": { "Disponible": "Disponible" }
  };
  let prendas = [], alquiladoA = {}, confeccionA = {};

  const filterTable = () => {
    const query = (searchInput?.value || "").toLowerCase().trim();
    const sel = stateSelect ? stateSelect.value : "Todos";
    tbody.querySelectorAll("tr[data-id]").forEach(row => {
      row.hidden = !(row.textContent.toLowerCase().includes(query) && (sel === "Todos" || (row.dataset.estado || "") === sel));
    });
  };

  const pintar = async () => {
    const [todas, boletas, ordenes] = await Promise.all([TG.prendas(), TG.boletas(), TG.get("/api/confecciones").catch(() => [])]);
    prendas = TG.prendasVisibles(todas).filter(p => p.estado !== "Vendido");
    alquiladoA = {};
    confeccionA = {};
    (ordenes || []).filter(o => o && o.estado === "En confección").forEach(o => {
      const detalle = typeof o.detalle === "string" ? o.detalle : JSON.stringify(o.detalle || {});
      prendas.forEach(p => {
        if (detalle.toLowerCase().includes(String(p.codigo || "").toLowerCase()) || detalle.toLowerCase().includes(String(p.diseno || "").toLowerCase())) {
          confeccionA[p.id] = TG.nombre(o.cliente) || "Cliente de confección";
        }
      });
    });
    boletas.filter(b => b.tipo === "Alquiler" && b.estado === "Vigente" && b.prenda).forEach(b => { alquiladoA[b.prenda.id] = TG.nombre(b.cliente); });
    const disp = prendas.filter(p => p.estado === "Disponible").length;
    const sub = document.querySelector(".subtitle-stats");
    if (sub) sub.textContent = prendas.length + " prendas registradas · " + disp + " disponibles";
    tbody.innerHTML = prendas.length ? prendas.slice().sort((a, b) => a.codigo.localeCompare(b.codigo)).map(p => {
      const editable = !!DESTINOS[p.estado];
      return '<tr data-id="' + p.id + '" data-estado="' + TG.esc(p.estado) + '"><td class="col-codigo font-mono">' + TG.esc(p.codigo) + '</td><td class="col-nombre font-medium">' + TG.esc(p.diseno) +
        '</td><td class="col-talla">' + TG.esc(p.talla) + '</td><td class="col-costo">' + TG.money(p.precioAlquiler) + '</td><td class="col-precio">' + TG.money(p.precioVenta) +
        '</td><td class="col-estado">' + TG.insigniaEstado(p.estado) + '</td><td class="col-responsable">' + ((p.estado === "Alquilado" && alquiladoA[p.id]) ? TG.esc(alquiladoA[p.id]) : (p.estado === "En confección" && confeccionA[p.id] ? TG.esc(confeccionA[p.id]) : (p.estado === "Alquilado" || p.estado === "En confección" ? "No identificado" : "—"))) +
        '</td><td class="col-accion"><button class="btn-mini" type="button" data-cambiar="' + p.id + '"' + (editable ? '' : ' disabled title="Este estado cambia solo con las boletas de alquiler y devolución"') + '>Cambiar estado</button></td></tr>';
    }).join("") : '<tr><td colspan="8" class="aviso-vacio">No hay prendas registradas.</td></tr>';
    filterTable();
  };
  searchInput?.addEventListener("input", filterTable);
  stateSelect?.addEventListener("change", filterTable);

  tbody.addEventListener("click", e => {
    const b = e.target.closest("[data-cambiar]"); if (!b || b.disabled) return;
    const p = prendas.find(x => x.id === Number(b.dataset.cambiar)); if (!p || !DESTINOS[p.estado]) return;
    const opciones = DESTINOS[p.estado];
    TG.modal({
      titulo: "Cambiar estado", subtitulo: p.codigo + " · " + p.diseno + " · Actual: " + TG.etiquetaEstado(p.estado), textoOk: "Guardar",
      campos: [{ name: "estado", label: "Nuevo estado", options: Object.keys(opciones), value: Object.keys(opciones)[0] }],
      onOk: async v => { await TG.put("/api/prendas/estado/" + p.id + "?estado=" + encodeURIComponent(opciones[v.estado])); TG.toast("Estado actualizado"); await pintar(); }
    });
  });

  try { await pintar(); } catch (err) { TG.toast(err.message); }
}));
