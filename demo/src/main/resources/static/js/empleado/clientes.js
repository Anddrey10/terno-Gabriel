// Clientes (empleado): lo que se registra aquí queda en la base de datos y lo ve el administrador.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
  const form = document.querySelector(".client-form");
  const tbody = document.querySelector(".data-table tbody");
  const searchInput = document.querySelector("[data-table-search]");

  const pintar = async () => {
    const [clientes, boletas, penalidades] = await Promise.all([TG.clientes(), TG.boletas(), TG.penalidades()]);
    const lista = clientes.filter(c => !TG.clienteEliminado(c, boletas)).sort((a, b) => b.id - a.id);
    tbody.innerHTML = lista.length ? lista.map(c => {
      const estado = TG.estadoCliente(c, penalidades);
      return "<tr><td>" + TG.esc(c.dni) + "</td><td>" + TG.esc(TG.nombre(c)) + "</td><td>" + TG.esc([c.direccion, c.distrito].filter(Boolean).join(", ")) +
        "</td><td>" + TG.esc(TG.telefono(c)) + "</td><td>" + TG.esc(c.correo || "—") + "</td><td>" + TG.ultimaOperacion(c, boletas) +
        "</td><td>" + TG.estrellas(c.calificacion, c.promedio) + '</td><td><span class="status-badge ' + (estado === "Activo" ? "active" : "debt") + '"><span class="dot"></span> ' + estado + "</span></td></tr>";
    }).join("") : '<tr><td colspan="8" style="text-align:center;color:#667085;padding:20px;">Aún no hay clientes registrados.</td></tr>';
    filtrar();
  };

  const filtrar = () => {
    const q = (searchInput?.value || "").toLowerCase().trim();
    tbody.querySelectorAll("tr").forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none"; });
  };
  searchInput?.addEventListener("input", filtrar);

  const reglas = { dni: "dni", nombres: "nombre", apellidos: "nombre", direccion: "direccion", celular: "celular", correo: "correo" };
  if (form) Object.entries(reglas).forEach(([n, r]) => TG.vincular(form.elements[n], r));

  form?.addEventListener("submit", async e => {
    e.preventDefault();
    if (!TG.validarTodo(Object.keys(reglas).map(n => form.elements[n]))) return;
    const v = n => form.elements[n].value.trim();
    const cliente = {
      dni: v("dni"), nombres: v("nombres"), apellidos: v("apellidos"), direccion: v("direccion"),
      celular: v("celular").replace(/\s+/g, ""), correo: v("correo")
    };
    try {
      await TG.post("/api/clientes/nuevo", cliente);
      form.reset(); TG.limpiarValidacion(form);
      TG.toast("Cliente guardado correctamente");
      await pintar();
    } catch (err) { TG.marcar(form.elements.dni, err.message); form.elements.dni.focus(); }
  });

  try { await pintar(); } catch (err) { TG.toast(err.message); }
  /* La calificación se recalcula sola cuando otro empleado califica: se refresca sin recargar la página */
  setInterval(() => { if (!document.hidden) pintar().catch(() => {}); }, 10000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pintar().catch(() => {}); });
}));
