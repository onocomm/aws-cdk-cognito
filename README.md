# AWS CDK Cognito サンプルプロジェクト

このリポジトリは、AWS CDKを使用してAmazon Cognitoのユーザープールとアイデンティティプールを設定する方法を示すサンプルプロジェクトです。認証・認可基盤をインフラストラクチャー・アズ・コードで管理する例を含んでいます。

## 概要

このプロジェクトでは、以下のリソースと設定を AWS CDK を使って定義しています：

- Cognito ユーザープールの作成と設定
  - ユーザープール名の指定
  - メールアドレスによるサインイン
  - パスワードポリシーの設定
  - Amazon SES を使用したメール送信設定
  - リソース削除ポリシーの設定
- ユーザープールクライアントの設定
  - クライアント名の指定
  - 各種認証フローの有効化（SRP、管理者認証、カスタム認証）
  - ユーザー存在エラーの防止（セキュリティ対策）
- Cognito アイデンティティプールの作成
  - アイデンティティプール名の指定
  - ユーザープールをIDP（Identity Provider）として設定
- IAM ロールの設定
  - カスタムロール名の指定
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

### 基本設定の変数化

```typescript
const UserPoolName = 'example system';
const UserPoolClientName = 'example system';
const IdentityPoolName = 'example system';
const SESRegion = 'ap-northeast-1';
const EmailAddress = 'no-reply@example.com';
const EmailName = 'example system';
const ConfigurationSetName = 'default';
const RoleName = 'Cognito_exampleAuth_Role';
```

### ユーザープールの作成

```typescript
const userPool = new cognito.UserPool(this, 'UserPool', {
  userPoolName: UserPoolName,
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
    sesRegion: SESRegion,
    fromEmail: EmailAddress,
    fromName: EmailName,
    configurationSetName: ConfigurationSetName,
  }),
  removalPolicy: RemovalPolicy.DESTROY,
});
```

### ユーザープールクライアントの設定

```typescript
const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
  userPool,
  userPoolClientName: UserPoolClientName,
  preventUserExistenceErrors: true, // ユーザー存在エラーの防止を有効化
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
  identityPoolName: IdentityPoolName,
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
  roleName: RoleName, // 変数からロール名を指定
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

## セキュリティ機能

### ユーザー存在エラーの防止

`preventUserExistenceErrors: true` を設定することで、ユーザー列挙攻撃（ユーザー名の存在を調査する攻撃）を防止できます。この設定が有効な場合、ユーザーが存在しない場合でも一般的なエラーメッセージが返され、ユーザーの存在有無を隠匿します。

### 削除ポリシー

`removalPolicy: RemovalPolicy.DESTROY` を設定することで、CDKスタックを削除する際にCognitoリソースも一緒に削除されます。本番環境では `RemovalPolicy.RETAIN` に変更することで、誤ってユーザーデータを失うことを防止できます。

## カスタマイズ方法

実際の環境で使用する場合は、以下の点を変更してください：

1. 変数セクションの値を実際の環境に合わせて変更
   - UserPoolName, UserPoolClientName, IdentityPoolName
   - EmailAddress, EmailName
   - RoleName
2. パスワードポリシーをセキュリティ要件に合わせて変更
3. 本番環境では `removalPolicy` を `RemovalPolicy.RETAIN` に設定
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
