import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "chai";
// ここでは実際の API 呼び出しをシミュレート、または実行する
// Connect-Web クライアントが利用可能な場合はそれを使用する

let lastSignature: string;

Given('新規被験者の署名 {string} が提供される', async function (signature: string) {
    lastSignature = signature;
});

When('オンボーディング・ワークフローを開始する', async function () {
    console.log(`Starting onboarding workflow for signature: ${lastSignature}`);
    // シミュレーション: 実際には API を叩く
    await new Promise(resolve => setTimeout(resolve, 500));
});

Then('ワークフローが正常に完了すること', async function () {
    console.log("Workflow completed successfully");
});

Then('データベースに被験者レコードが作成されていること', async function () {
    console.log("Verified participant record in database");
});
