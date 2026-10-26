// Catálogo de empleados: mostrar todos los estados excepto vendidos; sin filtro de vendidos.
// Al abrir, ningún filtro está marcado; "Restablecer filtros" devuelve todo a su valor por defecto.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
  const grid = document.querySelector(".product-grid");
  const selects = [...document.querySelectorAll(".filter-select[data-filter]")];
  const checks = [...document.querySelectorAll('input[name="componente"]')];
  const tabsPrenda = [...document.querySelectorAll("[data-category]")];
  const tabsTipo = [...document.querySelectorAll("[data-tipo-tab]")];
  const buscador = document.querySelector("[data-product-search]");
  let prendas = [];

  const TEXTOS = { color: "Todos los colores", categoria: "Todas las categorías", estilo: "Todos los estilos", talla: "Todas las tallas" };
  selects.forEach(s => TG.llenarSelect(s, TG.OPCIONES[s.dataset.filter], TEXTOS[s.dataset.filter]));
  checks.forEach(c => { c.checked = false; });

  const activa = (tabs, atributo) => { const b = tabs.find(x => x.classList.contains("active")); return b ? b.getAttribute(atributo) : ""; };
  const marcar = (tabs, valor, atributo) => tabs.forEach(b => b.classList.toggle("active", b.getAttribute(atributo) === valor));

  const pintar = () => {
    const f = { componentes: checks.filter(c => c.checked).map(c => c.value) };
    selects.forEach(s => { f[s.dataset.filter] = s.value; });
    const cat = activa(tabsPrenda, "data-category") || "Todos";
    const tipo = activa(tabsTipo, "data-tipo-tab");
    const q = (buscador?.value || "").toLowerCase().trim();
    const lista = prendas.filter(p => TG.pasaFiltros(p, f) && (cat === "Todos" || TG.categoriaPrenda(p).toLowerCase() === cat.toLowerCase()) &&
      (!tipo || p.tipo === tipo) &&
      (p.diseno + " " + p.codigo + " " + (p.color || "") + " " + (p.componente || "")).toLowerCase().includes(q));
    grid.innerHTML = lista.length ? TG.tarjetasCatalogo(lista) : '<p class="aviso-vacio">No hay prendas con esos filtros.</p>';
  };

  try { prendas = TG.prendasVisibles(await TG.prendas()).filter(p => String(p.estado || "").toLowerCase() !== "vendido"); pintar(); }
  catch (err) { TG.toast(err.message); }

  selects.forEach(s => s.addEventListener("change", pintar));
  checks.forEach(c => c.addEventListener("change", pintar));
  buscador?.addEventListener("input", () => setTimeout(pintar, 0));
  tabsPrenda.forEach(b => b.addEventListener("click", () => setTimeout(pintar, 0)));
  tabsTipo.forEach(b => b.addEventListener("click", () => { marcar(tabsTipo, b.getAttribute("data-tipo-tab"), "data-tipo-tab"); pintar(); }));

  /* Restablecer: selectores, componentes y pestañas vuelven a su valor por defecto */
  document.getElementById("resetFiltersBtn")?.addEventListener("click", () => {
    selects.forEach(s => { s.value = ""; });
    checks.forEach(c => { c.checked = false; });
    marcar(tabsPrenda, "Todos", "data-category");
    marcar(tabsTipo, "", "data-tipo-tab");
    pintar();
  });

  /* "Ver detalle": la tarjeta se estira y se vuelve a contraer al pulsar otra vez */
  grid.addEventListener("click", e => { const b = e.target.closest("[data-detalle]"); if (b) TG.alternarDetalle(b); });
}));
