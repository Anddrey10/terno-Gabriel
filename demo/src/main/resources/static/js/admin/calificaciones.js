// Calificación de clientes: lista lo que califican los empleados al terminar cada boleta / devolución.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
    const kpiButtons = document.querySelectorAll(".kpi-btn");
    const searchInput = document.getElementById("searchCalificaciones");
    const tbody = document.querySelector(".data-table-custom tbody");

    const elPromedio = document.querySelector("#kpiPromedio .kpi-value");
    const elTotal = document.querySelector("#kpiTotal .kpi-value");
    const elBuenas = document.querySelector("#kpiBuenas .kpi-value");
    const elEstandar = document.querySelector("#kpiEstandar .kpi-value");
    const elRiesgo = document.querySelector("#kpiRiesgo .kpi-value");
    const elSubtitle = document.getElementById("ratingsSubtitle");

    let currentFilter = "all";
    let tableRows = [];

    try {
        const clientes = (await TG.clientes()).filter(c => c.calificacion).sort((a, b) => (b.fechaCalificacion || "").localeCompare(a.fechaCalificacion || "") || b.id - a.id);
        tbody.innerHTML = clientes.length ? clientes.map(c =>
            '<tr data-stars="' + c.calificacion + '"><td class="col-dni">' + TG.esc(c.dni) + '</td><td class="col-cliente">' + TG.esc(TG.nombre(c)) +
            '</td><td class="col-estrellas">' + TG.estrellas(c.calificacion, c.promedio) + ' <strong class="rating-number">' + Number(c.calificacion).toFixed(0) + '/5</strong></td><td class="col-comentario">' + TG.esc(TG.comentarioAuto(c.calificacion, c.comentario)) +
            '</td><td class="col-fecha">' + TG.fecha(c.fechaCalificacion) + "</td></tr>").join("")
            : '<tr><td colspan="5" style="text-align:center;color:#667085;padding:20px;">Todavía no hay calificaciones. Los empleados califican al cliente al terminar una boleta o una devolución.</td></tr>';
        tableRows = [...tbody.querySelectorAll("tr[data-stars]")];
    } catch (err) { TG.toast(err.message); }

    function updateMetrics() {
        const total = tableRows.length;
        let buenas = 0, estandar = 0, riesgo = 0, suma = 0;
        tableRows.forEach(row => {
            const s = parseInt(row.getAttribute("data-stars"), 10);
            suma += s;
            if (s >= 4) buenas++; else if (s === 3) estandar++; else riesgo++;
        });
        const promedio = total > 0 ? (suma / total).toFixed(1) : "0.0";
        if (elPromedio) elPromedio.textContent = promedio + " / 5";
        if (elTotal) elTotal.textContent = total;
        if (elBuenas) elBuenas.textContent = buenas;
        if (elEstandar) elEstandar.textContent = estandar;
        if (elRiesgo) elRiesgo.textContent = riesgo;
        if (elSubtitle) elSubtitle.textContent = total + " opiniones · Promedio general " + promedio + " de 5";
    }

    function applyFilters() {
        const q = searchInput ? searchInput.value.toLowerCase().trim() : "";
        tableRows.forEach(row => {
            const stars = parseInt(row.getAttribute("data-stars"), 10);
            const dni = row.querySelector(".col-dni").textContent.toLowerCase();
            const cliente = row.querySelector(".col-cliente").textContent.toLowerCase();
            let kpi = true;
            if (currentFilter === "buena") kpi = stars >= 4;
            else if (currentFilter === "estandar") kpi = stars === 3;
            else if (currentFilter === "riesgo") kpi = stars <= 2;
            row.style.display = kpi && (dni.includes(q) || cliente.includes(q)) ? "" : "none";
        });
    }

    kpiButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            kpiButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            applyFilters();
        });
        btn.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); btn.click(); } });
    });
    searchInput?.addEventListener("input", applyFilters);
    updateMetrics();
}));
