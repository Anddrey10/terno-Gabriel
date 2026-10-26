// Empleados (administrador): lista de empleados y suspendidos, con buscador por código.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
  const tbody = document.querySelector(".data-table tbody");
  const contador = document.getElementById("contadorEmpleados");
  const buscador = document.getElementById("buscadorCodigo");
  const filtroEstado = document.getElementById("filtroEstado");
  const msg = document.getElementById("msgBusqueda");
  const pestanas = [...document.querySelectorAll("[data-pestana]")];
  let empleados = [], pestana = "empleados";

  /* Reglas del buscador: exactamente 4 caracteres, sin espacios, en mayúsculas, solo letras y números */
  buscador.addEventListener("input", () => {
    buscador.value = TG.reglas.codigoEmpleado.filtro(buscador.value);
    pintarTabla();
  });

  const cargar = async () => { empleados = await TG.get("/api/empleados"); pintarTabla(); };

  const badgeRol = r => '<span class="badge badge-role ' + (r === "Administrador" ? "role-admin" : "role-empleado") + '"><span class="dot"></span>' + TG.esc(r) + "</span>";
  const badgeEstado = e => e === "Suspendido" ? TG.insigniaEstado("Suspendido")
    : '<span class="badge badge-status ' + (e === "Activo" ? "status-activo" : "status-inactivo") + '"><span class="dot"></span>' + TG.esc(e) + "</span>";

  const fila = e => {
    const sus = e.estado === "Suspendido";
    const acciones = sus
      ? '<button class="btn-mini ok" type="button" data-reactivar="' + e.id + '">↺ Restablecer</button>'
      : '<div class="acciones-fila"><button class="btn-mini danger" type="button" data-suspender="' + e.id + '">⏸ Suspender</button>' +
        '<button class="btn-mini" type="button" data-clave="' + e.id + '">🔑 Restablecer contraseña</button></div>';
    return '<tr data-id="' + e.id + '"><td class="col-name"><strong>' + TG.esc(e.codigo || "—") + '</strong></td><td class="col-name">' + TG.esc(e.nombre) + '</td><td class="col-user">' + TG.esc(e.usuario) +
      "</td><td>" + TG.esc(e.correo || "—") + "</td><td>" + TG.esc(e.telefono ? e.telefono.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : "—") + "</td><td>" + TG.esc(e.area || "—") +
      "</td><td>" + badgeRol(e.rol) + "</td><td>" + badgeEstado(e.estado) + '</td><td class="col-date">' + TG.fecha(e.desde) + "</td><td>" + acciones + "</td></tr>";
  };

  function pintarTabla() {
    const sus = pestana === "suspendidos";
    const grupo = empleados.filter(e => (e.estado === "Suspendido") === sus);
    /* Contador de la cabecera: se actualiza solo según la pestaña */
    contador.textContent = sus ? grupo.length + " suspendidos"
      : grupo.length + (grupo.length === 1 ? " empleado" : " empleados") + " con acceso al sistema";
    filtroEstado.style.display = sus ? "none" : "";

    let lista = grupo, aviso = "";
    const q = buscador.value;
    if (q.length === 4 && TG.reglas.codigoEmpleado.ok(q)) {
      const encontrado = empleados.find(e => e.codigo === q);
      if (!encontrado) aviso = "Código no existe";
      else if (!sus && encontrado.estado === "Suspendido") aviso = "El empleado se encuentra suspendido";
      else if (sus && encontrado.estado !== "Suspendido") aviso = "El empleado no está suspendido";
      lista = aviso ? [] : [encontrado];
    } else if (!sus && filtroEstado.value !== "Todos") {
      lista = grupo.filter(e => e.estado === filtroEstado.value);
    }
    msg.style.display = aviso ? "block" : "none"; msg.textContent = aviso;
    tbody.innerHTML = lista.length ? lista.slice().sort((a, b) => (a.codigo || "").localeCompare(b.codigo || "")).map(fila).join("")
      : '<tr><td colspan="10" class="aviso-vacio">' + (aviso ? "" : sus ? "No hay empleados suspendidos." : "No hay empleados para mostrar.") + "</td></tr>";
  }

  pestanas.forEach(b => b.addEventListener("click", () => {
    pestanas.forEach(x => x.classList.toggle("active", x === b));
    pestana = b.dataset.pestana; buscador.value = ""; pintarTabla();
  }));
  filtroEstado.addEventListener("change", pintarTabla);

  tbody.addEventListener("click", async e => {
    const bSu = e.target.closest("[data-suspender]"), bRe = e.target.closest("[data-reactivar]"), bCl = e.target.closest("[data-clave]");
    try {
      if (bSu) {
        const emp = empleados.find(x => x.id === Number(bSu.dataset.suspender));
        const yo = TG.usuario();
        if (yo && emp.nombre === yo.nombre) { TG.toast("No puedes suspender tu propia cuenta"); return; }
        if (!confirm("¿Suspender a " + emp.nombre + "? Ya no podrá ingresar al sistema.")) return;
        await TG.put("/api/empleados/suspender/" + emp.id); TG.toast("Empleado suspendido"); await cargar();
      }
      if (bRe) { await TG.put("/api/empleados/reactivar/" + bRe.dataset.reactivar); TG.toast("Empleado restablecido"); await cargar(); }
      if (bCl) {
        const emp = empleados.find(x => x.id === Number(bCl.dataset.clave));
        if (!confirm("¿Restablecer la contraseña de " + emp.nombre + "?")) return;
        const r = await TG.put("/api/empleados/restablecer/" + emp.id);
        TG.modal({ titulo: "Contraseña restablecida", subtitulo: "Entrégale esta contraseña temporal a " + emp.nombre + ".", textoOk: "Cerrar",
          campos: [{ name: "clave", label: "Contraseña temporal", value: r.contrasena, readonly: true }], onOk: async () => {} });
        await cargar();
      }
    } catch (err) { TG.toast(err.message); }
  });

  document.getElementById("btnAgregarEmpleado").addEventListener("click", () => {
    TG.modal({
      titulo: "Agregar empleado", subtitulo: "El código se genera automáticamente.", textoOk: "Guardar empleado",
      campos: [
        { name: "nombre", label: "Nombre completo", placeholder: "Ej. Luis Alberto Salazar", regla: "nombre" },
        { name: "usuario", label: "Usuario", placeholder: "Ej. l.salazar", regla: "usuario" },
        { name: "contrasena", label: "Contraseña", placeholder: "Mínimo 4 caracteres", regla: "contrasena" },
        { name: "correo", label: "Correo electrónico", placeholder: "Ej. nombre@gmail.com", regla: "correo" },
        { name: "telefono", label: "Teléfono", placeholder: "Ej. 987654321", regla: "celular" },
        { name: "area", label: "Área o puesto de trabajo", placeholder: "Ej. Ventas", regla: "area" },
        { name: "rol", label: "Rol", options: ["Empleado", "Administrador"], value: "Empleado" }
      ],
      onOk: async v => { await TG.post("/api/empleados/nuevo", { ...v, estado: "Activo" }); TG.toast("Empleado agregado"); await cargar(); }
    });
  });

  try { await cargar(); } catch (err) { TG.toast(err.message); }
}));
