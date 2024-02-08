import {APPSYNC_HOST, APPSYNC_GRAPHQL_HOST, APPSYNC_REALTIME_HOST, APPSYNC_API_KEY} from "./config.js"

const HOLIDAYS_API = "https://date.nager.at/api/v3/PublicHolidays/2024/NZ"

const graphqlQuery = `query MyQuery {
  listEventsTables(filter: {dt_start: {beginsWith: "2024"}}) {
    nextToken
    items {
      dt_end
      dt_start
      location
      name
    }
  }
}`;

const graphqlSubscription = `subscription MySubscription {
  onCreateEventsTable {
    user_id
    id
    name
    location
    dt_start
    dt_end
  }
}`

const apiHeader = {
  'host': APPSYNC_HOST,
  'x-api-key': APPSYNC_API_KEY,
};

document.addEventListener('DOMContentLoaded', () => {
  loadContent();
});

async function loadContent() {
  const events = await requestEvents();
  addEvents(events);

  connectToWebsocket();
}

//////////////////////////// CALLING APIS ////////////////////////////


async function requestEvents () {

  // Function to fetch events from the GraphQL server
  async function fetchUserEvents() {
    try {
      const response = await fetch(APPSYNC_GRAPHQL_HOST, {
        method: 'POST',
        headers: apiHeader,
        body: JSON.stringify({ query: graphqlQuery }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched events:', data.data.listEventsTables);
      return data.data.listEventsTables.items;

    } catch (error) {
      console.error('Error fetching events:', error.message);
      return [];
    }
  }

  async function fetchHolidays() {
    try {
      const response = await fetch(HOLIDAYS_API, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched holidays :', data);

      let events = []
      data.forEach((holiday) => {
        const hdate = holiday["date"]
        const name = holiday["name"]
        const location = holiday["counties"]
        events.push({
          "name" : name,
          "location" : location,
          "dt_start" : hdate,
          "dt_end" : hdate,
          "is_full_day" : true
        })
      })

      return events;

    } catch (error) {
      console.error('Error fetching events:', error.message);
      return [];
    }
  }

  let data1 = await fetchUserEvents();
  let data2 = await fetchHolidays();

  return [...data1, ...data2]
}

function connectToWebsocket() {
  // payload should be an empty JSON object
  const payload = {};
  
  const base64_api_header = btoa(JSON.stringify(apiHeader));
  const base64_payload = btoa(JSON.stringify(payload));
  
  const appsync_url = APPSYNC_REALTIME_HOST + '?header=' + base64_api_header + '&payload=' + base64_payload;  

  // Establish WebSocket connection
  const socket = new WebSocket(
    appsync_url,
    ['graphql-ws']);

  // Handle WebSocket events
  socket.addEventListener('open', (event) => {
    console.log('WebSocket connection opened:', event);
    socket.send(
      JSON.stringify({
        type: "connection_init",
      })
    );
  });

  socket.addEventListener("error", (event) => {
    console.log("WebSocket error: ", event);
  });

  socket.addEventListener('message', (event) => {
    console.log('Message from graphql websocket:', event.data)
    const eventData = JSON.parse(event.data);

    switch (eventData.type) {
      case "connection_ack":
        console.log("connection_ack");
        startSubscription(socket);
        break;
      case "start_ack":
        console.log("start_ack");
        break;
      case "error":
        console.error(eventData);
        break;
      case "data":
        console.log(eventData.payload.data.onCreateEventsTable);
        // Handle incoming events and update the calendar
        updateRealTimeCalendar(eventData.payload.data.onCreateEventsTable);
        break;
  }
    
  });

  socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', event);
  });
  

  function startSubscription(websocket) {
    const subscribeMessage = {
      id: window.crypto.randomUUID(),
      type: "start",
      payload: {
        data: JSON.stringify({
          query: graphqlSubscription,
        }),
        extensions: {
          authorization: {
            "x-api-key": APPSYNC_API_KEY,
            'host': APPSYNC_HOST,
          },
        },
      },
    };
    websocket.send(JSON.stringify(subscribeMessage));
  }

}

//////////////////////////// DISPLAYING CALENDAR ////////////////////////////


function updateRealTimeCalendar(event) {
  console.log('Received event:', event);

  const eventList = document.getElementById('calendar');
  eventList.appendChild(createEventDiv(event));
}

function addEvents(events) {
  console.log('Received events:', events);
  events.sort((a, b) => (new Date(a.dt_start) - new Date(b.dt_start)))

  const eventList = document.getElementById('calendar');
  eventList.innerHTML = '';

  // Iterate through the events and add them to the calendar
  events.forEach(evt => {
    eventList.appendChild(createEventDiv(evt))
  });
}

function createEventDiv(evt) {
  const eventDiv = document.createElement('div')
  eventDiv.className = "block rounded-lg bg-white p-2 m-2"
  eventDiv.textContent = eventTextContent(evt)
  return eventDiv
}

function eventTextContent(myEvent) {
  let txt = "";
  if (myEvent.dt_start == myEvent.dt_end) {
    txt = `${formatHumanReadableDate(myEvent.dt_start, myEvent.is_full_day)} : ${myEvent.name}`  
  }
  else {
    txt = `${formatHumanReadableDate(myEvent.dt_start, myEvent.is_full_day)} - ${formatHumanReadableDate(myEvent.dt_end, myEvent.is_full_day)} : ${myEvent.name}`
  }

  if (myEvent.location) {
      txt += ` (${myEvent.location})`
  }
  return txt
}

function formatHumanReadableDate(dateString, is_full_day=false) {
  const date = new Date(dateString);
  let formattedDate;

  if (is_full_day) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit'};
    formattedDate = new Intl.DateTimeFormat('en-UK', options).format(date);

  }
  else{
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'};
    formattedDate = new Intl.DateTimeFormat('en-UK', options).format(date);
  }  
  
  return formattedDate;
}  

