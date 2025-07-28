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

export function ResearchParticipationConsent() {
  const [isAgreed, setIsAgreed] = React.useState(false);

  return (
    <Card className="w-full max-w-3xl mx-auto my-12 border-2 border-blue-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-blue-800">Research Participation Consent</CardTitle>
        <CardDescription>
          This Spirit in Physics (Jung's Word Association Embedding Test) is
          conducted for research purposes. Please read the following consent
          information before proceeding.
        </CardDescription>
        <Button variant="link" className="px-0 justify-start">Read Full Consent Form</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-lg font-semibold text-gray-800">Demographic Information (CDISC Standards)</Label>
          <p className="text-sm text-gray-600 mb-4">
            This information helps us understand our research participants better. All responses are anonymous and optional.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="age-group">Age Group</Label>
              <Select>
                <SelectTrigger id="age-group">
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
              <Label>Gender</Label>
              <RadioGroup defaultValue="prefer-not-to-say" className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non-binary" id="non-binary" />
                  <Label htmlFor="non-binary">Non-binary</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prefer-not-to-say" id="prefer-not-to-say" />
                  <Label htmlFor="prefer-not-to-say">Prefer not to say</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="race-ethnicity">Race/Ethnicity</Label>
              <Select>
                <SelectTrigger id="race-ethnicity">
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
              <Label htmlFor="annual-income">Annual Income</Label>
              <Select>
                <SelectTrigger id="annual-income">
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
        <div className="flex items-start space-x-3 mt-4">
          <Checkbox id="terms" checked={isAgreed} onCheckedChange={(checked) => setIsAgreed(checked === true)} className="mt-1" />
          <label
            htmlFor="terms"
            className="text-sm text-gray-700"
          >
            I have read and understood the above information. I have had the opportunity to ask questions and have received satisfactory answers to my questions. I voluntarily agree to participate in this research. I understand that I have the right to withdraw at any time.
          </label>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-4 pt-6 bg-gray-50 rounded-b-xl">
        <Button className="w-full md:w-1/2" disabled={!isAgreed}>Consent and Continue</Button>
        <p className="text-xs text-gray-500 text-center">
          This consent process complies with ICH-GCP (International Conference on Harmonisation - Good Clinical Practice) standards.
          <br />
          IRB Approval number: Niigata University 2024-0269 | Approval date: Marth 1, 2025
        </p>
      </CardFooter>
    </Card>
  )
} 