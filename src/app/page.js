'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';

export default function Home() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [docId, setDocId] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();
  const fileInputRef = useRef(null);

  const onFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setFilename(selectedFile.name);
      setError('');
    } else {
      setFile(null);
      setFilename('');
      setError('Please select a PDF file');
    }
  };

  const processPDF = async () => {
    if (!file) return;

    setProcessing(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process PDF');
      }

      setDocId(result.docId);
      setProcessed(true);
    } catch (err) {
      setError(err.message);
      console.error("Error:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError('');
    setAnswer('');

    try {
      const endpoint = processed ? '/api/chat' : '/api/gemini';
      const body = processed
        ? JSON.stringify({ question, docId })
        : JSON.stringify({ question });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get answer');
      }

      setAnswer(result.answer);
    } catch (err) {
      setError(err.message);
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFilename('');
    setProcessed(false);
    setQuestion('');
    setAnswer('');
    setDocId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-gray-50">
      <h1 className="text-3xl font-bold my-8 text-center text-black">PDF QA Chatbot</h1>
      <p className="mb-8 text-gray-600 max-w-xl text-center">
        Upload a PDF, then ask questions based on it. Or just ask anything without uploading!
      </p>

      {/* PDF Upload Section */}
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl text-black font-semibold mb-4">Upload PDF Document</h2>

        {!processed ? (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              accept="application/pdf"
              className="mb-4 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />

            {filename && <p className="mb-4 text-sm text-gray-600">Selected file: {filename}</p>}

            <button
              onClick={processPDF}
              disabled={!file || processing}
              className={`w-full py-2 px-4 rounded-md ${!file || processing
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {processing ? 'Processing...' : 'Process PDF'}
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-green-50 text-green-800 rounded-md p-4 mb-4 w-full">
              <p className="font-medium">PDF processed successfully!</p>
              <p className="text-sm">File: {filename}</p>
            </div>

            <button
              onClick={resetForm}
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Upload a different PDF
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-red-600 text-sm">{error}</p>
        )}
      </div>

      {/* Question Input Section */}
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-6">
        {/* <h2 className="text-xl font-semibold mb-4 text-black">
          {processed ? 'Ask Questions About Your Document' : 'Ask Anything (No PDF Uploaded)'}
        </h2> */}

        <form onSubmit={handleQuestionSubmit} className="mb-6">
          <div className="mb-4">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
              Your Question
            </label>
            <input
              type="text"
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something..."
              className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className={`w-full py-2 px-4 rounded-md ${loading || !question.trim()
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {loading ? 'Thinking...' : 'Get Answer'}
          </button>
        </form>

        {answer && (
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-900 mb-2">Answer:</h3>
            <p className="text-gray-700 whitespace-pre-line">{answer}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full max-w-3xl mt-8 text-gray-500 text-sm text-center">
        <p>This chatbot uses LangChain with Gemini for processing.</p>
        <p>Built with Next.js and Tailwind CSS.</p>
      </div>
    </main>
  );
}
