const mysql = require('mysql2/promise');

// Creamos el Pool fuera del handler para que se mantenga vivo
// entre distintas peticiones que lleguen a la misma instancia de Vercel.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 1, // <--- AQUÍ ESTÁ EL EMBUDO: Solo una conexión activa a la DB
  queueLimit: 0       // Sin límite de cola (los usuarios esperan su turno)
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, params, secret } = req.body;

  // Verificación de seguridad básica
  if (secret !== process.env.API_PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    // pool.execute maneja automáticamente: pedir conexión, ejecutar y devolverla al pool
    const [rows] = await pool.execute(query, params || []);

    // Devolvemos las filas en un formato consistente
    res.status(200).json({ rows: Array.isArray(rows) ? rows : [] });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: error.message });
  }
  // IMPORTANTE: Ya no necesitamos cerrar la conexión manualmente (connection.end) 
  // porque el pool la mantiene abierta para el siguiente usuario.
};
