const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient(process.env["MyAccount_COSMOSDB"]);
const container = client
    .database(process.env["DATABASE_NAME"])
    .container(process.env["FUEL_CONTAINER_NAME"]);

app.http('httpTriggerGetFuelPrices', {
    methods: ['GET'],
    authLevel: 'function',
    handler: async (request, context) => {
        try {
            const startDate = request.query.get('start');
            const endDate = request.query.get('end');
            let querySpec;

            if (startDate && endDate) {
                querySpec = {
                    query: "SELECT * FROM c WHERE c.timestamp >= @start AND c.timestamp <= @end",
                    parameters: [
                        { name: "@start", value: startDate },
                        { name: "@end", value: endDate }
                    ]
                };
            } else {
                querySpec = { query: "SELECT * FROM c" };
            }

            const { resources: fuelData } = await container.items.query(querySpec).fetchAll();

            return { status: 200, jsonBody: fuelData.map(item => ({
                id: item.id,
                keskiarvo: item.keskiarvo,
                timestamp: item.timestamp
            })) };

        } catch (err) {
            context.log('Error fetching data:', err);
            return { status: 500, body: 'Internal Server Error' };
        }
    }
});
