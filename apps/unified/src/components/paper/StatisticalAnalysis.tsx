// Merkle DAG: components.StatisticalAnalysis
// Statistical analysis results display component

import type { ClassificationResult } from '../../types/paper/experimental';

interface StatisticalAnalysisProps {
  classification: ClassificationResult;
}

export default function StatisticalAnalysis({ classification }: StatisticalAnalysisProps) {
  const { componentBreakdown } = classification;
  const total = classification.spiritTypeCount + classification.ghostPatternCount;
  const spiritTypePercentage =
    total > 0 ? ((classification.spiritTypeCount / total) * 100).toFixed(1) : '0.0';
  const ghostPatternPercentage =
    total > 0 ? ((classification.ghostPatternCount / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="my-8">
      <h3>Statistical Analysis</h3>

      <div className="my-4">
        <h4>Classification Accuracy</h4>
        <p>
          Overall classification accuracy:{' '}
          <strong>{(classification.classificationAccuracy * 100).toFixed(1)}%</strong>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Spirit Type: {classification.spiritTypeCount} responses ({spiritTypePercentage}%)
          <br />
          Ghost Pattern: {classification.ghostPatternCount} responses ({ghostPatternPercentage}%)
        </p>
      </div>

      <div className="my-4">
        <h4>Component Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                  Component
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                  Mean
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                  Std Dev
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                  Min
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                  Max
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                  Median
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="dark:bg-gray-900/50">
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold">
                  Gene
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.gene.mean.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.gene.stdDev.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.gene.min.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.gene.max.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.gene.median.toFixed(3)}
                </td>
              </tr>
              <tr className="dark:bg-gray-900/50">
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold">
                  Meme
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.meme.mean.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.meme.stdDev.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.meme.min.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.meme.max.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.meme.median.toFixed(3)}
                </td>
              </tr>
              <tr className="dark:bg-gray-900/50">
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold">
                  Field
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.field.mean.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.field.stdDev.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.field.min.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.field.max.toFixed(3)}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {componentBreakdown.field.median.toFixed(3)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="my-4">
        <p className="text-sm italic">
          <strong>Note:</strong> Component statistics show the distribution of Gene, Meme, and
          Field components across all responses. These components contribute to Spirit Type and
          Ghost Pattern classification.
        </p>
      </div>
    </div>
  );
}
