import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as CdkCognito from '../lib/cdk-cognito-stack';

test('Cognito Resources Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CdkCognito.CdkCognitoStack(app, 'MyTestStack', {
    env: { account: '123456789012', region: 'ap-northeast-1' }
  });
  // THEN
  const template = Template.fromStack(stack);

  // ユーザープールが正しく作成されるか検証
  template.resourceCountIs('AWS::Cognito::UserPool', 1);
  template.hasResourceProperties('AWS::Cognito::UserPool', {
    UserPoolName: 'example system',
    AutoVerifiedAttributes: ['email'],
    EmailConfiguration: {
      ConfigurationSet: 'default',
      EmailSendingAccount: 'DEVELOPER',
      From: 'example system <no-reply@example.com>',
      SourceArn: Match.anyValue(),
    },
    MfaConfiguration: 'OFF',
    Policies: {
      PasswordPolicy: {
        MinimumLength: 8,
        RequireLowercase: false,
        RequireNumbers: true,
        RequireSymbols: false,
        RequireUppercase: false,
        TemporaryPasswordValidityDays: 7,
      }
    },
    SelfSignUpEnabled: true,
  });

  // ユーザープールクライアントが正しく作成されるか検証
  template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
  template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
    ClientName: 'example system',
    PreventUserExistenceErrors: 'ENABLED',
    AuthSessionValidity: Match.absent(),
    ExplicitAuthFlows: [
      'ALLOW_USER_SRP_AUTH',
      'ALLOW_ADMIN_USER_PASSWORD_AUTH',
      'ALLOW_CUSTOM_AUTH',
      'ALLOW_REFRESH_TOKEN_AUTH',
    ],
    RefreshTokenValidity: 30,
  });

  // アイデンティティプールが正しく作成されるか検証
  template.resourceCountIs('AWS::Cognito::IdentityPool', 1);
  template.hasResourceProperties('AWS::Cognito::IdentityPool', {
    AllowUnauthenticatedIdentities: false,
    CognitoIdentityProviders: Match.arrayWith([
      {
        ClientId: Match.anyValue(),
        ProviderName: Match.anyValue(),
      }
    ]),
    IdentityPoolName: 'example system',
  });

  // IAMロールが正しく作成されるか検証
  template.resourceCountIs('AWS::IAM::Role', 1);
  template.hasResourceProperties('AWS::IAM::Role', {
    RoleName: 'Cognito_exampleAuth_Role',
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRoleWithWebIdentity',
          Condition: {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud': Match.anyValue(),
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': 'authenticated',
            },
          },
          Effect: 'Allow',
          Principal: {
            Federated: 'cognito-identity.amazonaws.com',
          },
        },
      ],
      Version: '2012-10-17',
    },
    ManagedPolicyArns: [
      {
        'Fn::Join': [
          '',
          [
            'arn:',
            {
              Ref: 'AWS::Partition',
            },
            ':iam::aws:policy/AmazonS3ReadOnlyAccess',
          ],
        ],
      },
    ],
  });

  // アイデンティティプールロール割り当てが正しく作成されるか検証
  template.resourceCountIs('AWS::Cognito::IdentityPoolRoleAttachment', 1);
  template.hasResourceProperties('AWS::Cognito::IdentityPoolRoleAttachment', {
    IdentityPoolId: Match.anyValue(),
    Roles: {
      authenticated: Match.anyValue(),
    },
  });

  // 出力値が正しく設定されているか検証
  template.hasOutput('UserPoolId', {});
  template.hasOutput('UserPoolClientId', {});
  template.hasOutput('IdentityPoolId', {});
});
