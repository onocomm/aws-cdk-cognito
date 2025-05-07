# AWS CDK Route53 サンプルプロジェクト

このリポジトリは、AWS CDKを使用してRoute53の設定を行う方法を示すサンプルプロジェクトです。新規ホストゾーンの作成と様々なタイプのDNSレコードを設定する例を含んでいます。

## 概要

このプロジェクトでは、以下のリソースと設定を AWS CDK を使って定義しています：

- Route53 ホストゾーンの新規作成
- 様々なタイプのDNSレコードの設定：
  - Aレコード（IPアドレス指定）
  - Aレコード（CloudFrontへのエイリアス）
  - Aレコード（ALBへのエイリアス）
  - CNAMEレコード
  - MXレコード
  - TXTレコード（SPF、ドメイン検証など）

## 前提条件

このプロジェクトを使用するためには、以下が必要です：

- AWS アカウント
- Node.js (バージョン 14.x 以上)
- AWS CDK CLI (バージョン 2.x)
- AWS CLI（設定済み）

## インストール方法

```bash
# リポジトリをクローン
git clone <リポジトリURL>
cd aws-cdk-route53

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

> **注意**: 実際にデプロイすると、Route53ホストゾーンが作成され、AWS アカウントに課金が発生する可能性があります。

## 実装例の解説

### 新規ホストゾーンの作成

```typescript
const hostedZone = new route53.HostedZone(this, 'NewHostedZone', {
  zoneName: 'xxxx.com',
});
```

### 既存ホストゾーンの参照（コメントアウト済み）

```typescript
const hostedZone = route53.HostedZone.fromLookup(this, 'ExistingHostedZone', {
  domainName: 'xxxx.com',
});
```

### IPアドレスを指定したAレコード

```typescript
new route53.ARecord(this, 'ARecord', {
  zone: hostedZone,
  recordName: 'www',
  target: route53.RecordTarget.fromIpAddresses('192.0.2.1', '192.0.2.2'),
  ttl: Duration.minutes(5),
  comment: 'Webサーバーへの直接アクセス用レコード',
});
```

### CloudFrontディストリビューションへのAレコード（エイリアス）

```typescript
new route53.ARecord(this, 'CloudFrontAliasRecord', {
  zone: hostedZone,
  recordName: 'cloudfront-staging',
  target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
});
```

### ALBへのAレコード（エイリアス）

```typescript
new route53.ARecord(this, 'ALBAliasRecord', {
  zone: hostedZone,
  recordName: 'staging-elb',
  target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(alb)),
});
```

### CNAMEレコード

```typescript
new route53.CnameRecord(this, 'CnameRecord', {
  zone: hostedZone,
  recordName: 'mail',
  domainName: 'mail-server.example.com.',
  ttl: Duration.hours(1),
});
```

### MXレコード

```typescript
new route53.MxRecord(this, 'MxRecord', {
  zone: hostedZone,
  values: [
    { priority: 10, hostName: 'mail1.example.com.' },
    { priority: 20, hostName: 'mail2.example.com.' },
  ],
  ttl: Duration.hours(4),
});
```

### TXTレコード

```typescript
new route53.TxtRecord(this, 'TxtRecord', {
  zone: hostedZone,
  recordName: '@',
  values: [
    'v=spf1 include:_spf.example.com -all',
    'google-site-verification=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  ],
  ttl: Duration.hours(24),
});
```

## カスタマイズ方法

実際の環境で使用する場合は、以下の点を変更してください：

1. `lib/cdk-route53-stack.ts` の `zoneName` を実際のドメイン名に変更
2. 各レコードの `recordName` と `target` 値を実際の値に変更
3. CloudFront や ALB の設定を実際の環境に合わせて変更

## クリーンアップ

デプロイしたリソースを削除するには：

```bash
npx cdk destroy
```

> **注意**: ホストゾーンを削除する前に、そのゾーンに含まれるすべてのレコードが削除されていることを確認してください。

## 参考リソース

- [AWS CDK ドキュメント](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- [AWS Route53 ドキュメント](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html)
- [AWS CDK API リファレンス - Route53](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-route53-readme.html)

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。
