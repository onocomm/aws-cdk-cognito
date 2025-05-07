import { Stack, StackProps, RemovalPolicy, Duration, CfnOutput } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class CdkCognitoStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const UserPoolName = 'example system';
    const UserPoolClientName = 'example system';
    const IdentityPoolName = 'example system';
    const SESRegion = 'ap-northeast-1';
    const EmailAddress = 'no-reply@example.com';
    const EmailName = 'example system';
    const ConfigurationSetName = 'default';
    const RoleName = 'Cognito_exampleAuth_Role';

    // ユーザープールの作成
    const userPool = new cognito.UserPool(this, 'UserPool', {

      userPoolName: UserPoolName,

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
      
      // メール設定（SESのメールアドレスによる検証が必要※ドメイン名の認証ではNG）
      email: cognito.UserPoolEmail.withSES({
        sesRegion: SESRegion,
        fromEmail: EmailAddress,
        fromName: EmailName,
        configurationSetName: ConfigurationSetName,
      }),

      removalPolicy: RemovalPolicy.DESTROY,
      
    });

    // ユーザープールクライアントの作成
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: UserPoolClientName,
      preventUserExistenceErrors: true, // ユーザー存在エラーの防止を有効化
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
      identityPoolName: IdentityPoolName,
      
      // Cognito認証プロバイダーの設定
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: `cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
        },
      ],
      
      // 未認証アイデンティティの許可
      allowUnauthenticatedIdentities: false,
    });

    // 認証済みロールの作成
    const authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      roleName: RoleName,
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
