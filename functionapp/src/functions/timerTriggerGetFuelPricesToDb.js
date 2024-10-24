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
            
            // Array to hold fuel prices and stations
            const fuel95Stations = [];
            
            // Extracting the "Keskiarvo" (average price)
            const keskiarvo = $('.tab-pane#fuel-95 h6').text().replace('Keskiarvo', '').trim();
            
            // Scraping the stations table
            $('#fuel-95 table tbody tr').each((i, element) => {
                const station = {
                    number: $(element).find('td.text-center').text().trim(),
                    station: $(element).find('td:nth-child(2)').text().trim(),
                    price: $(element).find('td:nth-child(3)').text().trim(),
                    updated: $(element).find('td:nth-child(4)').text().trim()
                };
                fuel95Stations.push(station);
            });
            
            // Logging the scraped data (you can also insert this into a database)
            // context.log('Stations: ', fuel95Stations);
            // context.log('Keskiarvo (average price): ', keskiarvo);

            let dataToReturn = {
                id: Date.now().toString(),
                keskiarvo,
                stations: fuel95Stations,
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
