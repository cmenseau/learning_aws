# 2_realtime_agenda

Second project : exploring additional services and deepening my understanding of AWS by making a realtime updated calendar using DynamoDB, GraphQL websockets (AWS AppSync), Lambda, CloudFormation... For learning purposes, this is an app with several modules because I wanted to explore various services in 1 go. Obviously, it's possible to simplify this app to a webapp with a graphql server.

Resources were mostly deployed using AWS Management Console. Some resources were deployed using CloudFormation for a learning purpose.

Target process :
- a calendar event is created in Create Event webapp
- it triggers a Python Lambda creating the event in DynamoDB database
- DynamoDB streams trigger the execution of a NodeJS Lambda to convey the database changes in AppSync (with a dedicated mutation having Local Resolvers)
- through the GraphQL websocket, the new event is pushed to a second webapp RealTime Calendar

# Architecture

![Architecture](./img/AWS_project2.png)

# Notes

## AppSync

Subscription to get real time updates of new data is supported in AppSync when data is updated through a GraphQL mutation. However, if the underlying data source (in this case : DynamoDB) gets updated, the subscription is not updated natively in AWS AppSync. So it is necessary to put up a special mechanism to propagate the database changes to AppSync.
Therefore a specific mutation with Local Resolvers is required. DynamoDB Streams capture changes in the table, they trigger an AWS Lambda, which invokes this mutation.


### Sources
https://github.com/aws-samples/serverless-patterns/tree/main/dynamodb-streams-appsync-subscription

https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html

