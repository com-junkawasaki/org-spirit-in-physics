// LLM-BOUNDARY: 30_fold - 純関数（MDAG -> 投影）※副作用禁止

// 再エクスポート順: 00→80 の順で固定

export {
  type MerkleDAG,
  initialState,
  foldMerkleDAG,
} from './merkle-dag';
export {
  foldEmotionStatistics,
} from './emotion-fold';
