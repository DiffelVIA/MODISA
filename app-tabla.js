let concentradoMinutas = [];
let actividadesFiltradas = [];

const filtroProyecto = document.getElementById("filtroProyecto");
const filtroEstado = document.getElementById("filtroEstado");
const filtroResponsable = document.getElementById("filtroResponsable");
const filtroSemana = document.getElementById("filtroSemana");

let cuerpoTabla;

document.addEventListener('DOMContentLoaded', () => {
  cuerpoTabla = document.querySelector('.cuerpoTabla');
  cargarActividades();
  configurarFiltros();

  const btnDescargar = document.getElementById("descargar");
  if (btnDescargar) {
    btnDescargar.addEventListener('click', MinutasPDF);
  }
});

async function cargarActividades() {
  try {
    const respuesta = await fetch('https://modisa.onrender.com/api/minutas');
    
    if (!respuesta.ok) {
      throw new Error('Error al conectar con el servidor');
    }

    const datosCrudos = await respuesta.json();

    console.log('Datos recibidos de Aiven:');
    console.table(datosCrudos);

    if (!Array.isArray(datosCrudos)) {
      concentradoMinutas = [];
    } else {
      concentradoMinutas = datosCrudos.map(item => {
        const comentario = item.comentariodirector || item.comentarioDirector || '';
        return {
          id: item.id,
          proyecto: item.proyecto || 'Sin proyecto',
          responsable: item.responsable || 'Sin responsable',
          semana: item.semana !== undefined && item.semana !== null ? String(item.semana) : '1',
          fecha: item.fecha || '',
          descripcion: item.descripcion || '',
          estado: item.estado ? String(item.estado).toLowerCase().trim() : 'pendiente',
          comentarioDirector: comentario
        };
      });
    }

    actividadesFiltradas = [...concentradoMinutas];
    filtroOpciones(concentradoMinutas);
    renderizarTabla(concentradoMinutas);

  } catch (error) {
    console.error("Error al cargar minutas desde Aiven:", error);
    if (cuerpoTabla) {
      cuerpoTabla.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:red; font-weight:bold;">Error al conectar con la base de datos en la nube. Revisa el backend.</td></tr>`;
    }
  }
}

function filtroOpciones(datos){
  if (!datos || datos.length ===0) return;

  const proyectosUnicos = [...new Set(datos.map(item => item.proyecto).filter(Boolean))];
  const responsablesUnicos = [...new Set(datos.map(item => item.responsable).filter(Boolean))];
  const semanasUnicas = [...new Set(datos.map(item => item.semana))].sort((a,b) => Number(a) - Number(b));

  if (filtroProyecto) {
    filtroProyecto.innerHTML = '<option value="todos">Todos los proyectos</option>';
    proyectosUnicos.forEach(p => {
    filtroProyecto.innerHTML += `<option value="${p}">${p}</option>`;
    });
    filtroProyecto.value = 'todos';
  }

  proyectosUnicos.sort();
  responsablesUnicos.sort();
  semanasUnicas.sort((a, b) => a - b);

  if (filtroEstado) {
    filtroEstado.innerHTML = `
    <option value="todos">Todos los estados</option>
    <option value="pendiente">⏳ Pendiente</option>
    <option value="atrasada">🚨 Atrasada</option>
    <option value="completada">✅ Completada</option>
    <option value="aplazada">📅 Aplazada</option>
    `;
    filtroEstado.value = 'todos';
  }
  

  if (filtroResponsable) {
    filtroResponsable.innerHTML = '<option value="todos">Todos los responsables</option>';
    responsablesUnicos.forEach(r =>{
      filtroResponsable.innerHTML += `<option value="${r}">${r}</option>`;
    });
    filtroResponsable.value = 'todos';
  }

  if (filtroSemana) {
    filtroSemana.innerHTML = '<option value="todas">Todas las semanas</option>';
    semanasUnicas.forEach(s =>{
      filtroSemana.innerHTML += `<option value="${s}">Semana ${s}</option>`;
    });
    filtroSemana.value = 'todas';
  }
}

function renderizarTabla(actividadesAFiltrar) {
  if (!cuerpoTabla) return;
  cuerpoTabla.innerHTML = '';

  if (actividadesAFiltrar.length === 0) {
    cuerpoTabla.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">No hay actividades registradas con estos filtros.</td></tr>`;
    return;
  }

  actividadesAFiltrar.forEach((actividad) => {
    const fila = document.createElement('tr');

    const fechaLimpia = actividad.fecha ? actividad.fecha.split('T')[0] : '';

    fila.innerHTML = `
    <td><strong>${actividad.proyecto}</strong></td>
    <td>${actividad.responsable}</td>
    <td><span style="background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-weight: bold; color: #334155;">${actividad.semana || 'N/A'}</span></td>
    <td>${formatearFechaHTML(fechaLimpia)}</td>
    <td style="text-align: left;">${actividad.descripcion}</td>
    <td>
      <select class="selector-estatus" data-id="${actividad.id}">
        <option value="pendiente" ${actividad.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
        <option value="atrasada" ${actividad.estado === 'atrasada' ? 'selected' : ''}>🚨 Atrasada</option>
        <option value="completada" ${actividad.estado === 'completada' ? 'selected' : ''}>✅ Completada</option>
        <option value="aplazada" ${actividad.estado === 'aplazada' ? 'selected' : ''}>📅 Aplazada</option>
      </select>
    </td>
    <td>
        <input type="text" class="input-comentario" data-id="${actividad.id}" value="${actividad.comentarioDirector || ''}" placeholder="Añadir comentario...">
    </td>
    `;
    cuerpoTabla.appendChild(fila);
  });

  asignarEventosInteractivos();
}

function aplicarFiltros() {
  const pSel = filtroProyecto ? filtroProyecto.value : 'todos';
  const eSel = filtroEstado ? filtroEstado.value : 'todos';
  const rSel = filtroResponsable ? filtroResponsable.value : 'todos';
  const sSel = filtroSemana ? filtroSemana.value : 'todas';

  const resultadoFiltrado = concentradoMinutas.filter((actividad) => {
    const cumpleProyecto = (pSel === 'todos' || pSel === '' || actividad.proyecto === pSel);
    const cumpleEstado = (eSel === 'todos' || eSel === '' || eSel === 'todos los estados' || actividad.estado === eSel.toLowerCase().trim());
    const cumpleResponsable = (rSel === 'todos' || rSel === '' || actividad.responsable === rSel);
    const cumpleSemana = (sSel === 'todas' || sSel === '' || String(actividad.semana).trim() === String(sSel).trim());

    return cumpleProyecto && cumpleEstado && cumpleResponsable && cumpleSemana;
  });

  actividadesFiltradas = resultadoFiltrado;
  renderizarTabla(resultadoFiltrado);
}

function configurarFiltros() {
  if (filtroProyecto) filtroProyecto.addEventListener('change', aplicarFiltros);
  if (filtroEstado) filtroEstado.addEventListener('change', aplicarFiltros);
  if (filtroResponsable) filtroResponsable.addEventListener('change', aplicarFiltros);
  if (filtroSemana) filtroSemana.addEventListener('change', aplicarFiltros);
}

function asignarEventosInteractivos() {
  document.querySelectorAll('.selector-estatus').forEach((select) => {
    select.addEventListener('change', (e) => {
      const idActividad = e.target.getAttribute('data-id');
      const nuevoEstado = e.target.value;

      const actividad = concentradoMinutas.find(item => item.id === idActividad);
      if (actividad) {
        actividad.estado = nuevoEstado;
        guardarEnNubeUrgente(actividad);
      }
    });
  });

  document.querySelectorAll('.input-comentario').forEach((input) => {
    input.addEventListener('change', (e) => {
      const idActividad = e.target.getAttribute('data-id');
      const nuevoComentario = e.target.value;

      const actividad = concentradoMinutas.find(item => item.id === idActividad);
      if (actividad) {
        actividad.comentarioDirector = nuevoComentario;
        guardarEnNubeUrgente(actividad);
      }
    });
  });
}

async function guardarEnNubeUrgente(actividadActualizada) {
  try {
    const url = 'https://modisa.onrender.com/api/minutas';

    const indice = concentradoMinutas.findIndex(item => item.id === actividadActualizada.id);
    if (indice !== -1) {
      concentradoMinutas[indice] = {...actividadActualizada};
    }

    const objetoFormateado = {
      id: actividadActualizada.id,
      proyecto: actividadActualizada.proyecto,
      responsable: actividadActualizada.responsable,
      semana: Number(actividadActualizada.semana),
      fecha: actividadActualizada.fecha,
      descripcion: actividadActualizada.descripcion,
      estado: actividadActualizada.estado,
      comentariodirector: actividadActualizada.comentarioDirector || ''
    };

    const payloadParaBackend = [objetoFormateado];

    console.log("Enviando este payload corregido al servidor:", payloadParaBackend);

    const respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payloadParaBackend)
    });

    if (!respuesta.ok) {
      throw new Error('Error al actualizar datos en el servidor');
    }

    const resultado = await respuesta.json();
    console.log('Sincronización exitosa con Aiven:', resultado);

    aplicarFiltros();
    
  } catch (error) {
    console.error('Error al guardar cambios en la nube:', error);
    alert('No se pudieron guardar los cambios en la nube.');
  }
}

function formatearFechaHTML(fechaInput) {
  if (!fechaInput) return '';
  const partes = fechaInput.split('-');
  if (partes.length !== 3) return fechaInput;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function MinutasPDF() {
  if (actividadesFiltradas.length === 0) {
    alert('No hay actividades para generar el PDF. Aplica filtros que muestren actividades o elimina los filtros.');
    return;
  }

  let doc;
  try{
    const { jsPDF } = window.jspdf;
    doc = new jsPDF('p','pt','a4');
  } catch (e){
    try{
      doc = new window.jsPDF('p','pt','a4');
    } catch(e2){
      doc = new jspdf.jsPDF('p','pt','a4');
    }
  }

  const margenIzquierdo = 40;
  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42);
  doc.text("Minutas Filtradas", margenIzquierdo, y);

  y += 22;

  const fProyecto = filtroProyecto ? filtroProyecto.value : "todos";
  const fsemana = filtroSemana ? filtroSemana.value : "todas";

  const semFormateada = fsemana === "todas" ? "General" : fsemana;
  const proyFormateado = fProyecto.charAt(0).toUpperCase() + fProyecto.slice(1);
  const textoFiltros = `Filtros aplicados - Proyecto: ${proyFormateado} | Semana: ${semFormateada}`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(textoFiltros, margenIzquierdo, y);

  y += 15;

  doc.setDrawColor(226,232,240);
  doc.setLineWidth(1.5);
  doc.line(margenIzquierdo, y, 550, y);

  y += 35;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30,41,59);
  doc.text("Resumen de Actividades Asignadas", margenIzquierdo, y);

  y+= 25;

  actividadesFiltradas.forEach((actividad, indice) => {
    if (y > 740){
      doc.addPage();
      y = 60;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30,41,59);
    doc.text(`Actividad ${indice + 1}:`, margenIzquierdo, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);

    const fechaLimpia = actividad.fecha ? actividad.fecha.split('T')[0] : '';
    const fechaFormateada = formatearFechaHTML(fechaLimpia);
    const textoEstatus = actividad.estado ? actividad.estado.toUpperCase() : 'PENDIENTE';

    const metadatos = `Proyecto: ${actividad.proyecto} | Responsable: ${actividad.responsable} | Límite: ${fechaFormateada} | Estado: ${textoEstatus}`;
    doc.text(metadatos, margenIzquierdo + 65, y);

    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);

    const descLineas = doc.splitTextToSize(`Descripción: ${actividad.descripcion || 'Sin descripción.'}`, 510);
    doc.text(descLineas, margenIzquierdo, y);
    y += (descLineas.length * 13);

    if (actividad.comentarioDirector && actividad.comentarioDirector.trim() !=="" ) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(2, 132, 199);

      const comentarioLineas = doc.splitTextToSize(`Comentario del director: ${actividad.comentarioDirector}`, 510);
      doc.text(comentarioLineas, margenIzquierdo + 65, y);
      y += (comentarioLineas.length * 13);
    }

    y += 12;

    doc.setDrawColor(241,245,249);
    doc.setLineWidth(1);
    doc.line(margenIzquierdo, y, 550, y);

    y += 28;
  });

  let nombreLimpio = (document.getElementById("filtroProyecto").value || 'General').trim();
  
  nombreProyecto = nombreLimpio
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ñ/g, 'n');

  const nombreArchivo = `Reporte_Minutas_${nombreProyecto.replace(/\s+/g, '_')}.pdf`
  nombreLimpio = nombreLimpio.replace(/ /g, 'i').replace(/i/g, 'I');
  doc.save(nombreArchivo);
}