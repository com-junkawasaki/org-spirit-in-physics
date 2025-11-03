'use client';

import React, { useState } from 'react';
import { Button } from "scripts/src/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "scripts/src/components/ui/card";
import { Checkbox } from "scripts/src/components/ui/checkbox";
import { Input } from "scripts/src/components/ui/input";
import { Label } from "scripts/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "scripts/src/components/ui/select";
import ResearchPlanContent from './ResearchPlanContent';
import { DemographicData } from '../../src/shared/schemas/participant';

interface ConsentFormProps {
  onConsent: (participantId: string, signature: string, agreements: any, demographicData?: DemographicData) => void;
  participantId: string;
  consentVersion?: string;
  studyId?: string;
}

const ConsentForm = ({ 
  onConsent, 
  participantId,
  consentVersion = "1.0",
  studyId = "SPIRIT-IN-PHYSICS-2025"
}: ConsentFormProps) => {
  const [agreements, setAgreements] = useState({
    understand: false,
    voluntary: false,
    withdraw: false,
    recording: false,
  });
  const [signature, setSignature] = useState('');
  const [showFullConsent, setShowFullConsent] = useState(false);
  const [demographicData, setDemographicData] = useState<DemographicData>({
    ageGroup: 'prefer-not-to-say',
    gender: 'prefer-not-to-say',
    ethnicity: 'prefer-not-to-say',
    income: 'prefer-not-to-say',
  });

  const handleAgreementChange = (name: keyof typeof agreements) => (checked: boolean) => {
    setAgreements((prev) => ({ ...prev, [name]: checked }));
  };

  const handleDemographicChange = (field: keyof DemographicData, value: string) => {
    setDemographicData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const isAllAgreed = Object.values(agreements).every(Boolean) && signature.trim() !== '';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isAllAgreed) {
      onConsent(participantId, signature, agreements, demographicData);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>研究参加への同意</CardTitle>
        <CardDescription>
          研究計画書をよくお読みの上、各項目に同意いただけましたら署名をお願いします。
          <br />
          <span className="text-xs text-muted-foreground mt-2 block">
            This consent process complies with ICH-GCP (International Conference on Harmonisation - Good Clinical Practice) standards.
            <br />
            IRB Approval number: Niigata University 2024-0269 | Approval date: March 1, 2025
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Research Plan Content - Collapsible */}
          <div>
            <button
              type="button"
              onClick={() => setShowFullConsent(!showFullConsent)}
              className="text-blue-600 dark:text-blue-400 hover:underline mb-3 text-sm font-medium"
            >
              {showFullConsent ? '研究計画書を閉じる' : '研究計画書を読む'}
            </button>
            {showFullConsent && (
              <div className="border rounded-md p-4 max-h-[50vh] overflow-y-auto mb-6 bg-gray-50/50 dark:bg-gray-900/50">
                <ResearchPlanContent />
              </div>
            )}
          </div>

          {/* Demographic Information Section */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border">
            <h3 className="font-bold mb-3 text-sm">デモグラフィック情報（CDISC標準）</h3>
            <p className="text-xs text-muted-foreground mb-4">
              この情報は研究参加者の理解を深めるために役立ちます。すべての回答は匿名で任意です。
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="ageGroup" className="block mb-2 text-sm">年齢層</Label>
                <Select 
                  value={demographicData.ageGroup} 
                  onValueChange={(value: string) => handleDemographicChange("ageGroup", value)}
                >
                  <SelectTrigger id="ageGroup" className="w-full">
                    <SelectValue placeholder="年齢層を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prefer-not-to-say">回答を控える</SelectItem>
                    <SelectItem value="18-24">18-24歳</SelectItem>
                    <SelectItem value="25-34">25-34歳</SelectItem>
                    <SelectItem value="35-44">35-44歳</SelectItem>
                    <SelectItem value="45-54">45-54歳</SelectItem>
                    <SelectItem value="55-64">55-64歳</SelectItem>
                    <SelectItem value="65+">65歳以上</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="block mb-2 text-sm">性別</Label>
                <div className="flex flex-col space-y-2">
                  {[
                    { value: "male", label: "男性" },
                    { value: "female", label: "女性" },
                    { value: "non-binary", label: "ノンバイナリー" },
                    { value: "prefer-not-to-say", label: "回答を控える" }
                  ].map((option) => (
                    <div 
                      key={option.value}
                      className={`
                        border rounded-md p-2 cursor-pointer transition-all
                        ${demographicData.gender === option.value 
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 shadow-sm' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600'}
                      `}
                      onClick={() => handleDemographicChange("gender", option.value)}
                    >
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          id={`gender-${option.value}`}
                          name="gender"
                          value={option.value}
                          checked={demographicData.gender === option.value}
                          onChange={() => {}}
                          className="h-4 w-4"
                          aria-label={`性別: ${option.label}`}
                        />
                        <Label 
                          htmlFor={`gender-${option.value}`} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          {option.label}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="ethnicity" className="block mb-2 text-sm">人種・民族</Label>
                <Select 
                  value={demographicData.ethnicity} 
                  onValueChange={(value: string) => handleDemographicChange("ethnicity", value)}
                >
                  <SelectTrigger id="ethnicity" className="w-full">
                    <SelectValue placeholder="人種・民族を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prefer-not-to-say">回答を控える</SelectItem>
                    <SelectItem value="asian">アジア系</SelectItem>
                    <SelectItem value="black">黒人またはアフリカ系アメリカ人</SelectItem>
                    <SelectItem value="hispanic">ヒスパニックまたはラテン系</SelectItem>
                    <SelectItem value="native">アメリカ先住民またはアラスカ先住民</SelectItem>
                    <SelectItem value="pacific">ハワイ先住民または太平洋諸島民</SelectItem>
                    <SelectItem value="white">白人</SelectItem>
                    <SelectItem value="multiple">複数</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="income" className="block mb-2 text-sm">年間収入</Label>
                <Select 
                  value={demographicData.income} 
                  onValueChange={(value: string) => handleDemographicChange("income", value)}
                >
                  <SelectTrigger id="income" className="w-full">
                    <SelectValue placeholder="年間収入を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prefer-not-to-say">回答を控える</SelectItem>
                    <SelectItem value="under-25k">25,000ドル未満</SelectItem>
                    <SelectItem value="25k-50k">25,000ドル - 50,000ドル</SelectItem>
                    <SelectItem value="50k-75k">50,000ドル - 75,000ドル</SelectItem>
                    <SelectItem value="75k-100k">75,000ドル - 100,000ドル</SelectItem>
                    <SelectItem value="100k-150k">100,000ドル - 150,000ドル</SelectItem>
                    <SelectItem value="over-150k">150,000ドル以上</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Consent Agreements */}
          <form onSubmit={handleSubmit} id="consent-form">
            <div className="space-y-4">
              <div className="flex items-start space-x-3 cursor-pointer">
                <Checkbox id="understand" checked={agreements.understand} onCheckedChange={handleAgreementChange('understand')} className="mt-1" />
                <Label htmlFor="understand" className="flex-1 cursor-pointer">研究の性質と目的を理解しました。</Label>
              </div>  
              <div className="flex items-start space-x-3 cursor-pointer">
                <Checkbox id="voluntary" checked={agreements.voluntary} onCheckedChange={handleAgreementChange('voluntary')} className="mt-1" />
                <Label htmlFor="voluntary" className="flex-1 cursor-pointer">自身の自由意思に基づき、研究に任意で参加することに同意します。</Label>
              </div>
              <div className="flex items-start space-x-3 cursor-pointer">
                <Checkbox id="withdraw" checked={agreements.withdraw} onCheckedChange={handleAgreementChange('withdraw')} className="mt-1" />
                <Label htmlFor="withdraw" className="flex-1 cursor-pointer">いつでも同意を撤回し、研究への参加を中止できることを理解しました。</Label>
              </div>
              <div className="flex items-start space-x-3 cursor-pointer">
                <Checkbox id="recording" checked={agreements.recording} onCheckedChange={handleAgreementChange('recording')} className="mt-1" />
                <Label htmlFor="recording" className="flex-1 cursor-pointer">実験中の音声および映像の記録に同意します。</Label>
              </div>
            </div>
            <div className="mt-8">
              <Label htmlFor="signature" className="font-bold text-lg">電子署名</Label>
              <Input
                type="text"
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="氏名を入力してください"
                className="mt-2 text-base p-3"
              />
            </div>
          </form>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          form="consent-form"
          disabled={!isAllAgreed}
          className="w-full text-lg py-6"
        >
          同意して実験を開始する
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ConsentForm;
