const { CosmosClient } = require('@azure/cosmos');

class CosmosDbService {
  constructor() {
    this.client = new CosmosClient(process.env.MyAccount_COSMOSDB);
    this.databaseName = process.env.DATABASE_NAME;
    this.containerName = process.env.CV_CONTAINER_NAME || 'cv-data';
    this.database = null;
    this.container = null;
  }

  async init() {
    try {
      // Get or create database
      const { database } = await this.client.databases.createIfNotExists({
        id: this.databaseName
      });
      this.database = database;

      // Get or create container with partition key strategy
      const { container } = await this.database.containers.createIfNotExists({
        id: this.containerName,
        partitionKey: {
          paths: ['/entityType'],
          kind: 'Hash'
        },
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [
            {
              path: '/*'
            }
          ],
          excludedPaths: [
            {
              path: '/"_etag"/?'
            }
          ]
        }
      });
      this.container = container;

      console.log(`Connected to Cosmos DB container: ${this.containerName}`);
      return true;
    } catch (error) {
      console.error('Error initializing Cosmos DB:', error);
      throw error;
    }
  }

  async createItem(item) {
    if (!this.container) {
      await this.init();
    }

    try {
      const { resource } = await this.container.items.create(item);
      return resource;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  async getItem(id, entityType) {
    if (!this.container) {
      await this.init();
    }

    try {
      const { resource } = await this.container.item(id, entityType).read();
      return resource;
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      console.error('Error getting item:', error);
      throw error;
    }
  }

  async updateItem(id, entityType, item) {
    if (!this.container) {
      await this.init();
    }

    try {
      const { resource } = await this.container.item(id, entityType).replace(item);
      return resource;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  async deleteItem(id, entityType) {
    if (!this.container) {
      await this.init();
    }

    try {
      await this.container.item(id, entityType).delete();
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  async queryItems(entityType, filters = {}) {
    if (!this.container) {
      await this.init();
    }

    try {
      let query = `SELECT * FROM c WHERE c.entityType = @entityType`;
      const parameters = [{ name: '@entityType', value: entityType }];

      // Add additional filters
      Object.keys(filters).forEach((key, index) => {
        const paramName = `@param${index}`;
        query += ` AND c.data.${key} = ${paramName}`;
        parameters.push({ name: paramName, value: filters[key] });
      });

      const { resources } = await this.container.items.query({
        query,
        parameters
      }).fetchAll();

      return resources;
    } catch (error) {
      console.error('Error querying items:', error);
      throw error;
    }
  }

  async getAllEntitiesByOwner(ownerId) {
    if (!this.container) {
      await this.init();
    }

    try {
      const { resources } = await this.container.items.query({
        query: 'SELECT * FROM c WHERE c.ownerId = @ownerId',
        parameters: [{ name: '@ownerId', value: ownerId }]
      }).fetchAll();

      // Group by entity type
      const groupedData = {};
      resources.forEach(item => {
        if (!groupedData[item.entityType]) {
          groupedData[item.entityType] = [];
        }
        groupedData[item.entityType].push(item);
      });

      return groupedData;
    } catch (error) {
      console.error('Error getting all entities:', error);
      throw error;
    }
  }
}

module.exports = CosmosDbService;