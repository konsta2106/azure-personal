const { app, output } = require('@azure/functions');
const axios = require('axios');
const cheerio = require('cheerio');

const cosmosOutput = output.cosmosDB({
    databaseName: process.env["DATABASE_NAME"],
    containerName: process.env["FUEL_CONTAINER_NAME"],
    connection: 'MyAccount_COSMOSDB',
});

app.timer('timerTriggerGetFuelPricesToDb', {
    schedule: '0 0 17 * * *',  // Runs every day at 7 AM UTC
    return: cosmosOutput,
    handler: async (myTimer, context) => {
        context.log('Timer function executed at: ', new Date().toISOString());

        try {
            // Fetching the HTML content of the page
            const { data } = await axios.get('https://www.tankille.fi/tampere/');
            
            // Loading HTML into cheerio for scraping
            const $ = cheerio.load(data);
            
            // Scraping the 10 cheapest stations from the fuel-95 tab
            const prices = [];
            $('#fuel-95 table tbody tr').each((i, element) => {
                const priceText = $(element).find('td:nth-child(3)').text().trim();
                const price = parseFloat(priceText);
                if (!isNaN(price)) {
                    prices.push(price);
                }
            });

            // Calculate keskiarvo (average) from the 10 cheapest stations
            if (prices.length === 0) {
                throw new Error('No fuel-95 prices found on the page');
            }
            const sum = prices.reduce((acc, p) => acc + p, 0);
            const keskiarvo = (sum / prices.length).toFixed(3);
            context.log(`Calculated keskiarvo from ${prices.length} stations: ${keskiarvo}`);

            let dataToReturn = {
                id: Date.now().toString(),
                keskiarvo,
                timestamp: new Date().toISOString()
            }
            context.log('Data to return:', dataToReturn);

            // Return data to be inserted into Cosmos DB
            return dataToReturn;

        } catch (error) {
            context.log('Error fetching data:', error);
        }
    }
});
