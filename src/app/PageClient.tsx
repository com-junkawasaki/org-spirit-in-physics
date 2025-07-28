"use client";

import { useState } from 'react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { JUNG_STIMULUS_WORDS } from "@/components/jung-word-assessment/JungWordTest";
import KawasakiModel from "@/components/kawasaki-model";
import SpiritInPhysicsInteractive from "@/components/spirit-in-physics/SpiritInPhysicsInteractive";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';

function ConsentModal({ onConsent }: { onConsent: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Research Participation Consent Form</CardTitle>
          <CardDescription>
            Please read the following information carefully before proceeding.
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none max-h-[50vh] overflow-y-auto">
          <h4>Purpose of the Research</h4>
          <p>
            This study aims to explore the structure of the human spirit by analyzing responses to psychological tests. Your data will contribute to the development of the "Spirit in Physics" model.
          </p>
          <h4>Procedures</h4>
          <p>
            You will be asked to participate in a series of tasks, including a word association test and a voice response test. Your reaction times and vocal characteristics will be recorded and analyzed.
          </p>
          <h4>Confidentiality</h4>
          <p>
            All data collected will be anonymized. Your personal information will not be linked to your responses. The aggregated, anonymized data may be used in academic publications and presentations.
          </p>
          <h4>Voluntary Participation</h4>
          <p>
            Your participation is entirely voluntary. You may withdraw from the study at any time without penalty.
          </p>
          <h4>Contact Information</h4>
          <p>
            If you have any questions about this research, please contact Jun Kawasaki at root@junkawasaki.com.
          </p>
        </CardContent>
        <div className="p-6 border-t">
          <Button onClick={onConsent} className="w-full">
            I have read and understood this information, and I consent to participate.
          </Button>
        </div>
      </Card>
    </div>
  );
}


export default function PageClient() {
  const [hasConsented, setHasConsented] = useState(false);

  if (!hasConsented) {
    return <ConsentModal onConsent={() => setHasConsented(true)} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Spirit in Physics</h1>
        <p className="mt-2 text-muted-foreground">
          Structuring and Quantifying Human Spirit Using the Informational Vector Space
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          <strong>Authors:</strong> Jun Kawasaki, Kazuki Tainaka, Tomonori Takeuchi
        </p>
      </header>

      <Tabs defaultValue="research" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="model">Interactive Model</TabsTrigger>
          <TabsTrigger value="test">Jung's Test</TabsTrigger>
        </TabsList>
        
        <TabsContent value="research" className="py-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Introduction</CardTitle>
                <CardDescription>
                  Affiliation: Graduate School of Medical and Dental Sciences, Niigata University, Brain Research Institute, Niigata University, Japan, Department of Biomedicine, Aarhus University, Denmark
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-lg max-w-none">
                <p>This research proposes a framework to structure and quantify the human "spirit" by conceptualizing it within an informational vector space, grounded in physical laws.</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hypothesis 1: Information is Physics</CardTitle>
                </CardHeader>
                <CardContent className="prose max-w-none">
                  <p>Information is inherently physical—it obeys the laws of thermodynamics and directly influences energy exchange. Experimental validations of Landauer's principle (Bérut et al., 2012) reinforce that computation and energy are fundamentally intertwined.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hypothesis 2: Self-expansiveness into information space</CardTitle>
                </CardHeader>
                <CardContent className="prose max-w-none">
                  <p>Based on the rubber hand illusion (Botvinick & Cohen, 1998), self-boundaries are not fixed but can extend to incorporate external objects. We assume that the neural mechanisms underlying multisensory integration provide a measurable basis for transforming physical self-perception into an expansive, information-rich state that underpins Spirit.</p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Conclusion: Self-expansiveness is Spirit</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p>Self-expansiveness plays a key role in shaping personal, physiological, and societal phenomena. The Kawasaki Model proves that the spirit can be structured, measured, and quantified as dynamic physical information.</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>References</CardTitle>
              </CardHeader>
              <CardContent className="prose text-sm max-w-none">
                <ol className="list-decimal pl-5">
                  <li>Landauer, R. (1991). Information is physical. Physics Today, 44(5), 23–29.</li>
                  <li>Bérut, A., Arakelyan, A., Petrosyan, A., Ciliberto, S., Dillenschneider, R., & Lutz, E. (2012). Experimental verification of Landauer's principle linking information and thermodynamics. Nature, 483(7388), 187–189.</li>
                  <li>Botvinick, M., & Cohen, J. (1998). Rubber-hand illusion. Nature, 391, 756.</li>
                  <li>Toyabe, S., Sagawa, T., Ueda, M., Muneyuki, E., & Sano, M. (2010). Experimental demonstration of information-to-energy conversion and validation of the generalized Jarzynski equality. Nature Physics, 6, 988–992.</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="model" className="py-6">
          <Card>
            <CardHeader>
              <CardTitle>Spirit Physical Space (Kawasaki Model)</CardTitle>
              <CardDescription>An interactive visualization of the theoretical model.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="prose max-w-none">
                  <h4>Mathematical Model:</h4>
                  <BlockMath math="S = V, E, T" />
                  <BlockMath math="E = -\ln P(w_O | w_I),\; V = \{\vec{w_I}, \vec{w_O}, ...\},\; T = \text{time axis}." />

                  <h4>Physical Definition of Spirit:</h4>
                  <BlockMath math="\psi(S) = \frac{\delta E(S)}{\delta S}." />
                  <p className="text-xs">(Bérut et al., 2012)</p>
                </div>
                <div className="h-[60vh] w-full border rounded-lg overflow-hidden">
                  <KawasakiModel />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="test" className="py-6">
          <Card>
             <CardHeader>
                <CardTitle>Vectorization Spirit Using the Word Association Experiment (Jung, 1910)</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                 <BlockMath math="P(w_O | w_I) = \frac{\exp(\vec{w_I} \cdot \vec{w_O}) \cdot [r(w_I, w_O)]^{\alpha} \cdot \exp(\gamma \frac{\Delta SP(w_I,w_O)}{\lambda}) \cdot \exp(\eta F(w_I, w_O))}{\sum_{j} \exp(\vec{w_I} \cdot \vec{w_j}) \cdot [r(w_I, w_j)]^{\alpha} \cdot \exp(\gamma \frac{\Delta SP(w_I,w_j)}{\lambda}) \cdot \exp(\eta F(w_I, w_j))}" />
              </CardContent>
          </Card>
          
          <div className="mt-6">
            <SpiritInPhysicsInteractive />
          </div>
          
          <Card className="mt-6">
             <CardHeader>
                <CardTitle>Stimulus Words (100)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {JUNG_STIMULUS_WORDS.join(", ")}
                </div>
              </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Another Research / High-IQ Japanese GWAS: Explore IQ Genes</CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none">
          <p>Leveraging Japan's unique genetics, a GWAS targeting individuals with IQ ≥140 will compare genetic and cognitive data to identify SNPs linked to intelligence. The study begins in 2024 with results slated for publication.</p>
          <p><strong>Dataset:</strong> 92 people / CAMS IQ140 sd15 - IQ180t / SNPs.</p>
          <p><strong>ref:</strong> Jonathan R. I. Coleman et al, Mol Psychiatry 24, 182-197 (2019)</p>
        </CardContent>
      </Card>
      
    </div>
  );
} 