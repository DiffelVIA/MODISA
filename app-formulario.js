let actividadesAcumuladas = [];

document.addEventListener('DOMContentLoaded', () => {
  cargarResponsablesDesdeNube();
  cargarProyectosDesdeNube();
  configurarBotonGuardarAlterno();
});

async function cargarResponsablesDesdeNube() {
  const selectResponsable = document.getElementById('responsable');
  if (!selectResponsable) return;

  try {
    const respuesta = await fetch(  'https://modisa.onrender.com/api/empleados');
    if (!respuesta.ok) throw new Error('Error al traer empleados');

    const empleados = await respuesta.json();
    selectResponsable.innerHTML = '<option value="">-- Selecciona un responsable --</option>';

    empleados.forEach(empleado => {
      const nombreCompleto = `${empleado.name} ${empleado.last_name}`;
      const option = document.createElement('option');
      option.value = nombreCompleto;
      option.textContent = nombreCompleto;
      selectResponsable.appendChild(option);
    });
    console.log('Responsables cargados desde Aiven');
  } catch (error) {
    console.error('Error al llenar responsables:', error);
  }
}

async function cargarProyectosDesdeNube() {
  const selectProyecto = document.getElementById('proyecto');
  if (!selectProyecto) return;

  try { 
    const respuesta = await fetch('https://modisa.onrender.com/api/proyectos');
    if (!respuesta.ok) throw new Error('Error al obtener los proyectos');

    const proyectos = await respuesta.json();

    selectProyecto.innerHTML = '<option value="">-- Selecciona un proyecto --</option>';

    proyectos.forEach(p => {
      const option = document.createElement('option');
      option.value = p.project_name;
      option.textContent = p.project_name;
      selectProyecto.appendChild(option);
    });
    
    console.log('¡Proyectos cargados con éxito desde la tabla projects!');
  } catch (error) {
    console.error('Error al rellenar el select de proyectos:', error);
  }
}

const botonAgregar = document.getElementById('agregar');

if (botonAgregar) {
  botonAgregar.addEventListener('click', function(event) {
  const actividad = document.getElementById('actividad').value.trim();
  const responsable = document.getElementById('responsable').value;
  const proyecto = document.getElementById('proyecto').value;
  const fecha = document.getElementById('fecha').value;

  if(!actividad || !responsable || !proyecto || !fecha) {
    alert('Por favor, añade los campos antes de guardar la actividad');
    return;
  }

  const fechaFormateada = new Date(fecha + 'T00:00:00');
  const semanaFiscalCalculada = obtenerNumeroSemana(fechaFormateada);

  const actividadNueva = {
    id: 'id_' + Math.random().toString(36).substr(2, 9),
    proyecto: proyecto,
    titulo: actividad.substring(0, 50), 
    responsable: responsable,
    semana: semanaFiscalCalculada,
    fecha: fecha,
    descripcion: actividad,
    estado: 'pendiente',
    comentarioDirector: ''
  };

  actividadesAcumuladas.push(actividadNueva);
  alert('Actividad registrada temporalmente');

  document.getElementById('actividad').value = '';
  document.getElementById('responsable').value = '';
  document.getElementById('fecha').value='';
  document.getElementById('actividad').focus();
  });
}

document.querySelector('form').addEventListener('submit', function(event) {event.preventDefault();
  
  const actividadFlotante = document.getElementById('actividad').value.trim();
  const responsableFlotante = document.getElementById('responsable').value;
  const proyectoFlotante = document.getElementById('proyecto').value;
  const fechaFlotante = document.getElementById('fecha').value;

  if (actividadesAcumuladas.length === 0){
    if(actividadFlotante && responsableFlotante && proyectoFlotante && fechaFlotante) { // Si los campos flotantes no están vacíos
      const fechaFormateada = new Date(fechaFlotante + 'T00:00:00');
      const semanaFiscal = obtenerNumeroSemana(fechaFormateada);

      const ultimaActividad = {
        id:'id_' + Math.random().toString(36).substr(2,9),
        proyecto : proyectoFlotante,
        titulo: actividadFlotante.substring(0,50),
        responsable : responsableFlotante,
        semana: semanaFiscal,
        fecha : fechaFlotante,
        descripcion: actividadFlotante,
        estado: 'pendiente',
        comentarioDirector:''
      };
      actividadesAcumuladas.push(ultimaActividad);
    }
  }    

  if(actividadesAcumuladas.length === 0) { 
    alert('Por favor, agrega al menos una actividad');
    return;
  }

  const actividadesParaPDF = [...actividadesAcumuladas];

  ejecutarGeneracionPDF(actividadesParaPDF);
  procesarEnvioNube(actividadesParaPDF);
});

function ejecutarGeneracionPDF(actividadesParaPDF) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();

  const semanaFiscalCalculada = actividadesParaPDF[0].semana;
  const proyectoBase = actividadesParaPDF[0].proyecto;
  const proyectoSinEspacios = proyectoBase.replace(/ /g,'_');

  const fechaHoy= new Date();
  const primeraFechaAnio = new Date(fechaHoy.getFullYear(), 0, 1);
  const diasPasados = Math.floor((fechaHoy - primeraFechaAnio) / (1000 * 60 * 60 * 24));
  const semanaFiscalHoy = Math.ceil((diasPasados + primeraFechaAnio.getDay() + 1) / 7);

  const rutaLogoLocal = 'img/logo-negro.png';
  const img = new Image();

  function procesarEstructuraPDF() {
    doc.addImage(img, 'PNG', 15, 12, 40, 12);
    doc.setTextColor(6, 18, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Minuta_${proyectoSinEspacios}_Semana:${semanaFiscalHoy}`, 75, 22);
    doc.setDrawColor(203,213,225);
    doc.setLineWidth(0.5);
    doc.line(15,38,195,38);

    armarCuerpoPDF(doc, actividadesParaPDF);
    doc.save(`Minuta_${proyectoSinEspacios}_semana_${semanaFiscalHoy}.pdf`);
  }

  img.onload = function() {
    procesarEstructuraPDF();
  };

  img.onerror = function() {
    console.warn("Logo no encontrado. Se genera PDF son Logo");
    procesarEstructuraPDF();
  };

  img.src = rutaLogoLocal;
}

function armarCuerpoPDF(doc, listaDeActividades) {
  doc.setTextColor(51, 65, 85);
  let coordenadaY = 55;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen de Actividades Asignadas", 15, coordenadaY);
  coordenadaY += 12;

  listaDeActividades.forEach(function(item, indice) {
    if (coordenadaY > 260) {
      doc.addPage();
      coordenadaY = 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Actividad ${indice + 1}:`, 15, coordenadaY);

    doc.setFont("helvetica", "normal");
    doc.text(`Proyecto: ${item.proyecto} | Responsable: ${item.responsable} | Límite: ${item.fecha}`, 42, coordenadaY);

    coordenadaY +=6;

    const textoAjustado = doc.splitTextToSize(`Descripción: ${item.descripcion}`,175); // posible error*-*-*-**-*-*-*-*-*-**-*-*-*-*-*
    doc.text(textoAjustado,15,coordenadaY);
    coordenadaY += (textoAjustado.length * 5) + 10;

    doc.setDrawColor(226,232,240);
    doc.line(15, coordenadaY - 5, 195, coordenadaY-5);
  });
}

async function procesarEnvioNube(listaDeActividades) {
  try {
    const respuesta = await fetch('https://modisa.onrender.com/api/minutas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(listaDeActividades)
    });

    if (!respuesta.ok) {
      throw new Error('Error en la respuesta del servidor');
    }

    const resultado = await respuesta.json();
    console.log('Respuesta del servidor:', resultado);

    actividadesAcumuladas = [];

    const formulario = document.querySelector('form');
    if (formulario) formulario.reset();

    document.getElementById('actividad').focus();
    alert('¡Minuta guardada con éxito en la nube!');
  } catch (error) {
    console.error('Error al conectar el backend:', error);
    alert('❌ Error al conectar con la base de datos. Se generó PDF local de respaldo');
  }
}

function configurarBotonGuardarAlterno(){
  const botonGuardar = document.getElementById('guardar') || document.getElementById('guardarMinuta');
  if (botonGuardar) {
    botonGuardar.addEventListener('click',(evento) => {
      evento.preventDefault();
      document.querySelector('form').dispatchEvent(new Event('submit'));
    });
  }
}

function obtenerNumeroSemana(fecha){
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dianNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dianNum);
  const anioInicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - anioInicio) / 86400000) + 1) / 7);
}