class Db {
    constructor(config){
        this.fillWithMockData = config.fillWithMockData;
        this.Sequelize = require('sequelize');
        this.mockData = require('./mockData.js');
        this.sequelize = new this.Sequelize(config.name, config.user, config.password, {
            host: config.host,
            dialect: config.dialect
        });
        this.model = new (require('./Model.js'))(this.sequelize, this.Sequelize);
    }

    async fill(){
        //drop db and add filler data
        this.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
        await this.sequelize.drop();
        this.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
        await this.sequelize.sync();

        function getRandom(arr, n) {
            var result = new Array(n),
                len = arr.length,
                taken = new Array(len);
            if (n > len)
                throw new RangeError("getRandom: more elements taken than available");
            while (n--) {
                var x = Math.floor(Math.random() * len);
                result[n] = arr[x in taken ? taken[x] : x];
                taken[x] = --len in taken ? taken[len] : len;
            }
            return result;
        }

        var tags = [];
        var languages = [];

        this.mockData.tags.forEach((tag) => {
            this.model.Tag.create(tag).then((tag) => {
                tags.push(tag);
            });
        });

        this.mockData.languages.forEach((language) => {
            this.model.Language.create(language).then((language) => {
                languages.push(language);
            });
        });

        this.mockData.snippets.forEach((snippet) => {
            this.model.Snippet.create(snippet, {
                include : [
                    {model : this.model.SnippetPart, as: 'parts'}
                ]
            }).then((snippet) => {
                snippet.addTags(getRandom(tags, 3));
                snippet.parts.forEach((part) => {
                    part.setLanguage(getRandom(languages, 1)[0].id);
                });
            });
        });
    }

    async assertDatabaseConnectionOk() {
        console.log(`Checking database connection...`);
        try {
            await this.sequelize.authenticate();
            console.log('Database connection OK!');
        } catch (error) {
            console.log('Unable to connect to the database:');
            console.log(error.message);
            process.exit(1);
        }
    }

    async init() {
        await this.assertDatabaseConnectionOk();

        if(this.fillWithMockData){
            await this.fill();
        }
    }
}
module.exports = Db;
