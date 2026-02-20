/* ============================================================
   Multi-AI Service — Gemini, Groq, Mistral, Cohere
   with Auto-routing per action type (Jovis)
   ============================================================ */

// ---- Provider Configurations ----
const PROVIDERS = {
    gemini: {
        name: 'Gemini',
        label: 'Google Gemini',
        color: '#4285f4',
        keyPrefix: 'tn_ai_gemini_',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        getKeyUrl: 'https://aistudio.google.com/apikey',
    },
    groq: {
        name: 'Groq',
        label: 'Groq (Llama 3.3)',
        color: '#f55036',
        keyPrefix: 'tn_ai_groq_',
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        getKeyUrl: 'https://console.groq.com/keys',
    },
    mistral: {
        name: 'Mistral',
        label: 'Mistral AI',
        color: '#ff7000',
        keyPrefix: 'tn_ai_mistral_',
        baseUrl: 'https://api.mistral.ai/v1/chat/completions',
        model: 'mistral-small-latest',
        getKeyUrl: 'https://console.mistral.ai/api-keys/',
    },
    cohere: {
        name: 'Cohere',
        label: 'Cohere',
        color: '#39594d',
        keyPrefix: 'tn_ai_cohere_',
        baseUrl: 'https://api.cohere.com/v2/chat',
        model: 'command-r',
        getKeyUrl: 'https://dashboard.cohere.com/api-keys',
    },
}

// ---- Auto-routing: which provider is best for which action ----
const AUTO_ROUTING = {
    summarize: ['gemini', 'groq', 'mistral', 'cohere'],
    expand: ['groq', 'gemini', 'mistral', 'cohere'],
    improve: ['mistral', 'gemini', 'groq', 'cohere'],
    todos: ['cohere', 'gemini', 'groq', 'mistral'],
    extract_todos: ['cohere', 'gemini', 'groq', 'mistral'],
    brainstorm: ['groq', 'gemini', 'mistral', 'cohere'],
    explain: ['gemini', 'groq', 'mistral', 'cohere'],
    meeting: ['gemini', 'groq', 'mistral', 'cohere'],
    chat: ['gemini', 'groq', 'mistral', 'cohere'],
}

// ---- Key Management ----
export function getProviderKey(providerId) {
    return localStorage.getItem(PROVIDERS[providerId]?.keyPrefix + 'key') || ''
}

export function setProviderKey(providerId, key) {
    localStorage.setItem(PROVIDERS[providerId]?.keyPrefix + 'key', key)
}

export function hasProviderKey(providerId) {
    return !!getProviderKey(providerId)
}

export function getConfiguredProviders() {
    return Object.keys(PROVIDERS).filter(id => hasProviderKey(id))
}

export function hasAnyAIKey() {
    return getConfiguredProviders().length > 0
}

// Legacy compat
export function getAIKey() {
    return getProviderKey('gemini')
}
export function setAIKey(key) {
    setProviderKey('gemini', key)
}
export function hasAIKey() {
    return hasAnyAIKey()
}

// ---- Preferred Provider ----
export function getPreferredProvider() {
    return localStorage.getItem('tn_ai_preferred') || 'auto'
}

export function setPreferredProvider(providerId) {
    localStorage.setItem('tn_ai_preferred', providerId)
}

// ---- Provider Info ----
export function getProviders() {
    return PROVIDERS
}

export function getProviderInfo(providerId) {
    return PROVIDERS[providerId]
}

// ---- Resolve which provider to use ----
function resolveProvider(actionId = 'chat') {
    const preferred = getPreferredProvider()

    if (preferred !== 'auto' && hasProviderKey(preferred)) {
        return preferred
    }

    // Auto-route: pick the best available provider for this action
    const priorityList = AUTO_ROUTING[actionId] || AUTO_ROUTING.chat
    for (const pid of priorityList) {
        if (hasProviderKey(pid)) return pid
    }

    throw new Error('No AI API keys configured. Go to Profile → AI Settings to add at least one.')
}

// ---- System Prompt ----
const SYSTEM_PROMPT = `You are an AI assistant integrated into Jovis, an intelligent workspace app.
You help users with their notes, to-do lists, meetings, and documents.
Be concise, helpful, and format your responses in markdown when appropriate.
When generating to-dos, output them as a simple bulleted list with "- [ ]" for each item.`

// ---- AI Actions ----
export const AI_ACTIONS = [
    { id: 'summarize', label: 'Summarize', icon: '📝', prompt: 'Summarize the following content concisely:' },
    { id: 'expand', label: 'Expand', icon: '📖', prompt: 'Expand on the following content with more detail and depth:' },
    { id: 'improve', label: 'Improve Writing', icon: '✨', prompt: 'Improve the writing quality, clarity, and flow of the following:' },
    { id: 'todos', label: 'Extract To-dos', icon: '☑️', prompt: 'Extract actionable to-do items from the following content:' },
    { id: 'brainstorm', label: 'Brainstorm', icon: '💡', prompt: 'Brainstorm creative ideas and suggestions based on:' },
    { id: 'explain', label: 'Explain Simply', icon: '🎯', prompt: 'Explain the following in simple, easy-to-understand terms:' },
]

// ---- Provider-specific API calls ----

async function callGemini(key, systemPrompt, userMessage) {
    const res = await fetch(`${PROVIDERS.gemini.baseUrl}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 400 || res.status === 403) throw new Error('Invalid Gemini API key.')
        throw new Error(err.error?.message || `Gemini error (${res.status})`)
    }
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callGroq(key, systemPrompt, userMessage) {
    const res = await fetch(PROVIDERS.groq.baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: PROVIDERS.groq.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.7,
            max_tokens: 2048,
        }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 401) throw new Error('Invalid Groq API key.')
        throw new Error(err.error?.message || `Groq error (${res.status})`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
}

async function callMistral(key, systemPrompt, userMessage) {
    const res = await fetch(PROVIDERS.mistral.baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: PROVIDERS.mistral.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.7,
            max_tokens: 2048,
        }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 401) throw new Error('Invalid Mistral API key.')
        throw new Error(err.error?.message || `Mistral error (${res.status})`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
}

async function callCohere(key, systemPrompt, userMessage) {
    const res = await fetch(PROVIDERS.cohere.baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: PROVIDERS.cohere.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.7,
            max_tokens: 2048,
        }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 401) throw new Error('Invalid Cohere API key.')
        throw new Error(err.error?.message || `Cohere error (${res.status})`)
    }
    const data = await res.json()
    return data.message?.content?.[0]?.text || ''
}

const PROVIDER_CALLERS = {
    gemini: callGemini,
    groq: callGroq,
    mistral: callMistral,
    cohere: callCohere,
}

// ---- Main API: askAI ----
export async function askAI(prompt, context = '', actionId = 'chat') {
    const providerId = resolveProvider(actionId)
    const key = getProviderKey(providerId)
    const caller = PROVIDER_CALLERS[providerId]

    if (!caller) throw new Error(`Unknown provider: ${providerId}`)

    const userMessage = context
        ? `Here is the content of my note:\n\n${context}\n\n${prompt}`
        : prompt

    const text = await caller(key, SYSTEM_PROMPT, userMessage)
    if (!text) throw new Error('Empty response from AI')

    return { text, provider: providerId, providerName: PROVIDERS[providerId].name }
}

// ---- Meeting Summarizer ----
const MEETING_SYSTEM_PROMPT = `You are a meeting assistant for Jovis.
Analyze the meeting transcript and produce a structured summary with these sections:

## Summary
A concise 2-3 paragraph summary of the meeting.

## Key Decisions
- List each decision made

## Action Items
- [ ] Each action item with assignee if mentioned

## Discussion Points
- Key topics discussed

Be thorough but concise. Use the exact headers shown above.`

export async function summarizeMeeting(transcript) {
    const providerId = resolveProvider('meeting')
    const key = getProviderKey(providerId)
    const caller = PROVIDER_CALLERS[providerId]
    if (!caller) throw new Error(`Unknown provider: ${providerId}`)

    const text = await caller(key, MEETING_SYSTEM_PROMPT, `Meeting Transcript:\n\n${transcript}`)
    if (!text) throw new Error('Empty response from AI')
    return { text, provider: providerId, providerName: PROVIDERS[providerId].name }
}

export { PROVIDERS }
