import os
import json
import base64
import mysql.connector
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv


# Set values from .env as environment variables for local testing
# in AWS Lambda, the same environment variables are defined
# By default, load_dotenv doesn't override existing environment variables.
load_dotenv()

rds_host = os.environ['RDS_HOST']
name = os.environ['RDS_USERNAME']
secret_name = os.environ['SECRET_NAME']
db_name = "messages"


def getConnection():
    print("In getConnection")
    password = "None"
    
    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager'
    )    
    print("Got client session")

    # In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
    # See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    # We rethrow the exception by default.
    
    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
        print("Secret retrieved")
    except ClientError as e:
        print(e)
        if e.response['Error']['Code'] == 'DecryptionFailureException':
            # Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InternalServiceErrorException':
            # An error occurred on the server side.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InvalidParameterException':
            # You provided an invalid value for a parameter.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InvalidRequestException':
            # You provided a parameter value that is not valid for the current state of the resource.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'ResourceNotFoundException':
            # We can't find the resource that you asked for.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
    else:
        # Decrypts secret using the associated KMS CMK.
        # Depending on whether the secret is a string or binary, one of these fields will be populated.
        if 'SecretString' in get_secret_value_response:
            secret = get_secret_value_response['SecretString']
            j = json.loads(secret)
            password = j['password']
        else:
            decoded_binary_secret = base64.b64decode(get_secret_value_response['SecretBinary'])
            print("password binary:" + decoded_binary_secret)
            password = decoded_binary_secret.password    
    
    try:
        conn = mysql.connector.connect(
                host=rds_host, user=name, password=password, database=db_name, connect_timeout=5)
        return conn
            
    except Exception as e:
        print (e)
        print("ERROR: Unexpected error: Could not connect to MySql instance.")
        raise e

def handler(event, context):

    cnx = getConnection()

    result = []
    
    if cnx and cnx.is_connected():
        print("Successfully connected to database-messages")
        print("Event ", event)

        with cnx.cursor() as cursor:
            for rec in event['Records']:
                data = (rec["body"],)

                cursor.execute("INSERT INTO basic_msg (message) VALUES (%s);", data)
        
                cursor.execute("SELECT * FROM basic_msg;")
        
                rows = cursor.fetchall()
        
                for row in rows:
                    print(row)
                    result.append(row)
        
        cnx.commit()
        cnx.close()
    
    else:
    
        print("Could not connect")
    
    return result
