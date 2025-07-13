const express = require('express')
const router = express.Router()
const { Configuration, OpenAIApi } = require('openai')

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}))

router.post('/', async (req, res) => {
  const { prompt } = req.body

  try {
    const gptResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Extract location, bedrooms, and budget from user queries.' },
        { role: 'user', content: prompt }
      ]
    })

    const reply = gptResponse.data.choices[0].message.content
    const filters = JSON.parse(reply) 
    res.json({ filters })
  } catch (err) {
    console.error('OpenAI error:', err.message)
    res.status(500).json({ error: 'Failed to process prompt' })
  }
})

module.exports = router
