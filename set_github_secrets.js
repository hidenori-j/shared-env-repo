/**
 * AWS Secrets ManagerからGitHub Actionsの環境変数を設定するスクリプト
 */


import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Octokit } from "@octokit/rest";
import sodium from 'libsodium-wrappers';

async function getSecret() {
    // AWS Secrets Managerからシークレットを取得
    const client = new SecretsManagerClient({
        region: "ap-northeast-1" // リージョンは適宜変更してください
    });

    try {
        const command = new GetSecretValueCommand({
            SecretId: "metal-env",
        });
        const response = await client.send(command);
        return JSON.parse(response.SecretString);
    } catch (error) {
        console.error("シークレットの取得に失敗:", error);
        throw error;
    }
}

async function setGithubSecrets(secrets) {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
        throw new Error("GITHUB_TOKEN が設定されていません");
    }

    const owner = "hidenori-j";  // 既存の値を維持
    const repo = "metal-nginx";  // 既存の値を維持

    const octokit = new Octokit({
        auth: githubToken
    });

    // 必要な環境変数
    const requiredVars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'EC2_SSH_KEY',
        'EC2_HOST'
    ];

    await sodium.ready;

    for (const varName of requiredVars) {
        if (!secrets[varName]) {
            console.warn(`警告: ${varName} が secrets に存在しません`);
            continue;
        }

        try {
            console.log(`${varName} の設定を開始...`);
            
            // 公開鍵の取得を試行
            const { data: pubKeyResponse } = await octokit.rest.actions.getRepoPublicKey({
                owner,
                repo
            });
            console.log("公開鍵の取得に成功");

            // シークレットの暗号化
            const binKey = sodium.from_base64(pubKeyResponse.key, sodium.base64_variants.ORIGINAL);
            const binSecret = sodium.from_string(secrets[varName].toString()); // 文字列に変換
            const encBytes = sodium.crypto_box_seal(binSecret, binKey);
            const encSecret = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

            // シークレットを設定
            await octokit.rest.actions.createOrUpdateRepoSecret({
                owner,
                repo,
                secret_name: varName,
                encrypted_value: encSecret,
                key_id: pubKeyResponse.key_id
            });

            console.log(`${varName} の設定が完了しました`);
        } catch (error) {
            console.error(`${varName} の設定中にエラーが発生:`, error.message);
            if (error.response) {
                console.error('レスポンス:', error.response.data);
                console.error('ステータス:', error.response.status);
            }
        }
    }
}

async function main() {
    try {
        const secrets = await getSecret();
        if (secrets) {
            await setGithubSecrets(secrets);
            console.log("環境変数の設定が完了しました");
        }
    } catch (error) {
        console.error("エラーが発生しました:", error);
    }
}

main(); 