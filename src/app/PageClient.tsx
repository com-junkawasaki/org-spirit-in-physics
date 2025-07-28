"use client";

import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { JUNG_STIMULUS_WORDS } from "@/components/jung-word-assessment/JungWordTest";
import KawasakiModel from "@/components/kawasaki-model";
import SpiritInPhysicsInteractive from "@/components/spirit-in-physics/SpiritInPhysicsInteractive";
import { ResearchParticipationConsent } from '@/components/ui/ResearchParticipationConsent';

export default function PageClient() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 text-gray-800">
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-2">Spirit in Physics</h1>
        <p className="text-gray-600">
          <strong>Authors:</strong> Jun Kawasaki(root@junkawasaki.com), Kazuki Tainaka, Tomonori Takeuchi
        </p>
        <p className="text-sm text-gray-500">
          <strong>Affiliation:</strong> Graduate School of Medical and Dental Sciences, Niigata University, Brain Research Institute, Niigata University, Japan, Department of Biomedicine, Aarhus University, Denmark
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold border-b pb-2 mb-6">Introduction: Structuring and Quantifying Human Spirit Using the Informational Vector Space</h2>
        
        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-3">Hypothesis 1</h3>
          <p className="text-lg leading-relaxed"><strong>Information is Physics:</strong> Information is inherently physical—it obeys the laws of thermodynamics and directly influences energy exchange. Experimental validations of Landauer's principle (Bérut et al., 2012) reinforce that computation and energy are fundamentally intertwined.</p>
        </div>

        <div>
          <h3 className="text-2xl font-semibold mb-3">Hypothesis 2</h3>
          <p className="text-lg leading-relaxed"><strong>Self-expansiveness into information space:</strong> Based on the rubber hand illusion (Botvinick & Cohen, 1998), self-boundaries are not fixed but can extend to incorporate external objects. We assume that the neural mechanisms underlying multisensory integration—demonstrated by the rubber hand illusion—provide a measurable basis for transforming physical self-perception into an expansive, information-rich state that underpins Spirit.</p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold border-b pb-2 mb-6">Spirit in Physics ( Jung's Word Association Test Embedding Model )</h2>
        
        <div className="w-full h-[80vh] my-8 rounded-lg overflow-hidden border shadow-lg">
          <KawasakiModel showTitle={false} />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold border-b pb-2 mb-6">Vectorization Spirit Using the Word Association Experiment (Jung, 1910)</h2>
        <div className="flex justify-center my-6">
          <BlockMath math="P(w_O | w_I) = \frac{\exp(\vec{w_I} \cdot \vec{w_O}) \cdot [r(w_I, w_O)]^{\alpha} \cdot \exp(\gamma \frac{\Delta SP(w_I,w_O)}{\lambda}) \cdot \exp(\eta F(w_I, w_O))}{\sum_{j} \exp(\vec{w_I} \cdot \vec{w_j}) \cdot [r(w_I, w_j)]^{\alpha} \cdot \exp(\gamma \frac{\Delta SP(w_I,w_j)}{\lambda}) \cdot \exp(\eta F(w_I, w_j))}" />
        </div>

        <h3 className="text-xl font-medium mb-3">Words(100):</h3>
        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-md">
          {JUNG_STIMULUS_WORDS.join(", ")}
        </p>

        <div className="mt-6 space-y-2">
          <p><strong>Conventional Word2Vec:</strong> Quantify the strength of association using the inner product of word vectors.</p>
          <p><strong>Jung's association method element:</strong> Introduce a factor that is the inverse of reaction time.</p>
          <p><strong>Integrated model:</strong> Adjust the reaction speed factor with the hyperparameter α and define a modified probability function as follows:</p>
        </div>

        <ResearchParticipationConsent />
        <SpiritInPhysicsInteractive />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold border-b pb-2 mb-6">Measurement via Emotion Analytics (Quantitative Analysis)</h2>
        <div className="flex justify-center my-4">
          <BlockMath math="r(w_I, w_O) = \frac{1}{T(w_I, w_O) + \epsilon}" />
        </div>
        <p className="text-lg leading-relaxed">The facial and voice recognition system defines an emotion score F(w_I, w_O) obtained from the subject's facial expression and voice. This score is treated as an integrated index of the intensity of each emotion, such as "happiness," "sadness," and "surprise."</p>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold border-b pb-2 mb-6">Measurement via Skin Potential Using the Rubber Hand Illusion(Qualitative Analysis)</h2>
        <div className="flex justify-center my-4">
          <BlockMath math="s(w_I, w_O) = \exp\left(\frac{\Delta SP(w_I, w_O)}{\lambda}\right)" />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold border-b pb-2 mb-6">Conclusion</h2>
        <p className="text-lg leading-relaxed"><strong>Self-expansiveness is Spirit:</strong> Self-expansiveness plays a key role in shaping personal, physiological, and societal phenomena.</p>
        <p className="text-lg leading-relaxed"><strong>Spirit Transformer Model:</strong> The Kawasaki Model proves that the spirit can be structured, measured, and quantified as dynamic physical information.</p>
        <div className="flex justify-center my-6">
          <BlockMath math="P(w_O | w_I) = \frac{\exp(\vec{w_I} \cdot \vec{w_O}) \cdot [r(w_I, w_O)]^{\alpha} \cdot \exp(\gamma \frac{\Delta SP(w_I,w_O)}{\lambda}) \cdot \exp(\eta F(w_I, w_O))}{\sum_{j} \exp(\vec{w_I} \cdot \vec{w_j}) \cdot [r(w_I, w_j)]^{\alpha} \cdot \exp(\gamma \frac{\Delta SP(w_I,w_j)}{\lambda}) \cdot \exp(\eta F(w_I, w_j))}" />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold border-b pb-2 mb-6">Results</h2>
        <p className="text-lg">Spirit in Physics (Jung's Word Association Test Embedding Model)</p>
        <a href="https://www.junkawasaki.com/posts/spirit-in-physics" className="text-blue-600 hover:underline">https://www.junkawasaki.com/posts/spirit-in-physics</a>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold border-b pb-2 mb-6">References</h2>
        <ol className="list-decimal pl-6 space-y-2 text-gray-700">
          <li>Landauer, R. (1991). Information is physical. Physics Today, 44(5), 23–29.</li>
          <li>Bérut, A., Arakelyan, A., Petrosyan, A., Ciliberto, S., Dillenschneider, R., & Lutz, E. (2012). Experimental verification of Landauer's principle linking information and thermodynamics. Nature, 483(7388), 187–189.</li>
          <li>Botvinick, M., & Cohen, J. (1998). Rubber-hand illusion. Nature, 391, 756.</li>
          <li>Toyabe, S., Sagawa, T., Ueda, M., Muneyuki, E., & Sano, M. (2010). Experimental demonstration of information-to-energy conversion and validation of the generalized Jarzynski equality. Nature Physics, 6, 988–992.</li>
        </ol>
      </section>

      <section>
        <h3 className="text-2xl font-semibold mb-3">Another Research / High-IQ Japanese GWAS: Explore IQ Genes</h3>
        <p className="text-lg leading-relaxed">Leveraging Japan's unique genetics, a GWAS targeting individuals with IQ ≥140 will compare genetic and cognitive data to identify SNPs linked to intelligence. The study begins in 2024 with results slated for publication.</p>
        <p className="mt-4"><strong>Dataset:</strong> 92 people / CAMS IQ140 sd15 - IQ180t / SNPs.</p>
        <p><strong>ref:</strong> Jonathan R. I. Coleman et al, Mol Psychiatry 24, 182-197 (2019)</p>
      </section>
    </div>
  );
} 