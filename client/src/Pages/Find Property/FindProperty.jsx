import { Send, RefreshCcw, Star, X } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
console.log("🔗 Backend URL:", BACKEND_URL)


const FindProperty = () => {
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Welcome! I can help you find a property.' }
  ])
  const [step, setStep] = useState(0)
  const [input, setInput] = useState('')
  const [filters, setFilters] = useState({ location: '', bedrooms: '', budget: '' })
  const [compare, setCompare] = useState(() => {
    const saved = localStorage.getItem('compareProperties')
    return saved ? JSON.parse(saved) : []
  })
  const [saving, setSaving] = useState(null)

  const [savedIds, setSavedIds] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [categorizedResults, setCategorizedResults] = useState({})
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  const getAllResults = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/properties/search`, {})
      return res.data
    } catch {
      return []
    }
  }

  const fetchSavedProperties = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/saved`)
      const savedPropertyIds = res.data.map(property => property.id)
      setSavedIds(savedPropertyIds)
    } catch (error) {
      console.error('Error fetching saved properties:', error)
    }
  }

  const callOpenAI = async (userInput) => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/ask`, {
        prompt: userInput.toLowerCase(),
        history: messages.slice(-10)
      })
      return res.data // { message, filters }
    } catch {
      return { message: 'Sorry, I could not process your request.', filters: {} }
    }
  }

  const handleUserInput = async () => {
    if (!input.trim()) return

    const normalized = input.trim().toLowerCase()
    if (normalized === 'all' || normalized === 'all properties') {
      const all = await getAllResults()
      setCategorizedResults({ all })
      setMessages(prev => [...prev, { from: 'user', text: input }])
      setStep(3)
      setInput('')
      return
    }

    setMessages(prev => [...prev, { from: 'user', text: input }])

    const aiResponse = await callOpenAI(input)
    const filtersFromAI = aiResponse.filters || {}
    const aiMessage = aiResponse.message || ''

    if (aiMessage) {
      setMessages(prev => [...prev, { from: 'bot', text: aiMessage }])
    }

    if (Object.keys(filtersFromAI).length > 0 && Object.values(filtersFromAI).some(Boolean)) {
      const combinedFilters = {
        location: filtersFromAI.location || filters.location,
        bedrooms: filtersFromAI.bedrooms || filters.bedrooms,
        budget: filtersFromAI.budget || filters.budget
      }

      setFilters(combinedFilters)
      await categorizeAndDisplay(combinedFilters)
      setStep(3)
      setInput('')
      return
    }

    const manualExtract = {
      location: input.match(/\b(?:in|at)\s+([a-z\s]+?)(?:\s|$)/i)?.[1]
        ?.replace(/\b(for|with|under|less than|budget|below)\b.*/i, '')
        ?.trim(),
      bedrooms: input.match(/(\d+)[- ]?bed/i)?.[1]?.trim(),
      budget: input.match(/(?:under|less than|below)\s?(\d+)/i)?.[1]?.trim()
    }

    if (Object.values(manualExtract).some(Boolean)) {
      const fallbackFilters = {
        location: manualExtract.location || filters.location,
        bedrooms: manualExtract.bedrooms || filters.bedrooms,
        budget: manualExtract.budget || filters.budget
      }

      setFilters(fallbackFilters)
      await categorizeAndDisplay(fallbackFilters)
      setStep(3)
      setInput('')
      return
    }

    let newFilters = { ...filters }

    if (step === 0) {
      newFilters.location = input
      setStep(1)
    } else if (step === 1) {
      newFilters.bedrooms = input
      setStep(2)
    } else if (step === 2) {
      newFilters.budget = input
      await categorizeAndDisplay(newFilters)
      setStep(3)
    }

    setFilters(newFilters)
    setInput('')
  }

  const parseFilterList = (value) => {
    if (!value) return [];
    return value.split(/[;,]/).map(v => v.trim()).filter(Boolean);
  };

  const categorizeAndDisplay = async ({ location, bedrooms, budget }) => {
    const all = await getAllResults();

    // Support multiple values for each filter
    const locList = parseFilterList(location?.toLowerCase());
    const bedList = parseFilterList(bedrooms);
    const budList = parseFilterList(budget);

    const cat1 = all.filter(p =>
      locList.length && bedList.length &&
      locList.some(loc => p.location.toLowerCase().includes(loc)) &&
      bedList.some(bed => parseInt(p.bedrooms) === parseInt(bed))
    );

    const cat2 = all.filter(p =>
      locList.length && locList.some(loc => p.location.toLowerCase().includes(loc))
    );

    const cat3 = all.filter(p =>
      bedList.length && bedList.some(bed => parseInt(p.bedrooms) === parseInt(bed))
    );

    const cat4 = all.filter(p =>
      budList.length && budList.some(bud => parseInt(p.price) <= parseInt(bud))
    );

    const allEmpty = cat1.length + cat2.length + cat3.length + cat4.length === 0;

    if (allEmpty) {
      const all = await getAllResults();
      setCategorizedResults({ all });
    } else {
      setCategorizedResults({
        'Location & Bedrooms': cat1,
        'Location Only': cat2,
        'Bedrooms Only': cat3,
        'Within Budget': cat4
      });
    }
  };

  const handleSave = async (property) => {
    const id = property.id
    setSaving(id)
    try {
      if (savedIds.includes(id)) {
        // Unsave
        await axios.delete(`${BACKEND_URL}/api/saved/${id}`)
        setSavedIds(prev => prev.filter(savedId => savedId !== id))
      } else {
        // Save
        await axios.post(`${BACKEND_URL}/api/saved`, { id })
        setSavedIds(prev => [...prev, id])
      }
    } catch (error) {
      console.error('Error saving/unsaving property:', error)
    } finally {
      setTimeout(() => setSaving(null), 600)
    }
  }

  const handleCompareToggle = (property) => {
    setCompare(prev =>
      prev.some(p => p.id === property.id)
        ? prev.filter(p => p.id !== property.id)
        : [...prev, property]
    )
  }

  const resetChat = () => {
    setMessages([
      { from: 'bot', text: 'Welcome! I can help you find a property.' }
    ])
    setStep(0)
    setFilters({ location: '', bedrooms: '', budget: '' })
    setCategorizedResults({})
    setCompare([])
    setInput('')
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, categorizedResults])

  useEffect(() => {
    localStorage.setItem('compareProperties', JSON.stringify(compare))
  }, [compare])

  useEffect(() => {
    fetchSavedProperties()
  }, [])



  return (
    <div className="p-4 md:p-6 flex flex-col items-center gap-6 min-h-screen page-body">
      <h1 className="text-3xl font-bold">Find Your Dream Property</h1>
      <div className="w-full max-w-2xl bg-base-100 shadow-xl rounded-lg flex flex-col h-[70vh] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-4 py-2 rounded-lg ${msg.from === 'user' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-black'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t p-3 flex gap-2 flex-wrap items-center">
          <input
            className="flex-grow input input-bordered max-w-[55%]"
            placeholder="Type your answer..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUserInput()}
          />
          <button onClick={handleUserInput} className="btn bg-blue-700 text-white hover:bg-blue-700"><Send size={18} /></button>
          <button onClick={resetChat} className="btn btn-neutral"><RefreshCcw size={18} /></button>
          <button
            className="btn btn-outline hover:bg-black hover:text-white"
            onClick={async () => {
              const all = await getAllResults()
              setCategorizedResults({ all })
              setStep(3)
              setMessages(prev => [...prev, { from: 'bot', text: `Showing all ${all.length} available properties.` }])
            }}
          >
            Show All Properties
          </button>
        </div>
      </div>

      {Object.keys(categorizedResults).length > 0 && (
        <div className="w-full max-w-4xl space-y-6 mt-6">
          {Object.entries(categorizedResults).map(([label, list]) => (
            <div key={label}>
              <h2 className="text-xl font-semibold mb-4">
                {label === 'all' ? 'All Properties' : label}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {list.map(p => (
                  <div key={p.id} className="card bg-base-100 shadow-md hover:shadow-xl transition">
                    <figure><img src={p.image_url} alt={p.title} className="w-full h-52 object-cover" /></figure>
                    <div className="card-body">
                      <h2 className="card-title">{p.title}</h2>
                      <p>{p.location}</p>
                      <p>₹{p.price.toLocaleString()}</p>
                      <p>{p.bedrooms} BHK | {p.bathrooms} Bath | {p.size_sqft} sqft</p>
                      <div className="flex items-center gap-2 mt-2">
                        <input type="checkbox" className="checkbox checkbox-sm" checked={compare.some(c => c.id === p.id)} onClick={e => e.stopPropagation()} onChange={() => handleCompareToggle(p)} />
                        <span className="text-sm">Compare</span>
                        <button
                          className={`btn btn-sm ml-auto ${saving === p.id ? 'btn-success animate-bounce' : savedIds.includes(p.id) ? 'btn-success' : 'btn-outline'}`}
                          onClick={e => { e.stopPropagation(); handleSave(p); }}
                        >
                          <Star size={16} /> {saving === p.id ? 'Saved' : savedIds.includes(p.id) ? 'Unsave' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {compare.length >= 2 && (
        <div className="fixed bottom-6 right-6 z-10">
          <button className="btn btn-accent shadow-lg" onClick={() => setShowModal(true)}>
            Compare {compare.length}
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="relative bg-white max-h-[90vh] overflow-y-auto w-full max-w-4xl p-6 rounded-lg">
            <button className="sticky top-2 right-2 float-right btn btn-sm btn-circle btn-error z-10" onClick={() => setShowModal(false)}>
              <X />
            </button>
            <h2 className="text-xl font-bold mb-4 clear-both">Compare Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {compare.map(p => (
                <div key={p.id} className="card bg-base-100 shadow-md">
                  <figure><img src={p.image_url} alt={p.title} className="w-full h-40 object-cover" /></figure>
                  <div className="card-body text-sm">
                    <h3 className="card-title text-base">{p.title}</h3>
                    <p>{p.location}</p>
                    <p>₹{p.price.toLocaleString()}</p>
                    <p>{p.bedrooms} BHK | {p.bathrooms} Bath | {p.size_sqft} sqft</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FindProperty
