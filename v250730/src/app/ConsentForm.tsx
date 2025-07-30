"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function ResearchParticipationConsent({ onConsent }: { onConsent: () => void }) {
  const [isAgreed, setIsAgreed] = React.useState(false);

  return (
    <div className="not-prose my-12">
      <Card className="w-full max-w-2xl mx-auto bg-white/50 rounded-2xl shadow-md border border-gray-200">
        <CardHeader className="p-8 border-b">
          <CardTitle className="text-xl font-semibold text-gray-800">Research Participation Consent</CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            This Spirit in Physics study uses Jung's Word Association Test for research.
            The experiment consists of two sessions and is expected to take about 3 hours, with the possibility of extension.
            Participants will be compensated at a rate of 2,000 JPY per hour.
            Please read the following consent information before proceeding.
          </CardDescription>
          <Button variant="link" className="px-0 justify-start text-blue-600 hover:text-blue-800 text-sm">Read Full Consent Form</Button>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold text-gray-800 block mb-4">Demographic Information (CDISC Standards)</Label>
              <p className="text-sm text-gray-500 mb-6">
                This information helps us understand our research participants better. All responses are anonymous and optional.
              </p>
              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="age-group" className="font-medium text-gray-700">Age Group</Label>
                  <Select>
                    <SelectTrigger id="age-group" className="bg-white">
                      <SelectValue placeholder="Prefer not to say" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18-24">18-24</SelectItem>
                      <SelectItem value="25-34">25-34</SelectItem>
                      <SelectItem value="35-44">35-44</SelectItem>
                      <SelectItem value="45-54">45-54</SelectItem>
                      <SelectItem value="55+">55+</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="font-medium text-gray-700">Gender</Label>
                  <RadioGroup defaultValue="prefer-not-to-say" className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map(gender => (
                      <div key={gender} className="flex items-center space-x-2">
                        <RadioGroupItem value={gender.toLowerCase().replace(' ', '-')} id={gender.toLowerCase()} />
                        <Label htmlFor={gender.toLowerCase()} className="font-normal text-gray-700">{gender}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="race-ethnicity" className="font-medium text-gray-700">Race/Ethnicity</Label>
                  <Select>
                    <SelectTrigger id="race-ethnicity" className="bg-white">
                      <SelectValue placeholder="Prefer not to say" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asian">Asian</SelectItem>
                      <SelectItem value="black">Black or African American</SelectItem>
                      <SelectItem value="hispanic">Hispanic or Latino</SelectItem>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="annual-income" className="font-medium text-gray-700">Annual Income</Label>
                  <Select>
                    <SelectTrigger id="annual-income" className="bg-white">
                      <SelectValue placeholder="Prefer not to say" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<25k">&lt; $25,000</SelectItem>
                      <SelectItem value="25k-50k">$25,000 - $49,999</SelectItem>
                      <SelectItem value="50k-100k">$50,000 - $99,999</SelectItem>
                      <SelectItem value="100k+">&gt; $100,000</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3 pt-6 border-t">
              <Checkbox id="terms" checked={isAgreed} onCheckedChange={(checked) => setIsAgreed(checked === true)} className="mt-1" />
              <label
                htmlFor="terms"
                className="text-sm text-gray-600 leading-relaxed"
              >
                I have read and understood the information about this research, including the purpose, methods, duration (approx. 3 hours, potentially longer), and compensation (2,000 JPY/hour). I have had the opportunity to ask questions and have received satisfactory answers. I voluntarily agree to participate and understand that I can withdraw at any time without penalty.
              </label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-4 pt-6 bg-gray-50 p-8 border-t">
          <Button className="w-full text-base py-3" disabled={!isAgreed} onClick={onConsent}>Consent and Continue</Button>
          <p className="text-xs text-gray-500 text-center">
            This consent process complies with ICH-GCP (International Conference on Harmonisation - Good Clinical Practice) standards.
            <br />
            IRB Approval number: Niigata University 2024-0269 | Approval date: June 20, 2025
          </p>
        </CardFooter>
      </Card>
    </div>
  )
} 