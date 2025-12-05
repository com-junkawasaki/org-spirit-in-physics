// Merkle DAG: components.DescriptiveStatistics
// Descriptive statistics tables for participants and classification results

import type { ExperimentalData } from '../../types/paper/experimental';

interface DescriptiveStatisticsProps {
  data: ExperimentalData;
}

export default function DescriptiveStatistics({ data }: DescriptiveStatisticsProps) {
  const { participants, classification, responses } = data;

  const totalParticipants = participants.length;
  const totalResponses = responses.length;
  const spiritTypeCount = classification.spiritTypeCount;
  const ghostPatternCount = classification.ghostPatternCount;
  const spiritTypePercentage =
    totalResponses > 0 ? ((spiritTypeCount / totalResponses) * 100).toFixed(1) : '0.0';
  const ghostPatternPercentage =
    totalResponses > 0 ? ((ghostPatternCount / totalResponses) * 100).toFixed(1) : '0.0';

  const meanAge =
    participants.length > 0 && participants[0]?.age
      ? (participants.reduce((sum, p) => sum + (p.age ?? 0), 0) / participants.length).toFixed(1)
      : 'N/A';

  const maleCount = participants.filter((p) => p.gender === 'male').length;
  const femaleCount = participants.filter((p) => p.gender === 'female').length;

  return (
    <>
      <div className="my-8">
        <h3>Table 1: Participant Characteristics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                  Characteristic
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="dark:bg-gray-900/50">
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  Total Participants
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {totalParticipants}
                </td>
              </tr>
              <tr className="dark:bg-gray-900/50">
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  Total Responses
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {totalResponses}
                </td>
              </tr>
              <tr className="dark:bg-gray-900/50">
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  Mean Age (years)
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {meanAge}
                </td>
              </tr>
              <tr className="dark:bg-gray-900/50">
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  Gender Distribution
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {maleCount} Male, {femaleCount} Female
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="my-8">
        <h3>Table 2: Spirit Type and Ghost Pattern Classification Results</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                  Classification
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                  Count
                </th>
                <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">
                  Percentage (%)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="dark:bg-gray-900/50">
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  Spirit Type
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {spiritTypeCount}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {spiritTypePercentage}
                </td>
              </tr>
              <tr className="dark:bg-gray-900/50">
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  Ghost Pattern
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {ghostPatternCount}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                  {ghostPatternPercentage}
                </td>
              </tr>
              <tr className="dark:bg-gray-900/50">
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold">
                  Total
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold">
                  {totalResponses}
                </td>
                <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold">
                  100.0
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
