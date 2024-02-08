import {REGION, ACCESS_KEY_ID, SECRET_ACCESS_KEY, LAMBDA_NAME} from "./config.js"

const invoke = async (funcName, payload) => {
  //console.log(payload)

  AWS.config.update({
    region: REGION,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  });

  const lambda = new AWS.Lambda({});
  
  var params = {
      FunctionName : funcName,
      InvocationType : 'RequestResponse',
      LogType : 'None',
      Payload : JSON.stringify(payload)
   };

  lambda.invoke(params, function(err, data) {
      if (err || data.StatusCode != 200) {
        console.log(err);
      } else {
        window.alert("Event created");
      }
   });
};



window.createEventUsingLambda = function createEventUsingLambda() {
  const eventName = document.getElementById('eventName').value;
  const eventLocation = document.getElementById('eventLocation').value;
  const startDateTime = document.getElementById('startDateTime').value;
  const endDateTime = document.getElementById('endDateTime').value;
  const userId = document.getElementById('userId').value;

  const eventData = {
    name: eventName,
    location: eventLocation,
    dt_start: startDateTime,
    dt_end: endDateTime,
    user_id: userId,
  };

  // console.log(eventData)

  const payload = {"body" : JSON.stringify(eventData)}

  invoke(LAMBDA_NAME, payload)

}
  