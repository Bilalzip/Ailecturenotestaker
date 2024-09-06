import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const SpeechToText = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(localStorage.getItem('transcript') || ''); // Load transcript from localStorage
  const [formattedNotes, setFormattedNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);

  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  const apiUrl = process.env.REACT_APP_API_URL;

  // Save transcript to localStorage whenever it updates
  useEffect(() => {
    localStorage.setItem('transcript', transcript);
  }, [transcript]);

  // Start recording
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Web Speech API is not supported in this browser.');
      return;
    }

    recognitionRef.current = new window.webkitSpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        }
      }
      setTranscript(prevTranscript => prevTranscript + finalTranscript); // Append to existing transcript
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    recognitionRef.current.start();
    setIsRecording(true);
  };

  // Stop recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  // Send transcription to OpenAI API
  const generateNotes = async () => {
    setLoading(true);
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes lectures into concise and well-structured notes using bullet points, headings, examples, and emojis.',
        },
        {
          role: 'user',
          content: `
          Here is a transcription of a lecture:
          ${transcript}
          
          Can you create a summary with bullet points, headings, examples, and add emojis where appropriate?`,
        },
      ];
  
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages,
          max_tokens: 500,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      const notes = response.data.choices[0].message.content;
      setFormattedNotes(notes);
    } catch (error) {
      console.error('Error generating notes:', error);
      setFormattedNotes('There was an error generating the notes.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className='text-blue-500 text-bold'>Speech to Text Transcription</h2>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid black' }}>
        <strong>Transcription:</strong>
        <p>{transcript || 'Your transcription will appear here...'}</p>
      </div>

      <button
        onClick={generateNotes}
        disabled={!transcript || loading}
        style={{ marginTop: '10px' }}
      >
        {loading ? 'Generating Notes...' : 'Generate Notes'}
      </button>

      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid green' }}>
        <strong>Generated Notes:</strong>
        <p>{formattedNotes || 'Your notes will appear here...'}</p>
      </div>
    </div>
  );
};

export default SpeechToText;
