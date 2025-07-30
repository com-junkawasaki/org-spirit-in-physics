'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const handleAgreementChange = (name: keyof typeof agreements) => (checked: boolean) => {
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Research Participation Consent</CardTitle>
        <CardDescription>Please read the consent form carefully and agree to the terms to proceed.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert border rounded-md p-4 h-96 overflow-y-scroll mb-6 bg-gray-50/50 dark:bg-gray-900/50">
          <pre className="whitespace-pre-wrap font-sans text-sm">{consentText}</pre>
        </div>
        <form onSubmit={handleSubmit} id="consent-form">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="understand" checked={agreements.understand} onCheckedChange={handleAgreementChange('understand')} />
              <Label htmlFor="understand">I understand the nature and purpose of the research.</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="voluntary" checked={agreements.voluntary} onCheckedChange={handleAgreementChange('voluntary')} />
              <Label htmlFor="voluntary">I agree to participate voluntarily.</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="withdraw" checked={agreements.withdraw} onCheckedChange={handleAgreementChange('withdraw')} />
              <Label htmlFor="withdraw">I understand that I can withdraw at any time.</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="recording" checked={agreements.recording} onCheckedChange={handleAgreementChange('recording')} />
              <Label htmlFor="recording">I consent to the audio and video recording.</Label>
            </div>
          </div>
          <div className="mt-6">
            <Label htmlFor="signature" className="font-bold">Digital Signature</Label>
            <Input
              type="text"
              id="signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Please type your full name"
              className="mt-2"
            />
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          form="consent-form"
          disabled={!isAllAgreed}
          className="w-full"
        >
          Agree and Start Experiment
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ConsentForm; 