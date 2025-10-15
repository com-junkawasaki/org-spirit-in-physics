// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle, Database, Cloud, FileText, Eye, RefreshCw, X } from 'lucide-react';

// Merkle DAG: import.page -> data_import_ui
type ImportStatus = 'idle' | 'running' | 'completed' | 'error';

interface ImportResult {
  participantId: string;
  status: 'success' | 'error';
  message: string;
  details?: any;
}

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
  error?: string;
}

export default function ImportPage() {
  const [participantImportStatus, setParticipantImportStatus] = useState<ImportStatus>('idle');
  const [sessionImportStatus, setSessionImportStatus] = useState<ImportStatus>('idle');
  const [emotionImportStatus, setEmotionImportStatus] = useState<ImportStatus>('idle');

  const [participantResults, setParticipantResults] = useState<ImportResult[]>([]);
  const [sessionResults, setSessionResults] = useState<ImportResult[]>([]);
  const [emotionResults, setEmotionResults] = useState<ImportResult[]>([]);

  const [progress, setProgress] = useState(0);

  // インポート状態管理
  const [fileStatus, setFileStatus] = useState<FileStatus[]>([]);
  const [statusSummary, setStatusSummary] = useState<ImportStatusResponse['summary'] | null>(null);
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
      setStatusSummary(data.summary);
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

  // Merkle DAG: import.participants -> participant_data_import
  const importParticipants = async () => {
    setParticipantImportStatus('running');
    setParticipantResults([]);
    setProgress(0);

    try {
      const response = await fetch('/api/admin/import/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIds: targetParticipantIds
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import participants');
      }

      const data = await response.json();
      setParticipantResults(data.results || []);
      setParticipantImportStatus('completed');
    } catch (error) {
      console.error('Import error:', error);
      setParticipantImportStatus('error');
      setParticipantResults([{
        participantId: 'all',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }]);
    }
  };

  // Merkle DAG: import.sessions -> session_data_import
  const importSessions = async () => {
    setSessionImportStatus('running');
    setSessionResults([]);
    setProgress(0);

    try {
      const response = await fetch('/api/admin/import/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIds: targetParticipantIds
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import sessions');
      }

      const data = await response.json();
      setSessionResults(data.results || []);
      setSessionImportStatus('completed');
    } catch (error) {
      console.error('Import error:', error);
      setSessionImportStatus('error');
      setSessionResults([{
        participantId: 'all',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }]);
    }
  };

  // Merkle DAG: import.emotions -> emotion_data_import
  const importEmotions = async () => {
    setEmotionImportStatus('running');
    setEmotionResults([]);
    setProgress(0);

    try {
      const response = await fetch('/api/admin/import/emotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIds: targetParticipantIds
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import emotion data');
      }

      const data = await response.json();
      setEmotionResults(data.results || []);
      setEmotionImportStatus('completed');
    } catch (error) {
      console.error('Import error:', error);
      setEmotionImportStatus('error');
      setEmotionResults([{
        participantId: 'all',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }]);
    }
  };

  // Merkle DAG: import.status_icon -> status_indicator
  const getStatusIcon = (status: ImportStatus) => {
    switch (status) {
      case 'running':
        return <Database className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Merkle DAG: import.status_color -> status_styling
  const getStatusColor = (status: ImportStatus) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Merkle DAG: import.status.helpers -> status_display_helpers
  const getFileStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">インポート可能</Badge>;
      case 'partial':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">部分インポート</Badge>;
      case 'complete':
        return <Badge variant="outline" className="text-green-600 border-green-600">完了</Badge>;
      case 'no-data':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">データなし</Badge>;
      default:
        return <Badge variant="outline">不明</Badge>;
    }
  };

  const getImportStatusIcon = (imported: boolean, canImport: boolean) => {
    if (imported) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (canImport) {
      return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">データインポート</h1>
        <p className="text-gray-600 mt-2">
          ファイルシステムからデータを手動でインポートします
        </p>
      </div>

      {/* Merkle DAG: import.tabs -> import_tabs_layout */}
      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status">インポート状態</TabsTrigger>
          <TabsTrigger value="participants">参加者データ</TabsTrigger>
          <TabsTrigger value="sessions">セッションデータ</TabsTrigger>
          <TabsTrigger value="emotions">感情分析データ</TabsTrigger>
        </TabsList>

        {/* Merkle DAG: import.status.tab -> import_status_visualization */}
        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                インポート状態
              </CardTitle>
              <CardDescription>
                対象の11名参加者のファイル一覧と取得済みデータの状態を表示します
              </CardDescription>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    管理対象参加者数: {targetParticipantIds.length}名
                  </p>
                  <p className="text-sm text-gray-600">
                    検出されたファイル数: {fileStatus.length}件
                  </p>
                </div>

                {/* 対象フォルダ一覧 */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-semibold mb-3 text-gray-800">対象フォルダ一覧</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {targetParticipantIds.map((participantId) => {
                      const file = fileStatus.find(f => f.participantId === participantId);
                      const isFound = !!file;
                      const hasData = file ? (
                        file.files.consent || file.files.sessionData || file.files.humeArtifacts
                      ) : false;

                      return (
                        <div
                          key={participantId}
                          className={`border rounded-lg p-3 ${
                            isFound
                              ? hasData
                                ? 'bg-green-50 border-green-200'
                                : 'bg-yellow-50 border-yellow-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs truncate flex-1" title={participantId}>
                              {participantId.slice(0, 12)}...
                            </span>
                            <div className="ml-2">
                              {isFound ? (
                                hasData ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                                )
                              ) : (
                                <X className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          </div>

                          {file && (
                            <div className="grid grid-cols-3 gap-1 text-xs">
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${file.files.consent ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <span className="text-gray-600">同意</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${file.files.sessionData ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <span className="text-gray-600">セッション</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${file.files.humeArtifacts ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <span className="text-gray-600">感情</span>
                              </div>
                            </div>
                          )}

                          {!file && (
                            <div className="text-xs text-red-600">
                              フォルダが見つかりません
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>データあり</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-yellow-600" />
                      <span>フォルダあり（データなし）</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <X className="h-3 w-3 text-red-600" />
                      <span>フォルダなし</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>ファイルあり</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        <span>ファイルなし</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  onClick={loadImportStatus}
                  disabled={statusLoading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${statusLoading ? 'animate-spin' : ''}`} />
                  更新
                </Button>
                {statusSummary && (
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>総ファイル数: {statusSummary.totalFiles}</span>
                    <span>参加者: {statusSummary.importedParticipants}</span>
                    <span>セッション: {statusSummary.importedSessions}</span>
                    <span>感情データ: {statusSummary.importedEmotions}</span>
                  </div>
                )}
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>参加者ID</TableHead>
                      <TableHead>ファイル状態</TableHead>
                      <TableHead>参加者</TableHead>
                      <TableHead>セッション</TableHead>
                      <TableHead>感情データ</TableHead>
                      <TableHead>全体状態</TableHead>
                      <TableHead>最終更新</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fileStatus.map((file) => (
                      <TableRow key={file.participantId}>
                        <TableCell className="font-mono text-sm">
                          {file.participantId}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${file.files.consent ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                              consent.json
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${file.files.sessionData ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                              session_data.json
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${file.files.humeArtifacts ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                              HumeAI
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${file.files.csvFiles ? 'bg-purple-500' : 'bg-gray-300'}`}></span>
                              CSV (生理)
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${file.files.videoFiles ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                              Video (不要)
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getImportStatusIcon(file.imported.participant, file.canImport.participant)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getImportStatusIcon(file.imported.session, file.canImport.session)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getImportStatusIcon(file.imported.emotion, file.canImport.emotion)}
                        </TableCell>
                        <TableCell>
                          {getFileStatusBadge(file.status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(file.lastModified).toLocaleString('ja-JP')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {fileStatus.length === 0 && !statusLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          ファイルが見つかりません。dataset/participants/ ディレクトリを確認してください。
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>凡例:</strong></p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>インポート済み</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    <span>インポート可能</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span>未準備/不要</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs">ファイルあり</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-xs">CSV (生理データ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs">Video (Blob管理)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-xs">ファイルなし</span>
                  </div>
                </div>
                <p><strong>注意:</strong> VideoファイルはBlobストレージ管理、CSVファイルは生理データとしてNeo4jにインポートされます。</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(participantImportStatus)}
                参加者データインポート
              </CardTitle>
              <CardDescription>
                ファイルシステムから参加者データをNeo4jとBlob Storageにインポートします
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={importParticipants}
                  disabled={participantImportStatus === 'running'}
                  className={`${getStatusColor(participantImportStatus)} text-white`}
                >
                  {participantImportStatus === 'running' ? 'インポート中...' : '参加者データをインポート'}
                </Button>
                <Badge variant="outline">
                  ステータス: {participantImportStatus === 'idle' ? '待機中' :
                               participantImportStatus === 'running' ? '実行中' :
                               participantImportStatus === 'completed' ? '完了' : 'エラー'}
                </Badge>
              </div>

              {participantImportStatus === 'running' && (
                <Progress value={progress} className="w-full" />
              )}

              {participantResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">結果:</h4>
                  {participantResults.map((result) => (
                    <div key={result.participantId} className={`flex items-center space-x-2 p-2 border rounded ${result.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <AlertCircle className={`h-4 w-4 ${result.status === 'success' ? 'text-green-500' : 'text-red-500'}`} />
                        <span>
                          <strong>{result.participantId}:</strong> {result.message}
                        </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(sessionImportStatus)}
                セッションデータインポート
              </CardTitle>
              <CardDescription>
                ファイルシステムからセッションデータをNeo4jとBlob Storageにインポートします
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={importSessions}
                  disabled={sessionImportStatus === 'running'}
                  className={`${getStatusColor(sessionImportStatus)} text-white`}
                >
                  {sessionImportStatus === 'running' ? 'インポート中...' : 'セッションデータをインポート'}
                </Button>
                <Badge variant="outline">
                  ステータス: {sessionImportStatus === 'idle' ? '待機中' :
                               sessionImportStatus === 'running' ? '実行中' :
                               sessionImportStatus === 'completed' ? '完了' : 'エラー'}
                </Badge>
              </div>

              {sessionImportStatus === 'running' && (
                <Progress value={progress} className="w-full" />
              )}

              {sessionResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">結果:</h4>
                  {sessionResults.map((result) => (
                    <div key={result.participantId} className={`flex items-center space-x-2 p-2 border rounded ${result.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <AlertCircle className={`h-4 w-4 ${result.status === 'success' ? 'text-green-500' : 'text-red-500'}`} />
                        <span>
                          <strong>{result.participantId}:</strong> {result.message}
                        </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emotions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(emotionImportStatus)}
                感情分析データインポート
              </CardTitle>
              <CardDescription>
                ファイルシステムから感情分析データをNeo4jとBlob Storageにインポートします
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={importEmotions}
                  disabled={emotionImportStatus === 'running'}
                  className={`${getStatusColor(emotionImportStatus)} text-white`}
                >
                  {emotionImportStatus === 'running' ? 'インポート中...' : '感情分析データをインポート'}
                </Button>
                <Badge variant="outline">
                  ステータス: {emotionImportStatus === 'idle' ? '待機中' :
                               emotionImportStatus === 'running' ? '実行中' :
                               emotionImportStatus === 'completed' ? '完了' : 'エラー'}
                </Badge>
              </div>

              {emotionImportStatus === 'running' && (
                <Progress value={progress} className="w-full" />
              )}

              {emotionResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">結果:</h4>
                  {emotionResults.map((result) => (
                    <div key={result.participantId} className={`flex items-center space-x-2 p-2 border rounded ${result.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <AlertCircle className={`h-4 w-4 ${result.status === 'success' ? 'text-green-500' : 'text-red-500'}`} />
                        <span>
                          <strong>{result.participantId}:</strong> {result.message}
                        </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
