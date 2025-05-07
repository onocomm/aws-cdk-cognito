import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class CdkCognitoStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // ユーザープールの作成
    const userPool = new cognito.UserPool(this, 'UserPool', {
      // 自己サインアップの有効化
      selfSignUpEnabled: true,
      
      // ユーザー名属性としてメールを使用
      signInAliases: {
        email: true,
      },
      
      // パスワードポリシー設定
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: false,
        requireUppercase: false,
        requireSymbols: false,
        tempPasswordValidity: Duration.days(7),
      },
      
      // メール設定
      email: cognito.UserPoolEmail.withSES({
        sesRegion: 'ap-northeast-1', // 東京リージョン
        fromEmail: 'no-reply@owner-order.com',
        fromName: 'owner-system',
        configurationSetName: 'default',
      }),
      
      // MFAなし
      mfa: cognito.Mfa.OFF,
      
      // デバイス追跡なし
      deviceTracking: {
        challengeRequiredOnNewDevice: false,
        deviceOnlyRememberedOnUserPrompt: false,
      },
    });

    // ユーザープールクライアントの作成
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      // 認証フローの設定
      authFlows: {
        userSrp: true,                // SRP認証
        adminUserPassword: true,      // 管理者認証
        custom: true,                 // カスタム認証
        userPassword: false,          // パスワード認証（無効）
      },
      refreshTokenValidity: Duration.days(30), // 更新トークンの有効期間
    });

    // アイデンティティプールの作成
    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      // アイデンティティプール名
      identityPoolName: 'MyIdentityPool',
      
      // Cognito認証プロバイダーの設定
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: `cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
        },
      ],
      
      // 未認証アイデンティティの許可（今回は許可しない）
      allowUnauthenticatedIdentities: false,
    });

    // 認証済みロールの作成
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

    // ロールにポリシーをアタッチ（例として基本的なポリシー）
    authenticatedRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess')
    );

    // アイデンティティプールにロールをアタッチ
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });

    // 出力値の設定
    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'User Pool ID',
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'User Pool Client ID',
    });

    new CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Identity Pool ID',
    });
  }
}
