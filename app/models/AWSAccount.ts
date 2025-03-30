import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

export interface AWSAccount {
  account_id: string;
  account_name: string;
  access_key_id: string;
  secret_access_key: string;
  created_at: string;
  last_checked: string;
}

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'aws-monitor-accounts';

export async function saveAccount(account: Omit<AWSAccount, 'created_at' | 'last_checked'>): Promise<AWSAccount> {
  const now = new Date().toISOString();
  const newAccount = {
    ...account,
    created_at: now,
    last_checked: now
  };

  await dynamodb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: newAccount
  }));

  return newAccount;
}

export async function getAccount(accountId: string): Promise<AWSAccount | null> {
  const result = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { account_id: accountId }
  }));

  return result.Item as AWSAccount || null;
}

export async function getAllAccounts(): Promise<AWSAccount[]> {
  const result = await dynamodb.send(new ScanCommand({
    TableName: TABLE_NAME
  }));

  return result.Items as AWSAccount[];
}

export async function updateLastChecked(accountId: string): Promise<void> {
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { account_id: accountId },
    UpdateExpression: 'set last_checked = :now',
    ExpressionAttributeValues: {
      ':now': new Date().toISOString()
    }
  }));
}

export async function deleteAccount(accountId: string): Promise<void> {
  await dynamodb.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { account_id: accountId }
  }));
}
