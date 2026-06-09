require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  uri:process.env.DB_URL || {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
      ca: fs.readFileSync(path.join(__dirname, 'ca.pem'))}
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/api/minutas', async(req, res) => {
  try{
    const [filas] = await pool.query('SELECT * FROM v_minutas');
    res.json(filas);
  } catch (error) {
    console.error('Error al obtener datos de Aiven:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para traer las minutas desde Aiven MySQL
app.post('/api/minutas', async (req, res) => {
  const minutas = req.body;
  const listaMinutas = Array.isArray(minutas) ? minutas : [minutas];

  try {
    const query = `
    INSERT INTO minutas (id, proyecto, responsable, semana, fecha, descripcion, estado, comentarioDirector)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      estado = values(estado),
      comentarioDirector = values(comentarioDirector),
      proyecto = values(proyecto),
      responsable = values(responsable),
      fecha = values(fecha),
      semana = values(semana),
      descripcion = values(descripcion);
    `;

    const promesas = listaMinutas.map(item => {
      const comentario = item.comentarioDirector || item.comentarioDirector || '';

      const fechaLimpia = item.fecha ? item.fecha.split('T')[0] : new Date().toISOString().split('T')[0];
      
      const fechaHoy = new Date();

      const primeraFechaAnio = new Date(fechaHoy.getFullYear(), 0, 1);
      const diasPasados = Math.floor((fechaHoy - primeraFechaAnio) / (1000 * 60 * 60 * 24));
      
      const semanaRegistroHoy = Math.ceil((diasPasados + primeraFechaAnio.getDay() + 1) / 7);
      
      return pool.query(query, [
        item.id,
        item.proyecto,
        item.responsable,
        semanaRegistroHoy,
        fechaLimpia,
        item.descripcion,
        item.estado,
        comentario
      ]);
    });
      
    await Promise.all(promesas);
    res.json({ mensaje: 'Minutas sincronizadas con éxito en Aiven' });
  } catch (error) {
    console.error('Error al guardar en Aiven:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name, last_name FROM employees ORDER BY name ASC;');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener empleados de Aiven:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT project_name FROM projects WHERE project_name IS NOT NULL ORDER BY project_name ASC;');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener proyectos de Aiven:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});