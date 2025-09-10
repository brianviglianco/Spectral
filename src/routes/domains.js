const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Listar dominios del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const domains = await prisma.domain.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ domains });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener dominios' });
  }
});

// Agregar dominio
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { url, name } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL requerida' });
    }

    const domain = await prisma.domain.create({
      data: {
        url,
        name,
        userId: req.user.id
      }
    });

    res.status(201).json({ domain });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear dominio' });
  }
});

// Eliminar dominio
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.domain.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });
    res.json({ message: 'Dominio eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar dominio' });
  }
});

module.exports = router;