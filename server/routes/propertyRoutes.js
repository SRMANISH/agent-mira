const express = require('express')
const router = express.Router()

const {
  searchProperties,
  saveProperty,
  getSavedProperties,
  deleteSavedProperty
} = require('../controllers/propertyController')

router.post('/search', searchProperties)
router.post('/save', saveProperty)
router.post('/filter', filterProperties); 
router.get('/saved', getSavedProperties)
router.delete('/delete/:id', deleteSavedProperty)

module.exports = router
