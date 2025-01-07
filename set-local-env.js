/**
 * AWS Secrets Managerから環境変数を取得し、
 * Windowsのシステム環境変数として設定するスクリプト
 */

const AWS = require('aws-sdk');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 管理者権限チェック
async function isAdmin() {
    try {
        await execPromise('net session');
        return true;
    } catch {
        return false;
    }
}



async function setWindowsEnvVar(key, value) {
    try {
        // システム環境変数として設定
        await execPromise(`setx ${key} "${value}" /M`);
        console.log(`✅ 環境変数を設定しました: ${key}`);
    } catch (error) {
        console.error(`❌ 環境変数の設定に失敗: ${key}`);
        console.error('エラー詳細:', error.message);
    }
}

async function setupLocalEnv() {
    try {
        // 管理者権限チェック
        const admin = await isAdmin();
        if (!admin) {
            console.error('❌ このスクリプトは管理者権限で実行する必要があります。');
            console.error('PowerShellを管理者として実行してください。');
            process.exit(1);
        }

        console.log('🔄 AWSからシークレットを取得中...');
        
        // Secrets Managerからシークレットを取得
        const { SecretString } = await secretsManager.getSecretValue({
            SecretId: "metal-env"
        }).promise();

        const secrets = JSON.parse(SecretString);
        
        console.log(`📝 ${Object.keys(secrets).length}個の環境変数を設定します...`);

        // 各環境変数をWindowsに設定
        for (const [key, value] of Object.entries(secrets)) {
            await setWindowsEnvVar(key, value);
        }

        console.log('\n✨ 環境変数の設定が完了しました');
        console.log('⚠️ 新しい環境変数を反映するには、コマンドプロンプトを再起動してください');

    } catch (error) {
        console.error('❌ エラーが発生しました:', error.message);
        process.exit(1);
    }
}

// スクリプトの実行
console.log('🚀 ローカル環境変数の設定を開始します...');
setupLocalEnv(); 