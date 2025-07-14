const express = require('express')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const router = express.Router()

// POST /api/price/estimate → call Python model
router.post('/estimate', (req, res) => {
  const { location, area, bedrooms, bathrooms } = req.body
  const scriptPath = path.resolve(__dirname, '../estimator/main.py')
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3'

  console.log('📤 Incoming request:')
  console.log('  Location:', location)
  console.log('  Area:', area)
  console.log('  Bedrooms:', bedrooms)
  console.log('  Bathrooms:', bathrooms)

  const py = spawn(pythonPath, [scriptPath, location, area, bedrooms, bathrooms])

  let result = ''

  py.stdout.on('data', (data) => {
    const text = data.toString()
    console.log('🟢 PYTHON STDOUT:', text)
    result += text
  })

  py.stderr.on('data', (data) => {
    console.error('🔴 PYTHON STDERR:', data.toString())
  })

  py.on('close', (code) => {
    console.log('⚙️ PYTHON PROCESS EXITED WITH CODE:', code)

    if (code !== 0) {
      return res.status(500).json({ error: 'Python process failed' })
    }

    const price = parseFloat(result)
    console.log('📈 Parsed price:', price)

    if (isNaN(price)) {
      return res.status(500).json({ error: 'Invalid prediction output' })
    }

    res.json({ price })
  })
})

// GET /api/price/locations → return unique locations
router.get('/locations', (req, res) => {
  try {
    const basicsPath = path.resolve(__dirname, '../../server/data/property_basics.json')
    const raw = fs.readFileSync(basicsPath, 'utf-8')
    const data = JSON.parse(raw)

    const locations = data.map(item => item.location).filter(Boolean)
    const uniqueLocations = [...new Set(locations)].sort()

    res.json(uniqueLocations)
  } catch (err) {
    console.error('Error reading locations:', err)
    res.status(500).json({ error: 'Failed to fetch locations' })
  }
})

module.exports = router
