const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertStateDbObjectToResponseObject = (stateObject) => {
  return {
    stateId: stateObject.state_id,
    stateName: stateObject.state_name,
    population: stateObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (districtObject) => {
  return {
    districtId: districtObject.district_id,
    districtName: districtObject.district_name,
    stateId: districtObject.state_id,
    cases: districtObject.cases,
    cured: districtObject.cured,
    active: districtObject.active,
    deaths: districtObject.deaths,
  };
};

//API 1: Returns a list of all states in the state table
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
        select * from state;
    `;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertStateDbObjectToResponseObject(eachState)
    )
  );
});

//API 2: Returns a state based on the state ID
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
          select * from state where state_id=${stateId};
    `;
  const state = await db.get(getStateQuery);
  response.send(convertStateDbObjectToResponseObject(state));
});

//API 3: Create a district in the district table, `district_id` is auto-incremented
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
      insert into district(district_name,
    state_id,
    cases,
    cured,
    active,
    deaths)
    values('${districtName}',
    ${stateId},
    ${cases},
   ${cured},
    ${active},
   ${deaths});
    `;
  await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

//API 4: Returns a district based on the district ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
       select * from district where district_id=${districtId};
    `;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

//API 5: Deletes a district from the district table based on the district ID
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
         delete from district where district_id=${districtId};
    `;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//API 6: Updates the details of a specific district based on the district ID
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
  update district set
    district_name='${districtName}',
    state_id=${stateId},
    cases= ${cases},
    cured=${cured},
    active= ${active},
    deaths=${deaths};
    `;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//API 7: Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getTotalScoresQuery = `
           select sum(cases) as totalCases,
           sum(cured) as totalCured,
           sum(active) as totalActive,
           sum(deaths) as totalDeaths
           from district where state_id=${stateId};
     `;
  const stats = await db.get(getTotalScoresQuery);
  response.send(stats);
});

//API 8: Returns an object containing the state name of a district based on the district ID
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
        select state_name from district natural join state where district_id=${districtId};
    `;
  const stateName = await db.get(getStateNameQuery);
  response.send(convertStateDbObjectToResponseObject(stateName));
});

module.exports = app;
