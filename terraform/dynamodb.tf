# DynamoDB table for storing AWS account configurations
# Note: This requires TTL and continuous backup permissions
resource "aws_dynamodb_table" "aws_accounts" {
  name           = "aws-monitor-accounts"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "account_id"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

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


