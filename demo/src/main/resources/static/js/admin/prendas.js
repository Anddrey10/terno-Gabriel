// Estado de prendas (administrador): es el mismo inventario que ve el empleado, solo para consultar (sin editar estados).
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
  const searchInput = document.getElementById("inventorySearch");
  const stateFilter = document.getElementById("inventoryStateFilter");
  const kpiFilters = document.querySelectorAll(".kpi-filter");
  const tbody = document.querySelector(".inventory-table tbody");
  let prendas = [], alquiladoA = {}, confeccionA = {}, currentFilter = "todos";

  const filterTable = () => {
    const q = (searchInput?.value || "").toLowerCase().trim();
    tbody.querySelectorAll("tr[data-id]").forEach(row => {
      const est = row.getAttribute("data-estado");
      const okEstado = currentFilter === "todos" || est === currentFilter || (currentFilter === "restauracion" && est === "confeccion");
      row.style.display = row.textContent.toLowerCase().includes(q) && okEstado ? "" : "none";
    });
  };

  const pintar = async () => {
    const [todas, boletas, ordenes] = await Promise.all([TG.prendas(), TG.boletas(), TG.get("/api/confecciones").catch(() => [])]);
    prendas = TG.prendasVisibles(todas);
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
    const n = e => prendas.filter(p => p.estado === e).length;
    const nums = document.querySelectorAll(".kpi-filter .kpi-copy strong");
    if (nums.length >= 4) { nums[0].textContent = prendas.length; nums[1].textContent = n("Disponible"); nums[2].textContent = n("Alquilado"); nums[3].textContent = n("En confección") + n("En restauración"); }
    const sub = document.querySelector(".inventory-subtitle");
    if (sub) sub.textContent = prendas.length + " prendas registradas · " + n("Disponible") + " disponibles";
    tbody.innerHTML = prendas.length ? prendas.slice().sort((a, b) => a.codigo.localeCompare(b.codigo)).map(p =>
      '<tr data-id="' + p.id + '" data-estado="' + TG.claveEstado(p.estado) + '"><td class="code-col">' + TG.esc(p.codigo) + '</td><td class="name-col">' + TG.esc(p.diseno) +
      '</td><td class="size-col">' + TG.esc(p.talla) + '</td><td class="cost-col">' + TG.money(p.precioAlquiler) +
      '</td><td class="price-col">' + TG.money(p.precioVenta) + '</td><td class="status-col">' + TG.insigniaEstado(p.estado) + '</td><td class="responsable-col">' +
      ((p.estado === "Alquilado" && alquiladoA[p.id]) ? TG.esc(alquiladoA[p.id]) : (p.estado === "En confección" && confeccionA[p.id] ? TG.esc(confeccionA[p.id]) : ((p.estado === "Alquilado" || p.estado === "En confección") ? "No identificado" : "—"))) + '</td></tr>').join("") : '<tr><td colspan="7" class="aviso-vacio">No hay prendas registradas.</td></tr>';
    filterTable();
  };

  kpiFilters.forEach(card => card.addEventListener("click", () => {
    kpiFilters.forEach(c => c.classList.remove("active")); card.classList.add("active");
    currentFilter = card.getAttribute("data-filter");
    if (stateFilter) stateFilter.value = currentFilter;
    filterTable();
  }));
  searchInput?.addEventListener("input", filterTable);
  stateFilter?.addEventListener("change", e => {
    currentFilter = e.target.value;
    kpiFilters.forEach(c => c.classList.toggle("active", c.getAttribute("data-filter") === currentFilter));
    filterTable();
  });

  try { await pintar(); } catch (err) { TG.toast(err.message); }
}));
