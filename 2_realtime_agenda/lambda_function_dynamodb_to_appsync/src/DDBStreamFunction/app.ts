
import { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda"
import { unmarshall } from "@aws-sdk/util-dynamodb"
import * as crypto from '@aws-crypto/sha256-js'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import { SignatureV4 } from '@aws-sdk/signature-v4'
import { HttpRequest } from '@aws-sdk/protocol-http'

interface MyEvent {
  user_id: number	
  id: number
  dt_end:string
  dt_start:string
  location:string
  name:string
}

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  let messages = []
  await Promise.all(event.Records.map(async (record: DynamoDBRecord) => {
    let payload = unmarshall(record.dynamodb.NewImage)
    messages.push(payload)
    console.log("Event received from DynamoDB",record)
  }))

  await Promise.all(messages.map(message => appsync(message)))
}

const { Sha256 } = crypto
const { APP_SYNC_API, AWS_REGION, API_KEY } = process.env

const query = /* GraphQL */ `
  mutation MyLambdaMutation($dt_end: String, $dt_start: String, $id: Int!, $location: String, $name: String, $user_id: Int!) {
    createEventsTableWithLocalResolver(input: {dt_end: $dt_end, dt_start: $dt_start, id: $id, name: $name, user_id: $user_id, location: $location}) {
      dt_end
      dt_start
      id
      location
      name
      user_id
    }
  }
`
const appsync = async (variables: MyEvent): Promise<void> => {
  const endpoint = new URL(APP_SYNC_API)

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: AWS_REGION,
    service: 'appsync',
    sha256: Sha256
  })

  const requestToBeSigned = new HttpRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      host: endpoint.host
    },
    hostname: endpoint.host,
    body: JSON.stringify({ query, variables }),
    path: endpoint.pathname
  })

  const signed = await signer.sign(requestToBeSigned)
  const request = new Request(APP_SYNC_API, signed)

  console.log("Request sent to App sync ", request)

  await fetch(request)
  .then(response => {
    console.log(response)
  })
}