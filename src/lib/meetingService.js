/* ============================================================
   Meeting Service — Speech Recognition + Audio Recording
   Handles live transcription via SpeechRecognition
   and parallel audio capture via MediaRecorder
   ============================================================ */

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export function isSpeechSupported() {
    return !!SpeechRecognition
}

export function createMeetingRecorder({
    onTranscript,       // (text: string, isFinal: boolean) => void
    onStatusChange,     // (status: 'listening' | 'paused' | 'stopped' | 'error') => void
    onError,            // (error: string) => void
    language = 'en-US',
}) {
    if (!SpeechRecognition) {
        return {
            start: () => onError?.('Speech recognition is not supported in this browser.'),
            stop: () => { },
            pause: () => { },
            resume: () => { },
            isListening: () => false,
            getTranscript: () => '',
            getAudioBlob: () => null,
        }
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language
    recognition.maxAlternatives = 1

    let isActive = false
    let isPaused = false
    let fullTranscript = ''

    // Audio recording via MediaRecorder
    let mediaRecorder = null
    let audioChunks = []
    let audioStream = null
    let audioBlob = null

    recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
                const text = result[0].transcript.trim()
                if (text) {
                    fullTranscript += (fullTranscript ? ' ' : '') + text
                    onTranscript?.(fullTranscript, true)
                }
            } else {
                interim += result[0].transcript
            }
        }
        if (interim) {
            onTranscript?.(fullTranscript + ' ' + interim, false)
        }
    }

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') return
        if (event.error === 'aborted') return
        onError?.(`Speech error: ${event.error}`)
        onStatusChange?.('error')
    }

    recognition.onend = () => {
        if (isActive && !isPaused) {
            try { recognition.start() } catch { }
        } else if (!isActive) {
            onStatusChange?.('stopped')
        }
    }

    async function startAudioCapture() {
        try {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
            audioChunks = []
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm'
            mediaRecorder = new MediaRecorder(audioStream, { mimeType })
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data)
            }
            mediaRecorder.onstop = () => {
                audioBlob = new Blob(audioChunks, { type: mimeType })
            }
            mediaRecorder.start(1000) // capture in 1s chunks
        } catch (err) {
            console.warn('Audio recording not available:', err.message)
        }
    }

    function stopAudioCapture() {
        return new Promise((resolve) => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.onstop = () => {
                    const mimeType = mediaRecorder.mimeType || 'audio/webm'
                    audioBlob = new Blob(audioChunks, { type: mimeType })
                    audioStream?.getTracks().forEach(t => t.stop())
                    resolve(audioBlob)
                }
                mediaRecorder.stop()
            } else {
                resolve(null)
            }
        })
    }

    return {
        async start() {
            fullTranscript = ''
            audioBlob = null
            isActive = true
            isPaused = false
            try {
                recognition.start()
                onStatusChange?.('listening')
                await startAudioCapture()
            } catch (err) {
                onError?.('Could not start: ' + err.message)
            }
        },

        async stop() {
            isActive = false
            isPaused = false
            recognition.stop()
            const blob = await stopAudioCapture()
            onStatusChange?.('stopped')
            return { transcript: fullTranscript, audioBlob: blob }
        },

        pause() {
            isPaused = true
            recognition.stop()
            if (mediaRecorder?.state === 'recording') mediaRecorder.pause()
            onStatusChange?.('paused')
        },

        resume() {
            isPaused = false
            try {
                recognition.start()
                if (mediaRecorder?.state === 'paused') mediaRecorder.resume()
                onStatusChange?.('listening')
            } catch { }
        },

        isListening: () => isActive && !isPaused,

        getTranscript: () => fullTranscript,

        getAudioBlob: () => audioBlob,
    }
}
