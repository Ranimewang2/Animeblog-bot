// api/dashboard.js - Serves the control panel dashboard HTML

import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  try {
    const html = readFileSync(join(process.cwd(), 'dashboard/index.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send('<h1>Dashboard not found</h1><p>' + e.message + '</p>');
  }
}
