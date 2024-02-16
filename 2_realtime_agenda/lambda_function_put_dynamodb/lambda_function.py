import json
import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = "events_table"

def lambda_handler(request, context):
    
    print(request)
    
    event = json.loads(request["body"])

    user_id = int(event["user_id"])
    name = event["name"]
    location = event["location"]
    dt_start = event["dt_start"]
    dt_end = event["dt_end"]

    dynamodb_resource = boto3.resource('dynamodb')


    table = dynamodb_resource.Table(TABLE_NAME)
    response = table.query(
              Limit = 1,
              ScanIndexForward = False,
              KeyConditionExpression=Key('user_id').eq(user_id) & Key('id').lte(999999)
              # take the highest id
           )
    print (response)

    id = response['Items'][0]["id"] + 1
    

    dynamodb_client = boto3.client('dynamodb')

    response = dynamodb_client.put_item(TableName=TABLE_NAME, Item=
                      {'id':{'N':str(id)},
                       'user_id':{'N':str(user_id)},
                       'name':{'S':name},
                       'location':{'S':location},
                       'dt_start':{'S':dt_start},
                       'dt_end':{'S':dt_end}})
    
    print(response)
    
    return response
