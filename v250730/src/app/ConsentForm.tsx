'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ConsentForm = ({ onConsent, participantId }: { onConsent: (participantId: string, signature: string) => void, participantId: string }) => {
  const [consentText, setConsentText] = useState('');
  const [agreements, setAgreements] = useState({
    understand: false,
    voluntary: false,
    withdraw: false,
    recording: false,
  });
  const [signature, setSignature] = useState('');

  useEffect(() => {
    fetch('/docs/同意説明文書_Spirit-in-Physics_250620_ver2.0.md')
      .then((res) => res.text())
      .then((text) => setConsentText(text))
      .catch((err) => console.error('Error fetching consent form:', err));
  }, []);

  const handleAgreementChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setAgreements((prev) => ({ ...prev, [name]: checked }));
  };

  const isAllAgreed = Object.values(agreements).every(Boolean) && signature.trim() !== '';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isAllAgreed) {
      onConsent(participantId, signature);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">研究参加への同意</h1>
      <div className="prose border rounded-md p-4 h-96 overflow-y-scroll mb-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{consentText}</ReactMarkdown>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="space-y-2 mb-4">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="understand"
                checked={agreements.understand}
                onChange={handleAgreementChange}
                className="mr-2"
              />
              研究内容を理解しました。
            </label>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="voluntary"
                checked={agreements.voluntary}
                onChange={handleAgreementChange}
                className="mr-2"
              />
              自発的に研究に参加することに同意します。
            </label>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="withdraw"
                checked={agreements.withdraw}
                onChange={handleAgreementChange}
                className="mr-2"
              />
              いつでも同意を撤回できることを理解しました。
            </label>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="recording"
                checked={agreements.recording}
                onChange={handleAgreementChange}
                className="mr-2"
              />
              音声と映像の記録に同意します。
            </label>
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="signature" className="block font-bold mb-1">
            署名
          </label>
          <input
            type="text"
            id="signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="氏名を入力してください"
            className="w-full p-2 border rounded-md"
          />
        </div>
        <button
          type="submit"
          disabled={!isAllAgreed}
          className="w-full p-2 rounded-md bg-blue-500 text-white disabled:bg-gray-400"
        >
          同意して実験を開始する
        </button>
      </form>
    </div>
  );
};

export default ConsentForm; 