output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "task_definition_family" {
  value = data.aws_ecs_task_definition.app.family
}

output "load_balancer_url" {
  value = aws_lb.main.dns_name
  description = "The DNS name of the load balancer"
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
  description = "The IDs of the public subnets"
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
  description = "The ID of the ALB security group"
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
  description = "The ID of the ECS security group"
}
