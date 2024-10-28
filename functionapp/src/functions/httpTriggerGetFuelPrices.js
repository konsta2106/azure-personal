const { app, input } = require('@azure/functions');

const cosmosInput = input.cosmosDB({
    databaseName: process.env["DATABASE_NAME"],
    containerName: process.env["FUEL_CONTAINER_NAME"],
    connection: 'MyAccount_COSMOSDB',
});

app.http('httpTriggerGetFuelPrices', {
    methods: ['GET'],
    authLevel: 'function',
    extraInputs: [cosmosInput],
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        const fuelData = context.extraInputs.get(cosmosInput)

        context.log('Fuel data:', fuelData)

        const cleanedData = fuelData.map(doc => {
            const { _rid, _self, _etag, _attachments, _ts, ...cleanedDoc } = doc;
            return cleanedDoc;
        });

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            jsonBody: cleanedData
        };
    }
});
