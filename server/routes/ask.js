const express = require('express')
const router = express.Router()
const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const fs = require('fs');
const path = require('path');

router.post('/', async (req, res) => {
  const { prompt, history } = req.body

  // Load all properties for context
  let allProperties = [];
  try {
    allProperties = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/property_basics.json')));
  } catch {}

  // Format chat history for context
  let historyText = '';
  if (Array.isArray(history) && history.length > 0) {
    const lastHistory = history.slice(-10);
    historyText = lastHistory.map(m => `${m.from === 'user' ? 'User' : 'Bot'}: ${m.text}`).join('\n');
  }

  try {
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are a helpful real estate assistant. Here is a list of all available properties: ${JSON.stringify(allProperties)}.\nHere is the recent chat history:\n${historyText}\nFor every user query, reply conversationally to help them find a property, and also extract/infer from query location, bedrooms, and budget if mentioned. Always respond with a JSON object: { "message": "<your conversational reply>", "filters": { "location": "", "bedrooms": "", "budget": "" } }. Your values for the fields in filters should be based on the data provided and if multiple, make it comma separated. If a filter is not mentioned, leave it as an empty string.` },
        { role: 'user', content: prompt }
      ]
    })

    const reply = gptResponse.choices[0].message.content
    let message = ''
    let filters = { location: '', bedrooms: '', budget: '' }
    try {
      const parsed = JSON.parse(reply)
      message = parsed.message || ''
      filters = parsed.filters || filters
    } catch (e) {
      message = 'Sorry, I had trouble understanding. Could you rephrase?'
    }
    res.json({ message, filters })
  } catch (err) {
    console.error('OpenAI error:', err.message)
    res.status(500).json({ error: 'Failed to process prompt' })
  }
})

router.post('/compare-summary', async (req, res) => {
  const { properties } = req.body
  if (!Array.isArray(properties) || properties.length < 2) {
    return res.status(400).json({ error: 'At least two properties are required for comparison.' })
  }
  try {
    // Remove image_url and unrelated fields from each property for the prompt
    const filteredProps = properties.map(({ image_url, ...rest }) => rest)
    const propDescriptions = filteredProps.map((p, i) => `Property ${i + 1}: ${JSON.stringify(p)}`).join('\n')
    const prompt = `You are a real estate expert. Keep it under 200 words and as one single paragraph. Compare the following properties for a home buyer. Ignore image URLs and unrelated metadata. Focus on actionable recommendations based on the user's portfolio (budget, location, bedrooms, etc.). Present the comparison as a paragraph markdown recommendation for the user. Do not return JSON.\n${propDescriptions}`
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful real estate assistant. Given a list of property details, provide a concise, friendly, and helpful summary comparing them for a home buyer. Ignore image URLs and unrelated metadata. Focus on actionable recommendations based on the user portfolio (budget, location, bedrooms, etc.). Always respond in markdown, and follow the user instructions for format.' },
        { role: 'user', content: prompt }
      ]
    })
    const markdown = gptResponse.choices[0].message.content
    res.json({ markdown })
  } catch (err) {
    console.error('OpenAI error:', err.message)
    res.status(500).json({ error: 'Failed to generate comparison summary' })
  }
})

router.post('/property-description', async (req, res) => {
  const { property } = req.body
  if (!property) {
    return res.status(400).json({ error: 'Property object is required.' })
  }
  try {
    // Remove image_url and unrelated fields
    const { image_url, ...filtered } = property
    const prompt = `You are a real estate expert. Given the following property details, write a beautiful, engaging markdown description for a property listing. Then, provide a markdown bullet list of the types of buyers or renters this property is ideal for (e.g., families, young professionals, investors, etc.). Do not return JSON, only markdown.\nProperty: ${JSON.stringify(filtered)}`
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful real estate assistant. Given a property, write a beautiful markdown description and a bullet list of who it is ideal for. Do not return JSON.' },
        { role: 'user', content: prompt }
      ]
    })
    const markdown = gptResponse.choices[0].message.content
    res.json({ markdown })
  } catch (err) {
    console.error('OpenAI error:', err.message)
    res.status(500).json({ error: 'Failed to generate property description' })
  }
})

module.exports = router
