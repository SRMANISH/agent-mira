const fs = require('fs')
const path = require('path')

const mergeProperties = () => {
  const basics = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/property_basics.json')))
  const characteristics = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/property_characteristics.json')))
  const images = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/property_images.json')))

  return basics.map(base => {
    const char = characteristics.find(c => c.id === base.id) || {}
    const img = images.find(i => i.id === base.id) || {}
    return { ...base, ...char, image_url: img.image_url || "" }
  })
}

const filterProperties = (all, filters) => {
  const { location, maxPrice, bedrooms } = filters
  const exact = all.filter(p =>
    (!location || p.location.toLowerCase().includes(location.toLowerCase())) &&
    (!maxPrice || p.price <= maxPrice) &&
    (!bedrooms || p.bedrooms === bedrooms)
  )
  if (exact.length) return exact

  const twoMatch = all.filter(p => {
    const loc = location ? p.location.toLowerCase().includes(location.toLowerCase()) : false
    const price = maxPrice ? p.price <= maxPrice : false
    const beds = bedrooms ? p.bedrooms === bedrooms : false
    return (loc && price) || (loc && beds) || (price && beds)
  })
  if (twoMatch.length) return twoMatch

  const oneMatch = all.filter(p => {
    const loc = location ? p.location.toLowerCase().includes(location.toLowerCase()) : false
    const price = maxPrice ? p.price <= maxPrice : false
    const beds = bedrooms ? p.bedrooms === bedrooms : false
    return loc || price || beds
  })
  if (oneMatch.length) return oneMatch

  return all
}

module.exports = { mergeProperties, filterProperties }
