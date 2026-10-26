// Penalizaciones: los montos se guardan en la base de datos y el empleado los usa en la devolución y en la boleta.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
    let activeKey = null, config = {};
    const CLAVES = { demora: "penalidadDemora", malestado: "penalidadMalEstado" };

    const modal = document.getElementById("editPenaltyModal");
    const modalTitle = document.getElementById("modalPenaltyTitle");
    const modalInput = document.getElementById("modalPriceInput");
    const btnClose = document.getElementById("closePenaltyModal");
    const btnCancel = document.getElementById("cancelPenaltyModal");
    const btnSave = document.getElementById("savePenaltyModal");

    TG.vincular(modalInput, "monto", { contenedor: modalInput.closest(".modal-input-group") });
    const pintarConfig = () => {
        if (config.penalidadDemora) document.getElementById("val-demora").textContent = Number(config.penalidadDemora.valor).toFixed(2);
        if (config.penalidadMalEstado) document.getElementById("val-malestado").textContent = Number(config.penalidadMalEstado.valor).toFixed(2);
        const ult = Object.values(config).filter(c => c.modificado).sort((a, b) => a.modificado.localeCompare(b.modificado)).pop();
        const span = document.getElementById("last-mod-date");
        if (ult && span) span.textContent = TG.fecha(ult.modificado) + " · " + (ult.modificadoPor || "Administrador");
    };

    const pintarHistorial = async () => {
        const [pens] = await Promise.all([TG.penalidades()]);
        const tbody = document.querySelector(".historial-card tbody");
        const lista = pens.slice().sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || b.id - a.id);
        tbody.innerHTML = lista.length ? lista.map(p =>
            '<tr data-product-category="' + TG.esc(p.tipo) + '"><td>' + TG.fecha(p.fecha) + "</td><td>" + TG.esc(TG.nombre(p.cliente)) + "</td><td>" + TG.esc(p.cliente.dni) +
            "</td><td>" + TG.esc(TG.etiquetaPenalidad(p.tipo)) + "</td><td>" + TG.money(p.monto) + '</td><td><span class="badge ' + (p.estado === "Cobrado" ? "success" : "pending") + '">● ' + TG.esc(p.estado) + "</span></td></tr>").join("")
            : '<tr><td colspan="6" style="text-align:center;color:#667085;padding:20px;">Aún no se han aplicado penalizaciones.</td></tr>';
        aplicarFiltro();
    };

    const filterSelect = document.querySelector("[data-category-filter]");
    function aplicarFiltro() {
        const val = filterSelect ? filterSelect.value : "Todos";
        document.querySelectorAll(".historial-card tbody tr[data-product-category]").forEach(row => {
            row.style.display = (val === "Todos" || row.dataset.productCategory === val) ? "" : "none";
        });
    }
    filterSelect?.addEventListener("change", aplicarFiltro);
    /* Restablecer filtros: tipo y fecha vuelven a su valor inicial */
    document.getElementById("resetPenaltyFilters")?.addEventListener("click", () => {
        if (filterSelect) filterSelect.value = "Todos";
        const fecha = document.querySelector(".filter-date");
        if (fecha) { fecha.value = "dd/mm/aaaa"; fecha.dispatchEvent(new Event("input")); }
        aplicarFiltro();
    });

    try { config = await TG.configuracion(); pintarConfig(); await pintarHistorial(); }
    catch (err) { TG.toast(err.message); }

    document.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", () => {
            const tipo = btn.dataset.editType;
            activeKey = CLAVES[tipo];
            modalTitle.textContent = tipo === "demora" ? "Editar Penalización por Demora" : "Editar Penalización por Mal Estado";
            modalInput.value = Number(config[activeKey]?.valor || 0).toFixed(2);
            TG.limpiarValidacion(modal);
            modal.removeAttribute("hidden");
        });
    });
    const closeModal = () => { modal.setAttribute("hidden", "true"); activeKey = null; };
    btnClose?.addEventListener("click", closeModal);
    btnCancel?.addEventListener("click", closeModal);

    btnSave?.addEventListener("click", async () => {
        if (!TG.validarTodo([modalInput])) return;
        const nuevo = parseFloat(modalInput.value);
        try {
            const u = TG.usuario();
            const c = await TG.put("/api/configuracion/" + activeKey, { valor: nuevo, modificadoPor: u ? u.nombre : "Administrador" });
            config[activeKey] = c;
            pintarConfig();
            closeModal();
            TG.toast("Monto de penalización actualizado");
        } catch (err) { alert(err.message); }
    });
}));
