# DynamoDB table for storing AWS account configurations
resource "aws_dynamodb_table" "aws_accounts" {
  name           = "aws-monitor-accounts"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "account_id"
  stream_enabled = true

  attribute {
    name = "account_id"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "aws-monitor-accounts"
  }
}

# Add permissions to ECS task role to access DynamoDB
resource "aws_iam_role_policy" "dynamodb_access" {
  name = "dynamodb-access"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.aws_accounts.arn
      }
    ]
  })
}
