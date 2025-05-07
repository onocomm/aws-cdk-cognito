# AWS CDK Cognito サンプルプロジェクト

このリポジトリは、AWS CDKを使用してAmazon Cognitoのユーザープールとアイデンティティプールを設定する方法を示すサンプルプロジェクトです。認証・認可基盤をインフラストラクチャー・アズ・コードで管理する例を含んでいます。

## 概要

このプロジェクトでは、以下のリソースと設定を AWS CDK を使って定義しています：

- Cognito ユーザープールの作成と設定
  - メールアドレスによるサインイン
  - パスワードポリシーの設定
  - Amazon SES を使用したメール送信設定
- ユーザープールクライアントの設定
  - 各種認証フローの有効化（SRP、管理者認証、カスタム認証）
- Cognito アイデンティティプールの作成
  - ユーザープールをIDP（Identity Provider）として設定
- IAM ロールの設定
  - 認証済みユーザー用のロールと権限設定

## 前提条件

このプロジェクトを使用するためには、以下が必要です：

- AWS アカウント
- Node.js (バージョン 14.x 以上)
- AWS CDK CLI (バージョン 2.x)
- AWS CLI（設定済み）
- Amazon SES（設定済み、メール送信元として使用）

## インストール方法

```bash
# リポジトリをクローン
git clone <リポジトリURL>
cd aws-cdk-cognito

# 依存関係をインストール
npm install
```

## 使用方法

### 1. プロジェクトのコンパイル

```bash
npm run build
```

### 2. スタックの合成

```bash
npx cdk synth
```

### 3. デプロイ

```bash
npx cdk deploy
```

> **注意**: 実際にデプロイすると、Cognitoリソースが作成され、AWS アカウントに課金が発生する可能性があります。

## 実装例の解説

### ユーザープールの作成

```typescript
const userPool = new cognito.UserPool(this, 'UserPool', {
  selfSignUpEnabled: true,
  signInAliases: {
    email: true,
  },
  passwordPolicy: {
    minLength: 8,
    requireDigits: true,
    requireLowercase: false,
    requireUppercase: false,
    requireSymbols: false,
    tempPasswordValidity: Duration.days(7),
  },
  email: cognito.UserPoolEmail.withSES({
    sesRegion: 'ap-northeast-1',
    fromEmail: 'no-reply@owner-order.com',
    fromName: 'owner-system',
    configurationSetName: 'default',
  }),
  mfa: cognito.Mfa.OFF,
  deviceTracking: {
    challengeRequiredOnNewDevice: false,
    deviceOnlyRememberedOnUserPrompt: false,
  },
});
```

### ユーザープールクライアントの設定

```typescript
const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
  userPool,
  authFlows: {
    userSrp: true,                // SRP認証
    adminUserPassword: true,      // 管理者認証
    custom: true,                 // カスタム認証
    userPassword: false,          // パスワード認証（無効）
  },
  refreshTokenValidity: Duration.days(30), // 更新トークンの有効期間
});
```

### アイデンティティプールの作成

```typescript
const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
  identityPoolName: 'MyIdentityPool',
  cognitoIdentityProviders: [
    {
      clientId: userPoolClient.userPoolClientId,
      providerName: `cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
    },
  ],
  allowUnauthenticatedIdentities: false,
});
```

### 認証済みユーザー用IAMロールの設定

```typescript
const authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
  assumedBy: new iam.FederatedPrincipal(
    'cognito-identity.amazonaws.com',
    {
      StringEquals: {
        'cognito-identity.amazonaws.com:aud': identityPool.ref,
      },
      'ForAnyValue:StringLike': {
        'cognito-identity.amazonaws.com:amr': 'authenticated',
      },
    },
    'sts:AssumeRoleWithWebIdentity'
  ),
});

// ロールにポリシーをアタッチ
authenticatedRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess')
);
```

### アイデンティティプールとIAMロールの関連付け

```typescript
new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
  identityPoolId: identityPool.ref,
  roles: {
    authenticated: authenticatedRole.roleArn,
  },
});
```

## カスタマイズ方法

実際の環境で使用する場合は、以下の点を変更してください：

1. メール設定を実際の環境に合わせて調整（SESの設定や送信元アドレスなど）
2. パスワードポリシーをセキュリティ要件に合わせて変更
3. ユーザープールクライアントの認証フローを要件に合わせて設定
4. IAMロールとポリシーを実際のアプリケーション要件に合わせて変更
5. 必要に応じてソーシャルIDプロバイダーを追加

## クリーンアップ

デプロイしたリソースを削除するには：

```bash
npx cdk destroy
```

## 参考リソース

- [AWS CDK ドキュメント](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- [Amazon Cognito ドキュメント](https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html)
- [AWS CDK API リファレンス - Cognito](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cognito-readme.html)
- [Amazon SES ドキュメント](https://docs.aws.amazon.com/ses/latest/dg/Welcome.html)

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。
