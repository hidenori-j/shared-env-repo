/**
 * AWS Secrets Managerに環境変数を登録するスクリプト
 */

const fs = require('fs');
const dotenv = require('dotenv');
const AWS = require('aws-sdk');

// ハードコードされた認証情報を削除し、デフォルトの認証情報プロバイダーチェーンを使用
const secretsManager = new AWS.SecretsManager({
    region: process.env.AWS_REGION || 'ap-northeast-1'
});

async function registerSecrets() {
    try {
        console.log('🔄 .envファイルを読み込んでいます...');
        
        // .envファイルを読み込む
        const envConfig = dotenv.parse(fs.readFileSync('.env'));
        
        // JSONに変換
        const secretString = JSON.stringify(envConfig, null, 2);

        // シークレット名を設定
        const secretName = 'metal-env';

        try {
            // 既存のシークレットを更新
            await secretsManager.updateSecret({
                SecretId: secretName,
                SecretString: secretString
            }).promise();
            console.log('✅ 既存のシークレットを更新しました');
        } catch (error) {
            if (error.code === 'ResourceNotFoundException') {
                // シークレットが存在しない場合は新規作成
                await secretsManager.createSecret({
                    Name: secretName,
                    Description: 'Node-RED Production Environment Variables',
                    SecretString: secretString
                }).promise();
                console.log('✅ 新しいシークレットを作成しました');
            } else {
                throw error;
            }
        }

        // 登録された値を確認
        const { SecretString } = await secretsManager.getSecretValue({
            SecretId: secretName
        }).promise();

        console.log('\n📝 登録された環境変数:');
        const registeredSecrets = JSON.parse(SecretString);
        Object.keys(registeredSecrets).forEach(key => {
            console.log(`- ${key}: ${key.includes('SECRET') || key.includes('KEY') ? '********' : registeredSecrets[key]}`);
        });

    } catch (error) {
        console.error('❌ エラーが発生しました:', error.message);
        process.exit(1);
    }
}

// スクリプトの実行
console.log('🚀 AWS Secrets Managerへの登録を開始します...');
registerSecrets(); 