import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export class CdkRoute53Stack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // ✅ 新規にホストゾーンを作成
    const hostedZone = new route53.HostedZone(this, 'NewHostedZone', {
      zoneName: 'xxxx.com',
    });

    /*
    // ✅ 既存のホストゾーンを参照する場合
    const hostedZone = route53.HostedZone.fromLookup(this, 'ExistingHostedZone', {
      domainName: 'xxxx.com',
    });
    */

    // ✅ CloudFrontディストリビューションを参照
    const distribution = cloudfront.Distribution.fromDistributionAttributes(this, 'Distribution', {
      distributionId: 'X3MEXAMPLE1234',
      domainName: 'xxxx.cloudfront.net',
    });

    // ✅ CloudFrontディストリビューションへのALIASレコードを作成
    new route53.ARecord(this, 'CloudFrontAliasRecord', {
      zone: hostedZone,
      recordName: 'cloudfront-staging',
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // ✅ ALBを参照
    const alb = elbv2.ApplicationLoadBalancer.fromApplicationLoadBalancerAttributes(this, 'ALB', {
      loadBalancerArn: 'arn:aws:elasticloadbalancing:ap-northeast-1:1234567890:loadbalancer/app/StagingALB/xxxxxxx',
      securityGroupId: 'sg-xxxxxxx',
      loadBalancerDnsName: 'Staging-xxxx.ap-northeast-1.elb.amazonaws.com',
      loadBalancerCanonicalHostedZoneId: 'XXEXAMPLE1234',
    });

    // ✅ ALBへのALIASレコードを作成
    new route53.ARecord(this, 'ALBAliasRecord', { // IDを明確化
      zone: hostedZone,
      recordName: 'staging-elb', // 新しいレコード名
      target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(alb)),
    });

    // Aレコード - IPアドレスへの直接指定
    new route53.ARecord(this, 'ARecord', {
      zone: hostedZone,
      recordName: 'www',
      target: route53.RecordTarget.fromIpAddresses('192.0.2.1', '192.0.2.2'),
      ttl: Duration.minutes(5), // TTLを設定（オプション）
      comment: 'Webサーバーへの直接アクセス用レコード', // コメント（オプション）
    });

    // CNAMEレコード - 別のドメイン名へのエイリアス
    new route53.CnameRecord(this, 'CnameRecord', {
      zone: hostedZone,
      recordName: 'mail',
      domainName: 'mail-server.example.com.',
      ttl: Duration.hours(1),
    });

    // MXレコード - メールサーバーの指定
    new route53.MxRecord(this, 'MxRecord', {
      zone: hostedZone,
      values: [
        {
          priority: 10,
          hostName: 'mail1.example.com.',
        },
        {
          priority: 20,
          hostName: 'mail2.example.com.',
        },
      ],
      ttl: Duration.hours(4),
    });

    // TXTレコード - ドメイン検証やSPFレコードなど
    new route53.TxtRecord(this, 'TxtRecord', {
      zone: hostedZone,
      recordName: '@', // ドメイン自体
      values: [
        'v=spf1 include:_spf.example.com -all', // SPFレコードの例
        'google-site-verification=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Google検証の例
      ],
      ttl: Duration.hours(24),
    });

  }
}
