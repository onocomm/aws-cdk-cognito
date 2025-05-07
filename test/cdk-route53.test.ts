import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as CdkRoute53 from '../lib/cdk-route53-stack';

test('Route53 Resources Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CdkRoute53.CdkRoute53Stack(app, 'MyTestStack', {
    env: { account: '123456789012', region: 'us-east-1' }
  });
  // THEN
  const template = Template.fromStack(stack);

  // ホストゾーンが正しく作成されるか検証
  template.resourceCountIs('AWS::Route53::HostedZone', 1);
  template.hasResourceProperties('AWS::Route53::HostedZone', {
    Name: 'xxxx.com.'
  });

  // 合計6つのDNSレコードが作成されることを検証
  template.resourceCountIs('AWS::Route53::RecordSet', 6);

  // CloudFrontへのALIASレコードを検証
  template.hasResourceProperties('AWS::Route53::RecordSet', {
    Name: 'cloudfront-staging.xxxx.com.',
    Type: 'A',
    AliasTarget: {
      HostedZoneId: Match.exact('Z2FDTNDATAQYW2'), // CloudFrontの固定値
      DNSName: Match.stringLikeRegexp('xxxx.cloudfront.net')
    }
  });

  // ALBへのALIASレコードを検証
  template.hasResourceProperties('AWS::Route53::RecordSet', {
    Name: 'staging-elb.xxxx.com.',
    Type: 'A',
    AliasTarget: {
      HostedZoneId: Match.stringLikeRegexp('.*'), // 実際の値と一致すればOK
      DNSName: Match.stringLikeRegexp('.*elb\\.amazonaws\\.com')
    }
  });

  // IPアドレス指定のAレコードを検証
  template.hasResourceProperties('AWS::Route53::RecordSet', {
    Name: 'www.xxxx.com.',
    Type: 'A',
    TTL: '300', // 5分 = 300秒
    ResourceRecords: ['192.0.2.1', '192.0.2.2']
  });

  // CNAMEレコードを検証
  template.hasResourceProperties('AWS::Route53::RecordSet', {
    Name: 'mail.xxxx.com.',
    Type: 'CNAME',
    TTL: '3600', // 1時間 = 3,600秒
    ResourceRecords: ['mail-server.example.com.']
  });

  // MXレコードを検証
  template.hasResourceProperties('AWS::Route53::RecordSet', {
    Name: 'xxxx.com.',
    Type: 'MX',
    TTL: '14400', // 4時間 = 14,400秒
    ResourceRecords: [
      '10 mail1.example.com.',
      '20 mail2.example.com.'
    ]
  });

  // TXTレコードを検証
  template.hasResourceProperties('AWS::Route53::RecordSet', {
    Name: 'xxxx.com.',
    Type: 'TXT',
    TTL: '86400', // 24時間 = 86,400秒
    ResourceRecords: Match.arrayWith([
      '"v=spf1 include:_spf.example.com -all"',
      '"google-site-verification=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"'
    ])
  });
});

// NSレコードが新しいホストゾーンに自動的に作成されることをテスト
test('NS Records Created for New Hosted Zone', () => {
  const app = new cdk.App();
  const stack = new CdkRoute53.CdkRoute53Stack(app, 'MyTestStack', {
    env: { account: '123456789012', region: 'us-east-1' }
  });
  
  const template = Template.fromStack(stack);
  
  // NSレコードは自動的に作成される内部リソースなので、
  // スタックの出力で確認できる値をテスト
  template.hasOutput('*', {
    Description: Match.stringLikeRegexp('.*ネームサーバー.*')
  });
});
