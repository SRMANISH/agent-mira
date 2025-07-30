const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const path = require('path')
const fs = require('fs')

dotenv.config()
const app = express()

app.use(express.json())
app.use(cors())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api/price', require('./routes/price'))
app.use('/api/ask', require('./routes/ask'));


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err))

app.get('/api/filter', (req, res) => {
  const basics = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/property_basics.json')))
  const characteristics = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/property_characteristics.json')))
  const images = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/property_images.json')))

  const { location, maxPrice, bedrooms } = req.query

  const merged = basics.map(base => {
    const char = characteristics.find(c => c.id === base.id) || {}
    const img = images.find(i => i.id === base.id) || {}
    return { ...base, ...char, image_url: img.image_url || "" }
  })

  const filtered = merged.filter(p => {
    const matchesLocation = location ? p.location.toLowerCase().includes(location.toLowerCase()) : true
    const matchesPrice = maxPrice ? p.price <= parseInt(maxPrice) : true
    const matchesBedrooms = bedrooms ? p.bedrooms == parseInt(bedrooms) : true
    return matchesLocation && matchesPrice && matchesBedrooms
  })

  res.json(filtered)
})

app.post('/api/properties/search', (req, res) => {
  const basics = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/property_basics.json')))
  const characteristics = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/property_characteristics.json')))
  const images = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/property_images.json')))

  const { location, budget, bedrooms } = req.body

  const merged = basics.map(base => {
    const char = characteristics.find(c => c.id === base.id) || {}
    const img = images.find(i => i.id === base.id) || {}
    return { ...base, ...char, image_url: img.image_url || "" }
  })

  const filtered = merged.filter(p => {
    const matchesLocation = location ? p.location.toLowerCase().includes(location.toLowerCase()) : true
    const matchesPrice = budget ? p.price <= parseInt(budget) : true
    const matchesBedrooms = bedrooms ? p.bedrooms == parseInt(bedrooms) : true
    return matchesLocation && matchesPrice && matchesBedrooms
  })

  res.json(filtered)
})

app.use('/api/saved', require('./routes/saved'))


app.get('/', (req, res) => {
  res.send('Real Estate Chatbot Backend is running')
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`)
})
