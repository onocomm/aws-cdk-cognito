#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkCognitoStack } from '../lib/cdk-cognito-stack';

const app = new cdk.App();

new CdkCognitoStack(app, `CdkCognitoStack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }
});
