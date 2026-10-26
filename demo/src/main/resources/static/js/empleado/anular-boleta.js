// Anular boleta: busca la boleta real; al anular, la prenda vuelve a estar Disponible para todos.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
  const $ = id => document.getElementById(id);
  const searchInput = $("searchInput"), cancelSummary = $("cancelSummary"), notFoundBox = $("notFoundBox"), anularBtn = $("anularBtn");
  const confirmModal = $("confirmModal"), motivoInput = $("motivoInput");
  let boleta = null;

  searchInput?.addEventListener("input", e => {
    const v = e.target.value; if (!v) return;
    if (/^[a-zA-Z]/.test(v)) { const n = v.slice(1).replace(/\D/g, "").slice(0, 7); e.target.value = "B" + (n.length > 3 ? n.slice(0, 3) + "-" + n.slice(3) : n); }
    else e.target.value = v.replace(/\D/g, "").slice(0, 8);
  });

  const buscar = async () => {
    const codigo = searchInput.value.trim(); boleta = null;
    if (!codigo) { TG.toast("Por favor ingresa un DNI o número de boleta."); return; }
    const esBoleta = /^B\d{3}-\d{1,4}$/i.test(codigo), esDni = /^\d{8}$/.test(codigo);
    if (!esBoleta && !esDni) { TG.toast("Formato incompleto. Debe ser un DNI de 8 dígitos o una boleta válida (ej: B001-0083)."); cancelSummary.hidden = true; notFoundBox.hidden = true; anularBtn.disabled = true; return; }
    /* B001-83 → B001-0083 (así se guardan los números de boleta) */
    const numeroBuscado = esBoleta ? codigo.toUpperCase().split("-")[0] + "-" + codigo.split("-")[1].padStart(4, "0") : "";
    try {
      const vigentes = (await TG.boletas()).filter(b => ["Alquiler", "Venta"].includes(String(b.tipo || "")) && String(b.estado || "") === "Vigente");
      boleta = esDni ? vigentes.filter(b => b.cliente.dni === codigo).sort((a, b) => b.id - a.id)[0]
                     : vigentes.find(b => String(b.numero || "").toUpperCase() === numeroBuscado);
    } catch (e) { TG.toast(e.message); return; }
    if (!boleta) { cancelSummary.hidden = true; notFoundBox.hidden = false; anularBtn.disabled = true; return; }
    $("sumCliente").textContent = TG.nombre(boleta.cliente); $("sumAvatar").textContent = TG.iniciales(TG.nombre(boleta.cliente)); $("sumDni").textContent = boleta.cliente.dni;
    $("sumTipo").textContent = boleta.tipo === "Venta" ? "Compra / Venta" : boleta.tipo;
    $("sumEstado").textContent = boleta.estado;
    /* La boleta de confección no tiene prenda: se muestra el ticket de la orden */
    $("sumPrenda").textContent = boleta.prenda ? boleta.prenda.diseno + " - " + boleta.prenda.codigo : "Confección a medida" + (boleta.confeccion && boleta.confeccion.ticket ? " - " + boleta.confeccion.ticket : ""); $("sumFecha").textContent = TG.fecha(boleta.fecha); $("sumMonto").textContent = TG.money(boleta.monto);
    cancelSummary.hidden = false; notFoundBox.hidden = true; anularBtn.disabled = false;
  };
  $("searchBtn")?.addEventListener("click", buscar);
  searchInput?.addEventListener("keydown", e => { if (e.key === "Enter") buscar(); });

  TG.vincular(motivoInput, { ok: v => v.trim().length >= 5, msg: "Motivo inválido (mínimo 5 caracteres)" });
  anularBtn?.addEventListener("click", () => {
    if (!TG.validarTodo([motivoInput])) return;
    confirmModal.hidden = false;
  });
  $("cancelModalBtn")?.addEventListener("click", () => { confirmModal.hidden = true; });
  $("confirmModalBtn")?.addEventListener("click", async () => {
    confirmModal.hidden = true;
    try {
      await TG.put("/api/boletas/anular/" + boleta.id + "?motivo=" + encodeURIComponent(motivoInput.value.trim()));
      TG.toast("¡Boleta anulada correctamente!");
      cancelSummary.hidden = true; notFoundBox.hidden = true; anularBtn.disabled = true; searchInput.value = ""; motivoInput.value = ""; TG.limpiarValidacion(motivoInput.closest(".field")); boleta = null;
    } catch (e) { TG.toast(e.message); }
  });
}));
