// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）

'use client';

import React, { useState, useEffect } from 'react';

// Merkle DAG: import.page -> data_import_ui

interface FileStatus {
  participantId: string;
  path: string;
  files: {
    consent: boolean;
    sessionData: boolean;
    humeArtifacts: boolean;
    videoFiles: boolean;
    csvFiles: boolean;
  };
  imported: {
    participant: boolean;
    session: boolean;
    emotion: boolean;
  };
  canImport: {
    participant: boolean;
    session: boolean;
    emotion: boolean;
  };
  status: 'ready' | 'partial' | 'complete' | 'no-data';
  lastModified: string;
}

interface ImportStatusResponse {
  success: boolean;
  fileStatus: FileStatus[];
  summary: {
    totalFiles: number;
    importedParticipants: number;
    importedSessions: number;
    importedEmotions: number;
  };
}

export default function ImportPage() {
  const [fileStatus, setFileStatus] = useState<FileStatus[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);

  // 指定された participant ID のリスト
  const targetParticipantIds = [
    '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413',
    '5ac869a3-b8db-49c3-9362-3e149a5415e9',
    '7dda0261-a6f4-4208-bd61-4244380d277f',
    '144b325f-5966-4d59-a629-f2ca421388cc',
    '5346d514-e501-457a-aff1-55c92074a6f2',
    '15592cdb-86cf-4baf-86f5-66184169ee39',
    '4512513e-9132-4556-9858-bac08f28037f',
    '25111604-c7db-4bfd-8662-e55060e332d6',
    'a4e1b8f4-e267-41a7-acfc-07fe1b7c06fb',
    'ad96101f-a7a8-4d71-8d82-c0478975c40b',
    'e41a9cd2-d803-49a8-9020-0260e55cd03e'
  ];

  // Merkle DAG: import.status.load -> load_import_status
  const loadImportStatus = async () => {
    setStatusLoading(true);
    try {
      const participantIdsParam = targetParticipantIds.join(',');
      const response = await fetch(`/api/admin/import/status?participantIds=${participantIdsParam}`);
      if (!response.ok) {
        throw new Error('Failed to fetch import status');
      }
      const data: ImportStatusResponse = await response.json();
      setFileStatus(data.fileStatus || []);
    } catch (error) {
      console.error('Failed to load import status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  // コンポーネントマウント時にインポート状態を読み込み
  useEffect(() => {
    loadImportStatus();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">データインポート管理</h1>
          <p className="text-gray-600 mt-2">
            対象の11名参加者のデータをNeo4jデータベースにインポートします。
          </p>
        </div>
        <button
          onClick={loadImportStatus}
          disabled={statusLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {statusLoading ? '読み込み中...' : 'ステータス更新'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">インポート状態</h2>
        {statusLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-500">読み込み中...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {targetParticipantIds.map((id) => {
                const participant = fileStatus.find(p => p.participantId === id);
                return (
                  <div key={id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm">{id.slice(0, 8)}...</span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        participant?.status === 'complete' ? 'bg-green-100 text-green-800' :
                        participant?.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {participant?.status === 'complete' ? '完了' :
                         participant?.status === 'partial' ? '部分' :
                         participant?.status === 'ready' ? '準備完了' : 'データなし'}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${participant?.files.consent ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        同意書
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${participant?.files.sessionData ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        セッションデータ
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${participant?.files.humeArtifacts ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        Humeデータ
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${participant?.files.videoFiles ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        ビデオ
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${participant?.files.csvFiles ? 'bg-purple-500' : 'bg-gray-300'}`}></span>
                        CSV (生理)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                ファイルあり
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                ファイルなし
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                CSV (生理データ)
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              <strong>注意:</strong> VideoファイルはBlobストレージ管理、CSVファイルは生理データとしてNeo4jにインポートされます。
            </p>
          </>
        )}
      </div>
    </div>
  );
}