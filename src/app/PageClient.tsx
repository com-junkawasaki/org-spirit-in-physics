"use client";

import { useState } from 'react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { JUNG_STIMULUS_WORDS } from "@/components/jung-word-assessment/JungWordTest";
import KawasakiModel from "@/components/kawasaki-model";
import SpiritInPhysicsInteractive from "@/components/spirit-in-physics/SpiritInPhysicsInteractive";
import { ResearchParticipationConsent } from '@/components/ui/ResearchParticipationConsent';

export default function PageClient() {
  const [hasConsented, setHasConsented] = useState(false);

  const handleConsent = () => {
    setHasConsented(true);
  };

  return (
    <article className="prose lg:prose-xl mx-auto py-8">
      <h1>Spirit in Physics</h1>
      <p>
        <strong>Authors:</strong> Jun Kawasaki(root@junkawasaki.com), Kazuki Tainaka, Tomonori Takeuchi
        <br />
        <strong>Affiliation:</strong> Graduate School of Medical and Dental Sciences, Niigata University, Brain Research Institute, Niigata University, Japan, Department of Biomedicine, Aarhus University, Denmark
      </p>

      {!hasConsented && <ResearchParticipationConsent onConsent={handleConsent} />}

      {hasConsented && (
        <>
          <h2>Introduction: Structuring and Quantifying Human Spirit Using the Informational Vector Space</h2>

          <h3>Hypothesis 1</h3>
          <p><strong>Information is Physics:</strong> Information is inherently physical—it obeys the laws of thermodynamics and directly influences energy exchange. Experimental validations of Landauer's principle (Bérut et al., 2012) reinforce that computation and energy are fundamentally intertwined.</p>

          <h3>Hypothesis 2</h3>
          <p><strong>Self-expansiveness into information space:</strong> Based on the rubber hand illusion (Botvinick & Cohen, 1998), self-boundaries are not fixed but can extend to incorporate external objects. We assume that the neural mechanisms underlying multisensory integration—demonstrated by the rubber hand illusion—provide a measurable basis for transforming physical self-perception into an expansive, information-rich state that underpins Spirit.</p>

          <h2>Spirit Physical Space (Kawasaki Model)</h2>
          <h3>Mathematical Model:</h3>
          <BlockMath math="S = V, E, T" />
          <BlockMath math="E = -\ln P(w_O | w_I),\; V = \{\vec{w_I}, \vec{w_O}, ...\},\; T = \text{time axis}." />

          <h3>Physical Definition of Spirit:</h3>
          <BlockMath math="\psi(S) = \frac{\delta E(S)}{\delta S}." />
          <p>(Bérut et al., 2012)</p>
          
          <div className="w-full h-[80vh] my-8">
            <KawasakiModel />
          </div>

          <h2>Vectorization Spirit Using the Word Association Experiment (Jung, 1910)</h2>
          <BlockMath math="P(w_O | w_I) = \frac{\exp(\vec{w_I} \cdot \vec{w_O}) \cdot [r(w_I, w_O)]^{\alpha} \cdot \exp(\gamma \frac{\Delta SP(w_I,w_O)}{\lambda}) \cdot \exp(\eta F(w_I, w_O))}{\sum_{j} \exp(\vec{w_I} \cdot \vec{w_j}) \cdot [r(w_I, w_j)]^{\alpha} \cdot \exp(\gamma \frac{\Delta SP(w_I,w_j)}{\lambda}) \cdot \exp(\eta F(w_I, w_j))}" />

          <p><strong>Words(100):</strong></p>
          <div className="flex flex-wrap gap-2 text-sm">
            {JUNG_STIMULUS_WORDS.join(", ")}
          </div>

          <p><strong>Conventional Word2Vec:</strong> Quantify the strength of association using the inner product of word vectors.</p>
          <p><strong>Jung's association method element:</strong> Introduce a factor that is the inverse of reaction time.</p>
          <p><strong>Integrated model:</strong> Adjust the reaction speed factor with the hyperparameter α and define a modified probability function as follows:</p>

          <SpiritInPhysicsInteractive />

          <h2>Measurement via Emotion Analytics (Quantitative Analysis)</h2>
          <BlockMath math="r(w_I, w_O) = \frac{1}{T(w_I, w_O) + \epsilon}" />
          <p>The facial and voice recognition system defines an emotion score F(w_I, w_O) obtained from the subject's facial expression and voice. This score is treated as an integrated index of the intensity of each emotion, such as "happiness," "sadness," and "surprise."</p>

          <h2>Measurement via Skin Potential Using the Rubber Hand Illusion(Qualitative Analysis)</h2>
          <BlockMath math="s(w_I, w_O) = \exp\left(\frac{\Delta SP(w_I, w_O)}{\lambda}\right)" />

          <h2>Conclusion</h2>
          <p><strong>Self-expansiveness is Spirit:</strong> Self-expansiveness plays a key role in shaping personal, physiological, and societal phenomena.</p>
          <p><strong>Spirit Transformer Model:</strong> The Kawasaki Model proves that the spirit can be structured, measured, and quantified as dynamic physical information.</p>
          <BlockMath math="P(w_O | w_I) = \frac{\exp(\vec{w_I} \cdot \vec{w_O}) \cdot [r(w_I, w_O)]^{\alpha} \cdot \exp(\gamma \frac{\Delta SP(w_I,w_O)}{\lambda}) \cdot \exp(\eta F(w_I, w_O))}{\sum_{j} \exp(\vec{w_I} \cdot \vec{w_j}) \cdot [r(w_I, w_j)]^{\alpha} \cdot \exp(\gamma \frac{\Delta SP(w_I,w_j)}{\lambda}) \cdot \exp(\eta F(w_I, w_j))}" />

          <h2>Results</h2>
          <p>Spirit in Physics (Jung's Word Association Test Embedding Model)</p>
          
          <p><a href="https://www.junkawasaki.com/posts/spirit-in-physics">https://www.junkawasaki.com/posts/spirit-in-physics</a></p>

          <h2>References</h2>
          <ol>
            <li>Landauer, R. (1991). Information is physical. Physics Today, 44(5), 23–29.</li>
            <li>Bérut, A., Arakelyan, A., Petrosyan, A., Ciliberto, S., Dillenschneider, R., & Lutz, E. (2012). Experimental verification of Landauer's principle linking information and thermodynamics. Nature, 483(7388), 187–189.</li>
            <li>Botvinick, M., & Cohen, J. (1998). Rubber-hand illusion. Nature, 391, 756.</li>
            <li>Toyabe, S., Sagawa, T., Ueda, M., Muneyuki, E., & Sano, M. (2010). Experimental demonstration of information-to-energy conversion and validation of the generalized Jarzynski equality. Nature Physics, 6, 988–992.</li>
          </ol>

          <h3>Another Research / High-IQ Japanese GWAS: Explore IQ Genes</h3>
          <p>Leveraging Japan's unique genetics, a GWAS targeting individuals with IQ ≥140 will compare genetic and cognitive data to identify SNPs linked to intelligence. The study begins in 2024 with results slated for publication.</p>
          <p><strong>Dataset:</strong> 92 people / CAMS IQ140 sd15 - IQ180t / SNPs.</p>
          <p><strong>ref:</strong> Jonathan R. I. Coleman et al, Mol Psychiatry 24, 182-197 (2019)</p>
        </>
      )}
    </article>
  );
} 