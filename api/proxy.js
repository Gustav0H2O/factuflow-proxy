const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, params, secret } = req.body;

  // Basic security check
  if (secret !== process.env.API_PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: false
      }
    });

    const [rows] = await connection.execute(query, params || {});
    
    // Return rows in a consistent format
    res.status(200).json({ rows: Array.isArray(rows) ? rows : [] });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};
