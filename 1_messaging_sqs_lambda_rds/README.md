# 1_messaging_sqs_lambda_rds

First project to better grasp AWS concepts like AWS Lambda, roles and permissions.
Resources were deployed using AWS Management Console.

Target process : an event is sent in SQS from Management Console. It triggers the start of a Lambda, which writes some data in a RDS database (mySQL instance).

Lambda code is coming from a container image stored in Elastic Container Registry. The Lambda code written in Python retrieves the database instance secret from Secrets Manager, using AWS SDK boto3.

# Architecture

![Architecture](./img/AWS_project1.png)


# Notes

## About RDS database instance : mySQL schema

Create table basic_msg
```
create DATABASE messages DEFAULT CHARACTER SET 'utf8';
use messages;

CREATE TABLE basic_msg (
no int(11) NOT NULL AUTO_INCREMENT primary key,
message varchar(50) NOT NULL);

INSERT INTO basic_msg (message) VALUES ('test_value');

select * from basic_msg;
```

Remotely connect to database. Allow access : 
- Modify DB instance > Connectivity > Public Access > Publicly accessible
- inbound rule in security group of RDS : TCP 3306 from my IP is allowed
```
mysql -u {username} -p'{password}' \
    -h {RDS instance endpoint} -P 3306 \
    -D messages
```

## Lambda

Lambda security group
- outbound rule to access RDS instance : TCP 3306 to RDS instance security group
- outbound rule to access Secrets Manager : TCP 443 (https) to VPC endpoint security group

### Environment variables

Define these environement variables in Configuration > Environment variables
```
RDS_HOST
RDS_USERNAME
SECRET_NAME
```

### Access Secrets Manager from Lambda

In Python : using boto3 (see code)

For boto3 to connect to Secrets Manager, need to allow connexion to Secrets Manager. This is done using a VPC interface endpoint : 
- create VPC interface endpoint to access Secrets Manager
- VPC SG : inbound rule TCP 443 (https) to accept traffic from lambda
- Lambda SG : outbound rule TCP 443 (https) to accept traffic to VPC endpoint


### Run 1_messaging_sqs_lambda_rds Python code locally
Create .env file containing RDS credentials
```
RDS_HOST=***.amazonaws.com
RDS_USERNAME=***
SECRET_NAME=***
```

Define region and profile credentials (AWS access key)
```
aws configure
```

Create image of lambda_function_rds and start container
```
docker build -t 1_messaging_sqs_lambda_rds .

docker run -v $HOME/.aws:/root/.aws:ro -v ./.env:/var/task --platform linux/amd64 -p 9000:8080 1_messaging_sqs_lambda_rds
```
Docker run command breakdown :
- Create a local endpoint at localhost:9000/2015-03-31/functions/function/invocations.
- Give container access to AWS access keys and region + Give container access to secrets stored in .env (not stored in the image, only accessed by container through read-only volume)

Test it works - send request to local Lambda (Remote access to RDS should be open)
```
curl "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"Records":[{"body":"using lambda locally!"}]}'
```


### Using Elastic Container Registry

Connect to ECR
```
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin {AWS account number}.dkr.ecr.us-east-1.amazonaws.com
```

Tag the image to deploy on Lambda with this syntax. Then push it to ECR
```
docker tag {image id} {AWS account number}.dkr.ecr.us-east-1.amazonaws.com/{ECR repo name}:{tag_name}

docker push {AWS account number}.dkr.ecr.us-east-1.amazonaws.com/{ECR repo name}:{tag_name}
```

In AWS Management Console, in Lambda service, deploy this image.


## Sources

https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-lambda-tutorial.html

https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html

https://aws.amazon.com/blogs/security/how-to-securely-provide-database-credentials-to-lambda-functions-by-using-aws-secrets-manager/

