#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkRoute53Stack } from '../lib/cdk-route53-stack';

const app = new cdk.App();

new CdkRoute53Stack(app, `CdkRoute53Stack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  }
});
